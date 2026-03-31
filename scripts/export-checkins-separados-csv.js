require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { closeMongoDBConnection, connectToMongoDB } = require('../src/config/mongodb');
const {
  getCheckinsCollection,
  getQuestionSessionCheckinsCollection,
  getDissertativeAnswersCollection,
  getUsersCollection,
} = require('../src/config/collections');
const { getDiretoriaByRegional } = require('../src/services/diretoria');

const REPORTS_DIR = path.resolve(__dirname, '..', 'reports');

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function escapeCsvField(value) {
  const text = String(value == null ? '' : value);
  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvLine(fields) {
  return fields.map(escapeCsvField).join(';');
}

function writeCsv(filename, lines) {
  const filePath = path.join(REPORTS_DIR, filename);
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf8');
  console.log(`  -> ${filePath} (${lines.length - 1} linhas)`);
}

function getUserFields(user) {
  const regional = (user.regional || user.regiao || '').trim();
  const filial = (user.filial || user.loja || '').trim();
  const diretoria = getDiretoriaByRegional(regional) || (user.diretoria || '').trim();
  return { regional, filial, diretoria };
}

// ---------- Estandes ----------

async function exportEstandeCheckins() {
  console.log('\n=== ESTANDES ===');
  const collection = await getCheckinsCollection();

  const checkins = await collection.aggregate([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'estandes', localField: 'estandeId', foreignField: '_id', as: 'estande' } },
    { $unwind: { path: '$estande', preserveNullAndEmptyArrays: true } },
    { $sort: { checkinEm: 1 } },
  ]).toArray();

  console.log(`  Total de check-ins em estandes: ${checkins.length}`);

  // --- Detectar duplicados ---
  const seen = new Map();
  const duplicados = [];

  for (const checkin of checkins) {
    const key = `${String(checkin.userId)}_${String(checkin.estandeId)}`;
    if (seen.has(key)) {
      duplicados.push(checkin);
      // marca o primeiro também, se ainda não marcou
      const first = seen.get(key);
      if (first) {
        duplicados.push(first);
        seen.set(key, null); // null = já adicionado
      }
    } else {
      seen.set(key, checkin);
    }
  }

  // --- CSV principal ---
  const headers = ['ESTANDE', 'NOME', 'ID_MAGALU', 'CPF', 'CARGO', 'FILIAL', 'REGIONAL', 'DIRETORIA', 'PONTOS', 'TEMPO', 'CHECKIN_EM'];
  const lines = [buildCsvLine(headers)];

  for (const checkin of checkins) {
    const user = checkin.user || {};
    const estande = checkin.estande || {};
    const { regional, filial, diretoria } = getUserFields(user);

    lines.push(buildCsvLine([
      estande.nome || '',
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      checkin.pontos || 0,
      checkin.tempo || 0,
      formatDate(checkin.checkinEm),
    ]));
  }

  writeCsv('checkins-estandes.csv', lines);

  // --- CSV duplicados ---
  if (duplicados.length > 0) {
    console.log(`  ⚠ ${duplicados.length} check-ins DUPLICADOS encontrados!`);
    const dupHeaders = ['ESTANDE', 'NOME', 'ID_MAGALU', 'PONTOS', 'CHECKIN_EM', 'CHECKIN_ID', 'USER_ID', 'ESTANDE_ID'];
    const dupLines = [buildCsvLine(dupHeaders)];

    // Ordenar duplicados por userId + estandeId pra facilitar leitura
    duplicados.sort((a, b) => {
      const keyA = `${String(a.userId)}_${String(a.estandeId)}`;
      const keyB = `${String(b.userId)}_${String(b.estandeId)}`;
      return keyA.localeCompare(keyB);
    });

    for (const checkin of duplicados) {
      const user = checkin.user || {};
      const estande = checkin.estande || {};
      dupLines.push(buildCsvLine([
        estande.nome || '',
        user.nome || '',
        user.id_magalu || '',
        checkin.pontos || 0,
        formatDate(checkin.checkinEm),
        String(checkin._id),
        String(checkin.userId),
        String(checkin.estandeId),
      ]));
    }

    writeCsv('checkins-estandes-DUPLICADOS.csv', dupLines);
  } else {
    console.log('  ✓ Nenhum check-in duplicado em estandes');
  }
}

// ---------- Pontualidade ----------

async function exportSessionCheckins() {
  console.log('\n=== PONTUALIDADE (Sessões) ===');
  const collection = await getQuestionSessionCheckinsCollection();

  const checkins = await collection.aggregate([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'question_sessions', localField: 'sessionId', foreignField: '_id', as: 'session' } },
    { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
    { $sort: { checkinEm: 1 } },
  ]).toArray();

  console.log(`  Total de check-ins de pontualidade: ${checkins.length}`);

  const headers = ['NOME', 'ID_MAGALU', 'CPF', 'CARGO', 'FILIAL', 'REGIONAL', 'DIRETORIA', 'TURMA', 'PALCO', 'SESSAO', 'PONTOS', 'SESSAO_INICIO', 'CHECKIN_EM', 'TEMPO_MIN', 'PONTUALIDADE'];
  const lines = [buildCsvLine(headers)];

  for (const checkin of checkins) {
    const user = checkin.user || {};
    const session = checkin.session || {};
    const { regional, filial, diretoria } = getUserFields(user);

    let elapsedMin = null;
    let pontualidade = '';
    if (session.startedAt && checkin.checkinEm) {
      elapsedMin = Math.round((new Date(checkin.checkinEm) - new Date(session.startedAt)) / 60000);
      if (elapsedMin <= 5) pontualidade = 'Pontual';
      else if (elapsedMin <= 15) pontualidade = 'Moderado';
      else pontualidade = 'Atrasado';
    }

    lines.push(buildCsvLine([
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      user.turma || '',
      checkin.palestraLabel || checkin.palestraId || '',
      session.label || '',
      checkin.pontos || 0,
      formatDate(session.startedAt),
      formatDate(checkin.checkinEm),
      elapsedMin != null ? elapsedMin : '',
      pontualidade,
    ]));
  }

  writeCsv('checkins-pontualidade.csv', lines);
}

// ---------- Dissertativas ----------

async function exportDissertativeCheckins() {
  console.log('\n=== DISSERTATIVAS ===');
  const collection = await getDissertativeAnswersCollection();

  const submissions = await collection.aggregate([
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $sort: { createdAt: 1 } },
  ]).toArray();

  console.log(`  Total de submissões dissertativas: ${submissions.length}`);

  const headers = ['NOME', 'ID_MAGALU', 'CPF', 'CARGO', 'FILIAL', 'REGIONAL', 'DIRETORIA', 'RESP_LUIZA', 'RESP_FRED', 'RESP_PALESTRA', 'TOTAL_RESPOSTAS', 'PONTOS', 'COMPLETA', 'CRIADO_EM', 'CONCLUIDO_EM'];
  const lines = [buildCsvLine(headers)];

  for (const sub of submissions) {
    const user = sub.user || {};
    const { regional, filial, diretoria } = getUserFields(user);
    const answers = Array.isArray(sub.answers) ? sub.answers : [];
    const luiza = answers.find((a) => a.questionKey === 'luiza');
    const fred = answers.find((a) => a.questionKey === 'fred');
    const palestra = answers.find((a) => a.questionKey === 'palestra');

    lines.push(buildCsvLine([
      sub.authorName || user.nome || '',
      sub.authorIdMagalu || user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      luiza ? 'Sim' : 'Não',
      fred ? 'Sim' : 'Não',
      palestra ? 'Sim' : 'Não',
      [luiza, fred, palestra].filter(Boolean).length,
      sub.pontos || 0,
      sub.isComplete ? 'Sim' : 'Não',
      formatDate(sub.createdAt),
      formatDate(sub.completedAt),
    ]));
  }

  writeCsv('checkins-dissertativas.csv', lines);
}

// ---------- Resumo por Usuário ----------

function pct(value, max) {
  if (!max) return '0%';
  return (value / max * 100).toFixed(1) + '%';
}

async function exportResumoUsuarios() {
  console.log('\n=== RESUMO POR USUÁRIO ===');
  const db = await connectToMongoDB();
  const usersCollection = await getUsersCollection();
  const checkinsCollection = await getCheckinsCollection();
  const sessionCheckinsCollection = await getQuestionSessionCheckinsCollection();
  const dissertativeCollection = await getDissertativeAnswersCollection();

  // Descobrir máximos possíveis
  const estandesCol = db.collection('estandes');
  const maxEstandes = await estandesCol.countDocuments({});
  const sessionsCol = db.collection('question_sessions');
  const maxSessions = await sessionsCol.countDocuments({ startedAt: { $ne: null } });
  const maxDissertativas = 3; // luiza, fred, palestra
  const maxPtsEstandes = maxEstandes * 5;   // até 5 pts por estande
  const maxPtsSessions = maxSessions * 5;   // 5 pts por sessão
  const maxPtsDissertativas = maxDissertativas * 20; // 20 pts por pergunta

  const maxCheckins = maxEstandes + maxSessions + maxDissertativas;
  const maxPontos = maxPtsEstandes + maxPtsSessions + maxPtsDissertativas;

  console.log(`  Máximos: ${maxEstandes} estandes | ${maxSessions} sessões | ${maxDissertativas} dissertativas`);
  console.log(`  Máximos pts: ${maxPtsEstandes} estandes | ${maxPtsSessions} sessões | ${maxPtsDissertativas} dissertativas | ${maxPontos} total`);

  const users = await usersCollection.find({}).sort({ nome: 1 }).toArray();
  console.log(`  Total de usuários: ${users.length}`);

  // Pré-carregar tudo para performance
  const allCheckins = await checkinsCollection.find({}).toArray();
  const allSessionCheckins = await sessionCheckinsCollection.find({}).toArray();
  const allDissertatives = await dissertativeCollection.find({}).toArray();

  // Indexar por userId
  const checkinsByUser = new Map();
  for (const c of allCheckins) {
    const key = String(c.userId);
    if (!checkinsByUser.has(key)) checkinsByUser.set(key, []);
    checkinsByUser.get(key).push(c);
  }

  const sessionByUser = new Map();
  for (const c of allSessionCheckins) {
    const key = String(c.userId);
    if (!sessionByUser.has(key)) sessionByUser.set(key, []);
    sessionByUser.get(key).push(c);
  }

  const dissertativeByUser = new Map();
  for (const d of allDissertatives) {
    const key = String(d.userId);
    if (!dissertativeByUser.has(key)) dissertativeByUser.set(key, []);
    dissertativeByUser.get(key).push(d);
  }

  const headers = [
    'NOME', 'ID_MAGALU', 'CPF', 'CARGO', 'FILIAL', 'REGIONAL', 'DIRETORIA',
    'QTD_ESTANDES', 'MAX_ESTANDES', '%_ESTANDES', 'PTS_ESTANDES',
    'QTD_SESSOES', 'MAX_SESSOES', '%_SESSOES', 'PTS_SESSOES',
    'QTD_DISSERTATIVAS', 'MAX_DISSERTATIVAS', '%_DISSERTATIVAS', 'PTS_DISSERTATIVAS',
    'TOTAL_CHECKINS', 'MAX_CHECKINS', '%_CHECKINS',
    'TOTAL_PONTOS', 'MAX_PONTOS', '%_PONTOS',
  ];
  const lines = [buildCsvLine(headers)];

  for (const user of users) {
    const uid = String(user._id);
    const { regional, filial, diretoria } = getUserFields(user);

    const estandes = checkinsByUser.get(uid) || [];
    const sessions = sessionByUser.get(uid) || [];
    const dissertativas = dissertativeByUser.get(uid) || [];

    const ptsEstandes = estandes.reduce((s, c) => s + (c.pontos || 0), 0);
    const ptsSessions = sessions.reduce((s, c) => s + (c.pontos || 0), 0);

    // Contar respostas individuais (não docs)
    let qtdRespostas = 0;
    for (const d of dissertativas) {
      qtdRespostas += Array.isArray(d.answers) ? d.answers.length : 0;
    }
    const ptsDissertativas = dissertativas.reduce((s, d) => s + (d.pontos || 0), 0);

    const totalCheckins = estandes.length + sessions.length + qtdRespostas;
    const totalPontos = ptsEstandes + ptsSessions + ptsDissertativas;

    lines.push(buildCsvLine([
      user.nome || '',
      user.id_magalu || '',
      user.cpf || '',
      user.cargo || '',
      filial,
      regional,
      diretoria,
      estandes.length,
      maxEstandes,
      pct(estandes.length, maxEstandes),
      ptsEstandes,
      sessions.length,
      maxSessions,
      pct(sessions.length, maxSessions),
      ptsSessions,
      qtdRespostas,
      maxDissertativas,
      pct(qtdRespostas, maxDissertativas),
      ptsDissertativas,
      totalCheckins,
      maxCheckins,
      pct(totalCheckins, maxCheckins),
      totalPontos,
      maxPontos,
      pct(totalPontos, maxPontos),
    ]));
  }

  writeCsv('checkins-resumo-usuario.csv', lines);
}

// ---------- Main ----------

async function main() {
  try {
    console.log('Exportando check-ins separados por tipo...');

    await exportEstandeCheckins();
    await exportSessionCheckins();
    await exportDissertativeCheckins();
    await exportResumoUsuarios();

    console.log('\n✓ Todos os relatórios gerados com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();
