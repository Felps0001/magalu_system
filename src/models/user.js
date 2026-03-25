const { getDiretoriaByRegional } = require('../services/diretoria');

function getNormalizedRegional(user = {}) {
  if (typeof user.regional === 'string' && user.regional.trim()) {
    return user.regional.trim();
  }

  if (typeof user.regiao === 'string') {
    return user.regiao.trim();
  }

  return '';
}

function getNormalizedFilial(user = {}) {
  if (typeof user.filial === 'string' && user.filial.trim()) {
    return user.filial.trim();
  }

  if (typeof user.loja === 'string') {
    return user.loja.trim();
  }

  return '';
}

function getNormalizedDiretoria(user = {}) {
  const mappedDiretoria = getDiretoriaByRegional(getNormalizedRegional(user));

  if (mappedDiretoria) {
    return mappedDiretoria;
  }

  if (typeof user.diretoria === 'string') {
    return user.diretoria.trim();
  }

  return '';
}

function normalizeUserLegacyFields(user = {}) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const { regiao, loja, ...normalizedUser } = user;

  return {
    ...normalizedUser,
    regional: getNormalizedRegional(user),
    diretoria: getNormalizedDiretoria(user),
    filial: getNormalizedFilial(user),
  };
}

function normalizeOptionalString(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function createUser({
  nome,
  id_magalu,
  cpf,
  regional,
  regiao,
  filial,
  loja,
  cargo,
  kitExtra,
  kitExtraRetirada,
}) {
  const normalizedRegional = getNormalizedRegional({ regional, regiao });
  const normalizedFilial = getNormalizedFilial({ filial, loja });

  return {
    nome: normalizeOptionalString(nome),
    id_magalu: normalizeOptionalString(id_magalu),
    cpf: normalizeOptionalString(cpf),
    regional: normalizedRegional,
    diretoria: getNormalizedDiretoria({ regional: normalizedRegional }),
    filial: normalizedFilial,
    cargo: normalizeOptionalString(cargo),
    firstAccessCompleted: false,
    kit: false, // campo kit default false
    kitExtra: Boolean(kitExtra),
    kitExtraRetirada: Boolean(kitExtra) && Boolean(kitExtraRetirada),
  };
}

function buildUserQrData(user, generatedAt = new Date().toISOString()) {
  if (!user || !user.id_magalu) {
    throw new Error('Nao foi possivel montar o payload do QR Code sem id_magalu.');
  }

  const normalizedUser = normalizeUserLegacyFields(user);

  return {
    type: 'magalu-user',
    version: 1,
    generatedAt,
    path: '/perfil/',
    user: {
      userId: normalizedUser._id ? String(normalizedUser._id) : '',
      id_magalu: normalizedUser.id_magalu,
      nome: normalizedUser.nome || '',
      cpf: normalizedUser.cpf || '',
      regional: normalizedUser.regional,
      diretoria: normalizedUser.diretoria || '',
      filial: normalizedUser.filial,
      cargo: normalizedUser.cargo || '',
      kit: typeof normalizedUser.kit === 'boolean' ? normalizedUser.kit : false,
      kitExtra: typeof normalizedUser.kitExtra === 'boolean' ? normalizedUser.kitExtra : false,
      kitExtraRetirada: typeof normalizedUser.kitExtraRetirada === 'boolean' ? normalizedUser.kitExtraRetirada : false,
    },
  };
}

function createUserQrPayload(user, generatedAt) {
  return JSON.stringify(buildUserQrData(user, generatedAt));
}

module.exports = {
  buildUserQrData,
  createUser,
  createUserQrPayload,
  getNormalizedFilial,
  getNormalizedDiretoria,
  getNormalizedRegional,
  normalizeUserLegacyFields,
};
