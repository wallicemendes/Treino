import {normalizeCardioActivities} from './cardio-utils.mjs';

function selectFields(record, fields) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw Error('Histórico inválido. Nenhum arquivo foi gerado.');
  }
  const selected = {};
  for (const field of fields) {
    if (!Object.hasOwn(record, field)) continue;
    const value = record[field];
    if (value !== null && typeof value !== 'string' && typeof value !== 'boolean' &&
        !(typeof value === 'number' && Number.isFinite(value))) {
      throw Error('Histórico inválido. Nenhum arquivo foi gerado.');
    }
    selected[field] = value;
  }
  return selected;
}

export function buildHistoryExport(data) {
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.weights)) {
    throw Error('Histórico inválido. Nenhum arquivo foi gerado.');
  }
  const workouts = data.workouts.map(workout => {
    const selected = selectFields(workout, ['date', 'day', 'cardio', 'notes', 'planVersion']);
    if (!Array.isArray(workout.exercises)) {
      throw Error('Histórico inválido. Nenhum arquivo foi gerado.');
    }
    selected.exercises = workout.exercises.map(exercise =>
      selectFields(exercise, ['name', 'sets', 'target', 'done', 'load', 'reps', 'biset']));
    selected.cardioActivities = normalizeCardioActivities(workout).map(activity =>
      selectFields(activity, ['type', 'minutes', 'speed', 'incline', 'distance', 'calories', 'legacy']));
    return selected;
  });
  const weights = data.weights.map(weight => selectFields(weight, ['date', 'value']));
  return {
    schemaVersion: 2,
    application: 'Meu Treino',
    exportedAt: new Date().toISOString(),
    source: 'Firestore: histórico da conta autenticada, documento principal',
    units: {load: 'kg por exercício, não por lado', cardio: 'minutos', speed: 'km/h', incline: '%', distance: 'km', calories: 'kcal', weight: 'kg'},
    fieldGuide: {
      day: 'Identificador do treino A, B, C, D ou E',
      planVersion: 'Versão opcional da ficha; ausente em registros antigos',
      biset: 'Par opcional dentro da sessão; cada exercício mantém sua própria carga e repetições',
      sets: 'Séries planejadas',
      target: 'Repetições ou duração planejadas',
      done: 'Indica se o exercício foi realizado',
      load: 'Carga registrada; string vazia significa não informada',
      reps: 'Repetições realizadas, texto original por série; pode incluir duração',
      cardioActivities: 'Atividades de cardio normalizadas; registros antigos aparecem como Cardio (registro legado)',
      distance: 'Distância opcional de cada atividade de cardio, informada pelo usuário; ausente significa não informada',
      calories: 'Calorias opcionais de cada atividade de cardio, informadas pelo usuário; não são calculadas pelo aplicativo',
      weights: 'Peso corporal: date é a data local registrada e value é o peso em kg',
      notes: 'Observações escritas pelo usuário; podem conter informações pessoais'
    },
    workouts,
    weights
  };
}

export function downloadHistoryExport(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = `meu-treino-chatgpt-${payload.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}
