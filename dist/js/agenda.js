const STORAGE_KEY = 'magalu_system_user';

const agendaGroups = document.getElementById('agenda-groups');
const logoutButton = document.getElementById('logout-button');
const agendaUserName = document.getElementById('agenda-user-name');
const agendaUserRole = document.getElementById('agenda-user-role');

function redirectToLogin() {
  window.location.replace(new URL('../login/', window.location.href));
}

function createUserCard(user) {
  const card = document.createElement('article');
  card.className = 'agenda-user-card';

  const title = document.createElement('h3');
  title.textContent = user.nome || 'Usuario sem nome';

  const meta = document.createElement('p');
  meta.className = 'muted';
  meta.textContent = [user.cargo, user.loja, user.regiao].filter(Boolean).join(' · ') || 'Sem detalhes';

  card.appendChild(title);
  card.appendChild(meta);

  return card;
}

function createGroupSection(turma, users) {
  const section = document.createElement('section');
  section.className = 'detail-card agenda-group-card';

  const header = document.createElement('div');
  header.className = 'agenda-group-header';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = turma;

  const title = document.createElement('h2');
  title.className = 'agenda-group-title';
  title.textContent = `${users.length} participante${users.length === 1 ? '' : 's'}`;

  header.appendChild(eyebrow);
  header.appendChild(title);

  const list = document.createElement('div');
  list.className = 'agenda-user-list';

  if (!users.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum usuario nesta turma.';
    list.appendChild(empty);
  } else {
    users.forEach((user) => {
      list.appendChild(createUserCard(user));
    });
  }

  section.appendChild(header);
  section.appendChild(list);

  return section;
}

function renderAgenda(agenda) {
  agendaGroups.innerHTML = '';

  const preferredOrder = ['Turma A', 'Turma B', 'Turma C', 'Sem turma'];
  const agendaEntries = Object.entries(agenda).sort(([left], [right]) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, 'pt-BR');
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });

  agendaEntries.forEach(([turma, users]) => {
    agendaGroups.appendChild(createGroupSection(turma, users));
  });
}

async function loadAgenda() {
  agendaUserName.textContent = 'Carregando agenda...';

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/users/agenda'),
      window.magaluApi.withApiDefaults()
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Nao foi possivel carregar a agenda.');
    }

    renderAgenda(data);
    agendaUserName.textContent = 'Agenda carregada';
    agendaUserRole.textContent = 'Os participantes foram organizados automaticamente pela turma cadastrada no MongoDB.';
  } catch (error) {
    agendaUserName.textContent = 'Falha ao carregar agenda';
    agendaUserRole.textContent = error.message;
  }
}

const rawUser = localStorage.getItem(STORAGE_KEY);

if (!rawUser) {
  redirectToLogin();
} else {
  loadAgenda();
}

logoutButton.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  redirectToLogin();
});