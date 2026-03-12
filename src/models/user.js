function createUser({
  nome,
  id_magalu,
  cpf,
  regiao,
  loja,
  cargo,
  turma,
  transfer,
}) {
  if (!id_magalu) {
    throw new Error('O campo id_magalu e obrigatorio.');
  }

  return {
    nome,
    id_magalu,
    cpf,
    regiao,
    loja,
    cargo,
    turma,
    transfer: Boolean(transfer),
    kit: false, // campo kit default false
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
    user: {
      userId: user._id ? String(user._id) : '',
      id_magalu: user.id_magalu,
      nome: user.nome || '',
      cpf: user.cpf || '',
      regiao: user.regiao || '',
      loja: user.loja || '',
      cargo: user.cargo || '',
      turma: user.turma || '',
      transfer: Boolean(user.transfer),
      kit: typeof user.kit === 'boolean' ? user.kit : false,
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
