require('dotenv').config();

const { closeMongoDBConnection } = require('../src/config/mongodb');
const { getEstandesCollection } = require('../src/config/collections');

const ESTANDES = [
  { nome: 'JBL' },
  { nome: 'ASUS' },
  { nome: 'Acer' },
  { nome: 'Aiwa' },
  { nome: 'AOC (estande Philips | AOC)' },
  { nome: 'Apple' },
  { nome: 'Araplac' },
  { nome: 'Atlas | Dako' },
  { nome: 'BenCorp' },
  { nome: 'GA.MA Italy' },
  { nome: 'Brinox' },
  { nome: 'Brinquedos Bandeirante' },
  { nome: 'Britânia (estande Britânia | Philco)', aliases: ['Britania (estande Britania | Philco)'] },
  { nome: 'Caemmun' },
  { nome: 'Candide' },
  { nome: 'BNP Paribas Cardif' },
  { nome: 'Colli' },
  { nome: 'Colormaq' },
  { nome: 'Consórcio Magalu', aliases: ['Consorcio Magalu'] },
  { nome: 'Coop Luiza' },
  { nome: 'DELL Technologies' },
  { nome: 'Demóbile', aliases: ['Demobile'] },
  { nome: 'DJ Móveis', aliases: ['DJ Moveis'] },
  { nome: 'Cosco Kids' },
  { nome: 'Electrolux' },
  { nome: 'Época Cosméticos', aliases: ['Epoca Cosmeticos'] },
  { nome: 'Epson' },
  { nome: 'Esmaltec' },
  { nome: 'Estante Virtual' },
  { nome: 'Gazin' },
  { nome: 'Goodyear' },
  { nome: 'Gree' },
  { nome: 'HP' },
  { nome: 'Nesher' },
  { nome: 'Cozinhas Itatiaia' },
  { nome: 'Jovi' },
  { nome: 'KaBuM!' },
  { nome: 'LEGO' },
  { nome: 'Lenovo' },
  { nome: 'Lev' },
  { nome: 'LG' },
  { nome: 'Luizacred' },
  { nome: 'Luizzi' },
  { nome: 'Magalu Marketplace' },
  { nome: 'Master Comfort' },
  { nome: 'Matrix' },
  { nome: 'Mattel' },
  { nome: 'Mondial' },
  { nome: 'Motorola' },
  { nome: 'Netshoes' },
  { nome: 'SharkNinja' },
  { nome: 'Starlink' },
  { nome: 'OPPO' },
  { nome: 'Oster / Cadence' },
  { nome: 'Oxford' },
  { nome: 'Philco (estande Britânia | Philco)', aliases: ['Philco (estande Britania | Philco)'] },
  { nome: 'Philips' },
  { nome: 'Philips (estande Philips | AOC)' },
  { nome: 'Philips Walita' },
  { nome: 'Plumatex' },
  { nome: 'Porto Serviço', aliases: ['Porto Servico'] },
  { nome: 'Positivo' },
  { nome: 'Samsung' },
  { nome: 'Somopar' },
  { nome: 'Midea' },
  { nome: 'TCL / Semp' },
  { nome: 'Tramontina' },
  { nome: '3 Corações', aliases: ['3 Coracoes'] },
  { nome: 'Umaflex' },
  { nome: 'Wap' },
  { nome: 'Brastemp (estande Brastemp | Consul)' },
  { nome: 'Consul (estande Brastemp | Consul)' },
  { nome: 'BRTEST+' },
  { nome: 'Mercado Magalu' },
];

function normalizeName(name) {
  return String(name || '').trim();
}

async function importEstandes() {
  const estandesCollection = await getEstandesCollection();
  const entries = ESTANDES.map((item) => ({
    nome: normalizeName(item.nome),
    aliases: Array.isArray(item.aliases) ? item.aliases.map(normalizeName).filter(Boolean) : [],
  })).filter((item) => item.nome);

  let createdCount = 0;
  let existingCount = 0;
  let renamedCount = 0;

  for (const entry of entries) {
    const candidateNames = [...new Set([entry.nome, ...entry.aliases])];
    const existing = await estandesCollection.findOne({ nome: { $in: candidateNames } });

    if (!existing) {
      await estandesCollection.insertOne({ nome: entry.nome });
      createdCount += 1;
      continue;
    }

    if (existing.nome !== entry.nome) {
      await estandesCollection.updateOne(
        { _id: existing._id },
        { $set: { nome: entry.nome } }
      );
      renamedCount += 1;
    } else {
      existingCount += 1;
    }
  }

  console.log(`Estandes processados: ${entries.length}`);
  console.log(`Criados: ${createdCount}`);
  console.log(`Ja existentes: ${existingCount}`);
  console.log(`Renomeados: ${renamedCount}`);
}

async function main() {
  try {
    await importEstandes();
  } catch (error) {
    console.error('Erro ao importar estandes:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongoDBConnection();
  }
}

main();