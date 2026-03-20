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

function normalizeUserLegacyFields(user = {}) {
  if (!user || typeof user !== 'object') {
    return user;
  }

  const { regiao, loja, ...normalizedUser } = user;

  return {
    ...normalizedUser,
    regional: getNormalizedRegional(user),
    filial: getNormalizedFilial(user),
  };
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
  if (!id_magalu) {
    throw new Error('O campo id_magalu e obrigatorio.');
  }

  const normalizedRegional = getNormalizedRegional({ regional, regiao });
  const normalizedFilial = getNormalizedFilial({ filial, loja });

  return {
    nome,
    id_magalu,
    cpf,
    regional: normalizedRegional,
    filial: normalizedFilial,
    cargo,
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
  getNormalizedRegional,
  normalizeUserLegacyFields,
};
