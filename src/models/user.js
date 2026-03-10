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
  };
}

module.exports = { createUser };
