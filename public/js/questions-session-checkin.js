const sessionCheckinTitle = document.getElementById('session-checkin-title');
const sessionCheckinCopy = document.getElementById('session-checkin-copy');
const sessionCheckinStatus = document.getElementById('session-checkin-status');
const sessionCheckinSummary = document.getElementById('session-checkin-summary');
const sessionCheckinPoints = document.getElementById('session-checkin-points');
const sessionCheckinButton = document.getElementById('session-checkin-button');

const currentSessionCheckinUser = window.magaluApi.readStoredUser();
const sessionCheckinParams = new URLSearchParams(window.location.search);
const sessionAttendanceToken = typeof sessionCheckinParams.get('token') === 'string'
  ? sessionCheckinParams.get('token').trim()
  : '';

let currentAttendanceState = null;

function setSessionCheckinStatus(message, type) {
  sessionCheckinStatus.textContent = message;
  sessionCheckinStatus.className = `form-message ${type}`;
}

function formatSessionCheckinDateTime(value) {
  if (!value) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function refreshStoredUser() {
  if (!currentSessionCheckinUser || !currentSessionCheckinUser._id) {
    return;
  }

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/users/${encodeURIComponent(currentSessionCheckinUser._id)}`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (response.ok && data) {
      window.magaluApi.storeUser(data);
    }
  } catch (error) {
    // Mantem o fluxo principal de check-in mesmo sem refresh do usuario.
  }
}

function renderAttendanceState(attendanceState) {
  currentAttendanceState = attendanceState;
  const session = attendanceState && attendanceState.session;

  if (!session) {
    sessionCheckinTitle.textContent = 'QR indisponivel';
    sessionCheckinCopy.textContent = 'Este QR nao esta mais ativo.';
    sessionCheckinSummary.textContent = 'Peça ao moderador para abrir um novo QR da sessao atual.';
    sessionCheckinButton.disabled = true;
    return;
  }

  sessionCheckinTitle.textContent = `${session.palestraLabel} · ${session.label}`;
  sessionCheckinCopy.textContent = 'Confirme abaixo para registrar sua presenca nesta sessao.';
  sessionCheckinSummary.textContent = `${session.palestraLabel} · ${session.label} iniciada em ${formatSessionCheckinDateTime(session.startedAt)}.`;
  sessionCheckinPoints.textContent = `+${session.attendancePoints} pontos por presenca`;
  sessionCheckinButton.disabled = Boolean(attendanceState.alreadyCheckedIn);
  sessionCheckinButton.textContent = attendanceState.alreadyCheckedIn ? 'Presenca ja registrada' : 'Confirmar presenca';
}

async function loadAttendanceState() {
  if (!sessionAttendanceToken) {
    setSessionCheckinStatus('O token do check-in de presenca nao foi informado.', 'error');
    sessionCheckinButton.disabled = true;
    return;
  }

  if (!currentSessionCheckinUser || !currentSessionCheckinUser._id) {
    setSessionCheckinStatus('Faca login no app antes de registrar sua presenca.', 'error');
    sessionCheckinSummary.textContent = 'Acesse sua conta e escaneie novamente o QR do palco.';
    sessionCheckinButton.disabled = true;
    return;
  }

  setSessionCheckinStatus('Validando QR...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl(`/api/questions/sessions/attendance?token=${encodeURIComponent(sessionAttendanceToken)}&userId=${encodeURIComponent(currentSessionCheckinUser._id)}`),
      window.magaluApi.withApiDefaults({ method: 'GET' })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel validar este QR.');
    }

    renderAttendanceState(data);
    setSessionCheckinStatus(data.alreadyCheckedIn ? 'Sua presenca ja tinha sido registrada.' : 'QR validado. Confirme seu check-in.', data.alreadyCheckedIn ? 'success' : 'info-message');
  } catch (error) {
    renderAttendanceState(null);
    setSessionCheckinStatus(error.message, 'error');
  }
}

async function registerAttendance() {
  if (!currentAttendanceState || !currentAttendanceState.session || !currentSessionCheckinUser || !currentSessionCheckinUser._id) {
    return;
  }

  sessionCheckinButton.disabled = true;
  setSessionCheckinStatus('Registrando sua presenca...', 'info-message');

  try {
    const response = await fetch(
      window.magaluApi.buildApiUrl('/api/questions/sessions/attendance'),
      window.magaluApi.withApiDefaults({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: sessionAttendanceToken,
          userId: currentSessionCheckinUser._id,
        }),
      })
    );
    const data = await window.magaluApi.parseApiResponse(response);

    if (!response.ok) {
      throw new Error(data && data.error ? data.error : 'Nao foi possivel registrar sua presenca.');
    }

    await refreshStoredUser();
    sessionCheckinButton.textContent = 'Presenca registrada';
    sessionCheckinSummary.textContent = `${data.palestraLabel} · ${data.sessionLabel} · presenca registrada em ${formatSessionCheckinDateTime(data.checkinEm)}.`;
    setSessionCheckinStatus(`Presenca confirmada com sucesso. ${data.pontos} pontos adicionados.`, 'success');
  } catch (error) {
    sessionCheckinButton.disabled = false;
    setSessionCheckinStatus(error.message, 'error');
  }
}

loadAttendanceState();

sessionCheckinButton.addEventListener('click', () => {
  registerAttendance();
});