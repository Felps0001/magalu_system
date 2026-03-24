function normalizeHotelKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const HOTEL_ADDRESS_BY_KEY = new Map([
  ['NOVOTEL', 'Av. Zaki Narchi, 500 - Vila Guilherme, Sao Paulo - SP, 02029-000'],
  ['NOVOTEL CENTER NORTE', 'Av. Zaki Narchi, 500 - Vila Guilherme, Sao Paulo - SP, 02029-000'],
  ['HOLIDAY INN', 'R. Prof. Milton Rodrigues, 100 - Parque Anhembi, Sao Paulo - SP, 02009-040'],
  ['HOLIDAY INN ANHEMBI', 'R. Prof. Milton Rodrigues, 100 - Parque Anhembi, Sao Paulo - SP, 02009-040'],
  ['INTERCITY', 'R. Marambaia, 357 - Casa Verde, Sao Paulo - SP, 02513-000'],
  ['INTERCITY ANHEMBI', 'R. Marambaia, 357 - Casa Verde, Sao Paulo - SP, 02513-000'],
  ['NACIONAL INN', 'R. Martins Fontes, 71 - Consolacao, Sao Paulo - SP, 01050-000'],
  ['NACIONAL INN JARAGUA SAO PAULO', 'R. Martins Fontes, 71 - Consolacao, Sao Paulo - SP, 01050-000'],
  ['BOURBON', 'Av. Marques de S. Vicente, 77 - Varzea da Barra Funda, Sao Paulo - SP, 01139-001'],
  ['RIO HOTEL BY BOURBON SAO PAULO', 'Av. Marques de S. Vicente, 77 - Varzea da Barra Funda, Sao Paulo - SP, 01139-001'],
]);

function getCanonicalHotelAddress(nomeHotel, fallbackAddress = '') {
  const normalizedHotelKey = normalizeHotelKey(nomeHotel);

  if (!normalizedHotelKey) {
    return String(fallbackAddress || '').trim();
  }

  return HOTEL_ADDRESS_BY_KEY.get(normalizedHotelKey) || String(fallbackAddress || '').trim();
}

module.exports = {
  getCanonicalHotelAddress,
  normalizeHotelKey,
};