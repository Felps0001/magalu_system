const firstAccessForm = document.getElementById('first-access-form');
const firstAccessSubmit = document.getElementById('first-access-submit');
const firstAccessMessage = document.getElementById('first-access-message');
const logoutButton = document.getElementById('logout-button');
const profileNome = document.getElementById('profile-nome');
const profileCargo = document.getElementById('profile-cargo');
const profileRegiao = document.getElementById('profile-regiao');
const profileCidade = document.getElementById('profile-cidade');
const profileLoja = document.getElementById('profile-loja');
const profileIdMagalu = document.getElementById('profile-id-magalu');
const profileCpf = document.getElementById('profile-cpf');

function redirectToLogin() {
  window.location.replace(window.magaluApi.buildAppUrl('/'));
}

function redirectToDashboard() {
  window.location.replace(window.magaluApi.buildAppUrl('/teste/'));
}

function setFirstAccessMessage(message, type = '') {
  firstAccessMessage.textContent = message;
  firstAccessMessage.className = `form-message first-access-mobile-message ${type}`.trim();
}

function populateForm(user) {
  profileNome.value = user.nome || '';
  profileCargo.value = user.cargo || '';
  profileRegiao.value = user.regiao || '';
  profileCidade.value = user.cidade || '';
  profileLoja.value = user.loja || '';
  profileIdMagalu.value = user.id_magalu || '';
  profileCpf.textContent = user.cpf || '-';
}

function getPayload() {
  return {
    nome: profileNome.value,
    cargo: profileCargo.value,
    regiao: profileRegiao.value,
    cidade: profileCidade.value,
    loja: profileLoja.value,
  };
}

const currentUser = window.magaluApi.readStoredUser();

if (!currentUser) {
  redirectToLogin();
} else if (!window.magaluApi.requiresFirstAccess(currentUser)) {
  redirectToDashboard();
} else {
  populateForm(currentUser);
}

firstAccessForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!currentUser || !currentUser._id) {
    redirectToLogin();
    return;
  }

  firstAccessSubmit.disabled = true;
  firstAccessSubmit.setAttribute('aria-busy', 'true');
  setFirstAccessMessage('', '');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(currentUser._id)}/profile`),
      window.magaluApi.withApiDefaults({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getPayload()),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data.error || 'Nao foi possivel salvar seus dados.');
    }

    window.magaluApi.storeUser(data);
    setFirstAccessMessage('Cadastro atualizado com sucesso. Redirecionando...', 'success');

    window.setTimeout(() => {
      redirectToDashboard();
    }, 500);
  } catch (error) {
    setFirstAccessMessage(error.message, 'error');
  } finally {
    firstAccessSubmit.disabled = false;
    firstAccessSubmit.removeAttribute('aria-busy');
  }
});

logoutButton.addEventListener('click', () => {
  window.magaluApi.clearStoredUser();
  redirectToLogin();
});