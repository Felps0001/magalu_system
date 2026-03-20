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

  return {
    nome,
    id_magalu,
    cpf,
    regional: regional || regiao || '',
    filial: filial || loja || '',
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

  return {
    type: 'magalu-user',
    version: 1,
    generatedAt,
    path: '/perfil/',
    user: {
      userId: user._id ? String(user._id) : '',
      id_magalu: user.id_magalu,
      nome: user.nome || '',
      cpf: user.cpf || '',
      regional: user.regional || user.regiao || '',
      filial: user.filial || user.loja || '',
      cargo: user.cargo || '',
      kit: typeof user.kit === 'boolean' ? user.kit : false,
      kitExtra: typeof user.kitExtra === 'boolean' ? user.kitExtra : false,
      kitExtraRetirada: typeof user.kitExtraRetirada === 'boolean' ? user.kitExtraRetirada : false,
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
};
