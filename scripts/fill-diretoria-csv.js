const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.resolve(__dirname, '..', 'retirada-kit-magalu.csv');
const OUTPUT_FILE = path.resolve(__dirname, '..', 'reports', 'retirada-kit-magalu-com-diretoria.csv');

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/^SP-\s*/, '')
    .replace(/\s+/g, ' ');
}

const REGIONAL_TO_DIRETORIA = {
  ARACAJU: 'N_NE',
  'BELEM DO PARA': 'N_NE',
  BELEM: 'N_NE',
  FORTALEZA: 'N_NE',
  'JOAO PESSOA': 'N_NE',
  MACEIO: 'N_NE',
  MARABA: 'N_NE',
  NATAL: 'N_NE',
  PETROLINA: 'N_NE',
  RECIFE: 'N_NE',
  SALVADOR: 'N_NE',
  'SAO LUIS': 'N_NE',
  'SAO LUIZ': 'N_NE',
  TERESINA: 'N_NE',
  NONECO: 'N_NE',
  'NORDESTE': 'N_NE',
  'NORTE': 'N_NE',
  'NORTE NORDESTE': 'N_NE',
  'NORDESTE, NORTE E CENTRO OESTE': 'N_NE',

  BAURU: 'SP_RJ',
  CAMPINAS: 'SP_RJ',
  'CAPITAL RIO': 'SP_RJ',
  'GRANDE RIO': 'SP_RJ',
  'RIBEIRAO PRETO': 'SP_RJ',
  'RIO PRETO': 'SP_RJ',
  'ABC LITORAL': 'SP_RJ',
  'ABC-LITORAL': 'SP_RJ',
  'OESTE SUL': 'SP_RJ',
  'ZONA LESTE': 'SP_RJ',
  VALE: 'SP_RJ',
  'SAO PAULO': 'SP_RJ',
  'SAO PAULO (ESTADO), BRASIL': 'SP_RJ',
  SP: 'SP_RJ',
  SP1: 'SP_RJ',
  SP2: 'SP_RJ',
  'GRANDE SP': 'SP_RJ',
  'DIVISIONAL SP': 'SP_RJ',
  RIO: 'SP_RJ',
  RJ: 'SP_RJ',
  JUNDIAI: 'SP_RJ',
  LIMEIRA: 'SP_RJ',
  LOUVEIRA: 'SP_RJ',

  'BARRA BONITA': 'VIRTUAL',
  BATATAIS: 'VIRTUAL',
  'CAMPO BOM': 'VIRTUAL',
  COSMOPOLIS: 'VIRTUAL',
  IBIPORA: 'VIRTUAL',
  OLIMPIA: 'VIRTUAL',
  'SAO LOURENCO': 'VIRTUAL',
  VIRTUAL: 'VIRTUAL',
  UBIRATA: 'VIRTUAL',

  CAXIAS: 'SUL',
  'CAXIAS DO SUL': 'SUL',
  CHAPECO: 'SUL',
  CURITIBA: 'SUL',
  FLORIANOPOLIS: 'SUL',
  'FOZ IGUACU': 'SUL',
  LONDRINA: 'SUL',
  'PORTO ALEGRE': 'SUL',
  MARINGA: 'SUL',
  PARANA: 'SUL',
  RS: 'SUL',
  SUL: 'SUL',
  'SUL E SUDESTE': 'SUL',
  'SUL/SUDESTE': 'SUL',
  'ITAJAI -SC': 'SUL',

  'BELO HORIZONTE': 'MG/CO',
  BRASILIA: 'MG/CO',
  'CAMPO GRANDE': 'MG/CO',
  CUIABA: 'MG/CO',
  'JUIZ DE FORA': 'MG/CO',
  UBERLANDIA: 'MG/CO',
  MG: 'MG/CO',
  GO: 'MG/CO',
  ES: 'MG/CO',
  'CENTO OESTE': 'MG/CO',
};

function getDiretoria(regional, existingDiretoria) {
  if (existingDiretoria && existingDiretoria.trim()) {
    return existingDiretoria.trim();
  }

  const key = normalize(regional);
  return REGIONAL_TO_DIRETORIA[key] || '';
}

function splitCsvLine(line, delimiter = ';') {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function escapeCsvField(value) {
  const text = String(value == null ? '' : value);

  if (text.includes(';') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

const content = fs.readFileSync(INPUT_FILE, 'utf8').replace(/^\uFEFF/, '');
const lines = content.split(/\r?\n/);

const headerLine = lines[0];
const headers = splitCsvLine(headerLine);
const regionalIndex = headers.findIndex((h) => h.trim().toLowerCase() === 'regional');
const diretoriaIndex = headers.findIndex((h) => h.trim().toLowerCase() === 'diretoria');

if (regionalIndex === -1 || diretoriaIndex === -1) {
  console.error('Colunas "regional" ou "diretoria" nao encontradas no CSV.');
  process.exit(1);
}

const outputLines = [headerLine];
let filled = 0;
let notMapped = 0;
const unmapped = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];

  if (!line.trim()) {
    continue;
  }

  const fields = splitCsvLine(line);
  const regional = fields[regionalIndex] || '';
  const existing = fields[diretoriaIndex] || '';
  const diretoria = getDiretoria(regional, existing);

  if (diretoria && !existing.trim()) {
    filled++;
  }

  if (!diretoria && regional.trim()) {
    notMapped++;
    unmapped.add(regional.trim());
  }

  fields[diretoriaIndex] = escapeCsvField(diretoria);
  outputLines.push(fields.join(';'));
}

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, '\uFEFF' + outputLines.join('\n'), 'utf8');

console.log(`CSV gerado: ${OUTPUT_FILE}`);
console.log(`Diretorias preenchidas: ${filled}`);
console.log(`Regionais sem mapeamento: ${notMapped}`);

if (unmapped.size > 0) {
  console.log('\nRegionais nao mapeadas:');
  [...unmapped].sort().forEach((r) => console.log(`  - ${r}`));
}
