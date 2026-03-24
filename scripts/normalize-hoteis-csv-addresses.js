const fs = require('fs');
const path = require('path');

const { parseCsvFile, toCsvValue } = require('./import-logistica-csv-utils');
const { getCanonicalHotelAddress } = require('./hotel-addresses');

function splitCsvLine(line, delimiter = ';') {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];

      if (insideQuotes && nextChar === '"') {
        current += '"';
        index += 1;
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
  return values.map((value) => value.trim());
}

function normalizeHeader(header) {
  return String(header || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseArgs(argv) {
  const files = argv
    .filter((argument) => argument.startsWith('--file='))
    .map((argument) => path.resolve(process.cwd(), argument.slice('--file='.length)));

  if (files.length === 0) {
    throw new Error('Informe ao menos um --file=/caminho/do/arquivo.csv');
  }

  return { files };
}

function normalizeCsvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo CSV nao encontrado: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error(`Arquivo CSV vazio: ${filePath}`);
  }

  const rawHeaders = splitCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const rows = parseCsvFile(content);
  let changedCount = 0;

  const outputLines = [rawHeaders.map((header) => toCsvValue(header)).join(';')];

  rows.forEach((row) => {
    const currentAddress = row.ENDERECOHOTEL || row.ENDERECO_HOTEL || row.ENDERECO || row.HOTEL_ENDERECO || row.LOCALIZACAO || row.ENDERECO_DO_HOTEL || '';
    const normalizedAddress = getCanonicalHotelAddress(
      row.NOMEHOTEL || row.NOME_HOTEL || row.HOTEL || row.NOME_DO_HOTEL || row.HOSPEDAGEM || '',
      currentAddress
    );

    if (normalizedAddress && normalizedAddress !== currentAddress) {
      changedCount += 1;

      if (Object.prototype.hasOwnProperty.call(row, 'ENDERECOHOTEL')) {
        row.ENDERECOHOTEL = normalizedAddress;
      }

      if (Object.prototype.hasOwnProperty.call(row, 'ENDERECO_HOTEL')) {
        row.ENDERECO_HOTEL = normalizedAddress;
      }

      if (Object.prototype.hasOwnProperty.call(row, 'ENDERECO')) {
        row.ENDERECO = normalizedAddress;
      }

      if (Object.prototype.hasOwnProperty.call(row, 'HOTEL_ENDERECO')) {
        row.HOTEL_ENDERECO = normalizedAddress;
      }

      if (Object.prototype.hasOwnProperty.call(row, 'LOCALIZACAO')) {
        row.LOCALIZACAO = normalizedAddress;
      }

      if (Object.prototype.hasOwnProperty.call(row, 'ENDERECO_DO_HOTEL')) {
        row.ENDERECO_DO_HOTEL = normalizedAddress;
      }
    }

    outputLines.push(
      normalizedHeaders
        .map((header) => toCsvValue(row[header] || ''))
        .join(';')
    );
  });

  fs.writeFileSync(filePath, `${outputLines.join('\n')}\n`, 'utf8');
  return changedCount;
}

try {
  const options = parseArgs(process.argv.slice(2));

  options.files.forEach((filePath) => {
    const changedCount = normalizeCsvFile(filePath);
    console.log(`${path.relative(process.cwd(), filePath)}: ${changedCount} linha(s) atualizada(s).`);
  });
} catch (error) {
  console.error('Falha ao normalizar enderecos de hoteis:', error.message);
  process.exitCode = 1;
}