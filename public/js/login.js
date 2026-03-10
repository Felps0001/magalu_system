const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginMessage = document.getElementById('login-message');
const loginInput = document.getElementById('id_magalu');

const STORAGE_KEY = 'magalu_system_user';

const existingSession = localStorage.getItem(STORAGE_KEY);

if (existingSession) {
  window.location.replace('/teste');
}

function setMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `form-message ${type}`;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const idMagalu = loginInput.value.trim();

  if (!idMagalu) {
    setMessage('Informe o ID Magalu para entrar.', 'error');
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = 'Entrando...';
  setMessage('', '');

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ id_magalu: idMagalu }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Nao foi possivel efetuar o login.');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
    setMessage('Login efetuado. Redirecionando...', 'success');

    window.setTimeout(() => {
      window.location.href = '/teste';
    }, 400);
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Entrar';
  }
});