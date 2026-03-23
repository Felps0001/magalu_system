window.magaluQuestions = {
  palestraLabels: {
    'palco-1': 'Palco 1',
    'palco-2': 'Palco 2',
    'palco-3': 'Palco 3',
    'palco-4': 'Palco 4',
    'palco-5': 'Palco 5',
  },
  palestraOrder: ['palco-1', 'palco-2', 'palco-3', 'palco-4', 'palco-5'],
  stageRouteSlugs: {
    'palco-1': 'palco-1',
    'palco-2': 'palco-2',
    'palco-3': 'palco-3',
    'palco-4': 'palco-4',
    'palco-5': 'palco-5',
  },
  legacyStageAliases: {
    'palestra-1': 'palco-1',
    'palestra-2': 'palco-2',
    'palestra-3': 'palco-3',
  },
  routeStageMap: {
    'palco-1': 'palco-1',
    'palco-2': 'palco-2',
    'palco-3': 'palco-3',
    'palco-4': 'palco-4',
    'palco-5': 'palco-5',
    'perguntas-palco-1': 'palco-1',
    'perguntas-palco-2': 'palco-2',
    'perguntas-palco-3': 'palco-3',
    'perguntas-palco-4': 'palco-4',
    'perguntas-palco-5': 'palco-5',
    'questions-palco-1': 'palco-1',
    'questions-palco-2': 'palco-2',
    'questions-palco-3': 'palco-3',
    'questions-palco-4': 'palco-4',
    'questions-palco-5': 'palco-5',
    'perguntas-palestra-1': 'palco-1',
    'perguntas-palestra-2': 'palco-2',
    'perguntas-palestra-3': 'palco-3',
    'questions-palestra-1': 'palco-1',
    'questions-palestra-2': 'palco-2',
    'questions-palestra-3': 'palco-3',
  },
  statusLabels: {
    reprovada: 'Reprovada',
    pendente: 'Pendente',
    aprovada: 'Aprovada',
  },
  statusOrder: ['reprovada', 'pendente', 'aprovada'],
};

window.magaluQuestions.normalizeStageId = function normalizeStageId(value) {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (window.magaluQuestions.palestraLabels[normalizedValue]) {
    return normalizedValue;
  }

  return window.magaluQuestions.legacyStageAliases[normalizedValue] || null;
};

window.magaluQuestions.resolveStageIdFromPath = function resolveStageIdFromPath(pathname) {
  const segments = String(pathname || '').split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';

  return window.magaluQuestions.routeStageMap[lastSegment] || null;
};