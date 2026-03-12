const STORAGE_KEY = 'magalu_system_user';

const turmaSections = Array.from(document.querySelectorAll('[data-turma]'));
const logoutButton = document.getElementById('logout-button');
const agendaUserName = document.getElementById('agenda-user-name');
const agendaUserRole = document.getElementById('agenda-user-role');

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function normalizeTurma(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .trim()
    .toUpperCase()
    .replace(/^TURMA\s+/, '');
}

function setSectionVisibility(section, visible) {
  section.hidden = !visible;
  section.style.display = visible ? 'grid' : 'none';
}

function readStoredUser() {
  const rawUser = localStorage.getItem(STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    return null;
  }
}

function renderAgendaForTurma(turma) {
  const turmaNormalizada = normalizeTurma(turma);
  let encontrouTurma = false;

  turmaSections.forEach((section) => {
    const turmaDaSection = normalizeTurma(section.dataset.turma);
    const deveMostrar = turmaDaSection === turmaNormalizada;

    setSectionVisibility(section, deveMostrar);

    if (deveMostrar) {
      encontrouTurma = true;
    }
  });

  if (!turmaNormalizada) {
    agendaUserName.textContent = 'Turma nao encontrada';
    agendaUserRole.textContent = 'Seu cadastro nao possui turma definida para liberar uma agenda especifica.';
    return;
  }

  if (!encontrouTurma) {
    agendaUserName.textContent = 'Agenda indisponivel';
    agendaUserRole.textContent = `Nenhuma agenda foi configurada para ${turma}.`;
    return;
  }

  agendaUserName.textContent = `Agenda liberada para ${turma}`;
  agendaUserRole.textContent = 'A agenda geral aparece para todos, e abaixo voce visualiza apenas os compromissos da sua turma.';
}

const user = readStoredUser();

if (!user) {
  redirectToLogin();
} else {
  renderAgendaForTurma(user.turma || user.Turma || '');
}

logoutButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  redirectToLogin();
});