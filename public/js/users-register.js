const usersRegisterForm = document.getElementById('users-register-form');
const usersRegisterSubmitButton = document.getElementById('users-register-submit');
const usersRegisterMessage = document.getElementById('users-register-message');
const usersRegisterResult = document.getElementById('users-register-result');

function getTrimmedFieldValue(fieldName) {
  const field = usersRegisterForm.elements[fieldName];

  if (!field || typeof field.value !== 'string') {
    return '';
  }

  return field.value.trim();
}

function buildUsersRegisterPayload() {
  return {
    nome: getTrimmedFieldValue('nome'),
    id_magalu: getTrimmedFieldValue('id_magalu'),
    cpf: getTrimmedFieldValue('cpf'),
    cargo: getTrimmedFieldValue('cargo'),
    regional: getTrimmedFieldValue('regional'),
    filial: getTrimmedFieldValue('filial'),
  };
}

function setUsersRegisterFeedback(message, isError = false) {
  usersRegisterMessage.textContent = message;
  usersRegisterMessage.style.color = isError ? '#b42318' : '#0d2142';
}

async function submitUsersRegisterForm(event) {
  event.preventDefault();

  const payload = buildUsersRegisterPayload();

  usersRegisterSubmitButton.disabled = true;
  setUsersRegisterFeedback('Salvando cadastro...');
  usersRegisterResult.hidden = true;
  usersRegisterResult.textContent = '';

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/users'),
      window.magaluApi.withApiDefaults({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      const errorMessage = data && typeof data.error === 'string'
        ? data.error
        : 'Nao foi possivel cadastrar o user.';

      throw new Error(errorMessage);
    }

    setUsersRegisterFeedback('User cadastrado com sucesso.');
    usersRegisterResult.hidden = false;
    usersRegisterResult.textContent = JSON.stringify(data, null, 2);
    usersRegisterForm.reset();
  } catch (error) {
    setUsersRegisterFeedback(error.message || 'Nao foi possivel cadastrar o user.', true);
  } finally {
    usersRegisterSubmitButton.disabled = false;
  }
}

usersRegisterForm.addEventListener('submit', submitUsersRegisterForm);