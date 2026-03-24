function normalizeRegionalKey(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const REGIONAL_TO_DIRETORIA = new Map([
  ['ARACAJU', 'N_NE'],
  ['BELEM DO PARA', 'N_NE'],
  ['FORTALEZA', 'N_NE'],
  ['JOAO PESSOA', 'N_NE'],
  ['MACEIO', 'N_NE'],
  ['MARABA', 'N_NE'],
  ['NATAL', 'N_NE'],
  ['PETROLINA', 'N_NE'],
  ['RECIFE', 'N_NE'],
  ['SALVADOR', 'N_NE'],
  ['SAO LUIS', 'N_NE'],
  ['TERESINA', 'N_NE'],
  ['BAURU', 'SP_RJ'],
  ['CAMPINAS', 'SP_RJ'],
  ['CAPITAL RIO', 'SP_RJ'],
  ['GRANDE RIO', 'SP_RJ'],
  ['RIBEIRAO PRETO', 'SP_RJ'],
  ['RIO PRETO', 'SP_RJ'],
  ['ABC LITORAL', 'SP_RJ'],
  ['OESTE SUL', 'SP_RJ'],
  ['ZONA LESTE', 'SP_RJ'],
  ['VALE', 'SP_RJ'],
  ['BARRA BONITA', 'VIRTUAL'],
  ['BATATAIS', 'VIRTUAL'],
  ['CAMPO BOM', 'VIRTUAL'],
  ['COSMOPOLIS', 'VIRTUAL'],
  ['IBIPORA', 'VIRTUAL'],
  ['OLIMPIA', 'VIRTUAL'],
  ['SAO LOURENCO', 'VIRTUAL'],
  ['CAXIAS', 'SUL'],
  ['CHAPECO', 'SUL'],
  ['CURITIBA', 'SUL'],
  ['FLORIANOPOLIS', 'SUL'],
  ['LONDRINA', 'SUL'],
  ['PORTO ALEGRE', 'SUL'],
  ['BELO HORIZONTE', 'MG/CO'],
  ['BRASILIA', 'MG/CO'],
  ['CAMPO GRANDE', 'MG/CO'],
  ['CUIABA', 'MG/CO'],
  ['JUIZ DE FORA', 'MG/CO'],
  ['UBERLANDIA', 'MG/CO'],
]);

function getDiretoriaByRegional(regional = '') {
  const normalizedRegional = normalizeRegionalKey(regional);

  if (!normalizedRegional) {
    return '';
  }

  return REGIONAL_TO_DIRETORIA.get(normalizedRegional) || '';
}

module.exports = {
  getDiretoriaByRegional,
  normalizeRegionalKey,
};