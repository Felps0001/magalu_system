const STORAGE_KEY = 'magalu_system_user';

const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const userIdMagalu = document.getElementById('user-id-magalu');
const userPontos = document.getElementById('user-pontos');
const userTempo = document.getElementById('user-tempo');
const userCheckins = document.getElementById('user-checkins');
const userCpf = document.getElementById('user-cpf');
const userRegiao = document.getElementById('user-regiao');
const userLoja = document.getElementById('user-loja');
const userTurma = document.getElementById('user-turma');
const userTransfer = document.getElementById('user-transfer');
const estandesList = document.getElementById('estandes-list');
const logoutButton = document.getElementById('logout-button');

function redirectToLogin() {
  window.location.replace('/login');
}

function renderVisitedStands(estandesVisitados) {
  estandesList.innerHTML = '';

  if (!Array.isArray(estandesVisitados) || estandesVisitados.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'Nenhum estande visitado ainda.';
    estandesList.appendChild(emptyItem);
    return;
  }

  estandesVisitados.forEach((estande) => {
    const item = document.createElement('li');
    item.textContent = estande.nome || 'Estande sem nome';
    estandesList.appendChild(item);
  });
}

const rawUser = localStorage.getItem(STORAGE_KEY);

if (!rawUser) {
  redirectToLogin();
} else {
  const user = JSON.parse(rawUser);

  userName.textContent = user.nome || 'Usuario';
  userRole.textContent = `${user.cargo || 'Sem cargo'} · ${user.loja || 'Sem loja'}`;
  userIdMagalu.textContent = user.id_magalu || '-';
  userPontos.textContent = String(user.pontos || 0);
  userTempo.textContent = String(user.tempo || 0);
  userCheckins.textContent = String(user.totalCheckins || 0);
  userCpf.textContent = user.cpf || '-';
  userRegiao.textContent = user.regiao || '-';
  userLoja.textContent = user.loja || '-';
  userTurma.textContent = user.turma || '-';
  userTransfer.textContent = user.transfer ? 'Sim' : 'Nao';
  renderVisitedStands(user.estandesVisitados);
}

logoutButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  redirectToLogin();
});