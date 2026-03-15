const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');
const loginInput = document.getElementById('id_magalu');

const existingSession = window.magaluApi.readStoredUser();

if (existingSession) {
  window.location.replace(window.magaluApi.getAuthenticatedHomeUrl(existingSession));
}

function setMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `form-message ${type}`;
}

function setLoginButtonState({ disabled, label, busy = false }) {
  loginButton.disabled = disabled;

  if (busy) {
    loginButton.setAttribute('aria-busy', 'true');
  } else {
    loginButton.removeAttribute('aria-busy');
  }

  const labelElement = loginButton.querySelector('.auth-mobile-primary-label');

  if (labelElement) {
    labelElement.textContent = label;
  } else {
    loginButton.textContent = label;
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idMagalu = loginInput.value.trim();

  if (!idMagalu) {
    setMessage('Informe o ID Magalu para entrar.', 'error');
    return;
  }

  setLoginButtonState({ disabled: true, label: 'Entrando...', busy: true });
  setMessage('', '');

  try {
    const response = await fetch(window.magaluApi.buildApiUrl('/api/auth/login'), window.magaluApi.withApiDefaults({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_magalu: idMagalu }),
    }));

    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data.error || 'Nao foi possivel efetuar o login.');
    }

    window.magaluApi.storeUser(data.user);
    setMessage('Login efetuado. Redirecionando...', 'success');

    window.setTimeout(() => {
      window.location.href = window.magaluApi.getAuthenticatedHomeUrl(data.user);
    }, 400);
  } catch (error) {
    setMessage(error.message, 'error');
    setLoginButtonState({ disabled: false, label: 'Acessar', busy: false });
  }
});