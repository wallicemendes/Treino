import {normalizeCardioActivities} from './cardio-utils.mjs';

export const SHORTCUT_NAME = 'Meu Treino Saúde';
export const HEALTH_ACTIVITY_TYPES = ['Musculação', 'Caminhada', 'Corrida', 'Ciclismo', 'Escada', 'Outro'];

export function healthActivities(workout) {
  const activities = [];
  if (workout?.exercises?.some(exercise => exercise.done === true)) {
    activities.push({key:'strength', label:'Musculação', type:'Musculação'});
  }
  normalizeCardioActivities(workout).forEach((activity, index) => {
    const type = {Esteira:'Caminhada', Bicicleta:'Ciclismo', Escada:'Escada'}[activity.type] || 'Outro';
    activities.push({key:'cardio-'+index, label:activity.type+' • '+activity.minutes+' min', type,
      minutes:activity.minutes, distance:activity.distance, calories:activity.calories});
  });
  return activities;
}

function numericValue(value, maximum, label, optional = false) {
  if (value === '' || value === undefined || value === null) {
    if (optional) return undefined;
    throw Error('Informe '+label+'.');
  }
  if (typeof value !== 'number' && typeof value !== 'string') throw Error('Revise '+label+'.');
  const parsed = typeof value === 'string' ? Number(value.trim().replace(',', '.')) : value;
  if ((typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) ||
      !Number.isFinite(parsed) || parsed < (optional ? 0 : 1) || parsed > maximum) {
    throw Error('Revise '+label+'.');
  }
  return parsed;
}

export function buildHealthPayload(values, now = Date.now()) {
  if (!HEALTH_ACTIVITY_TYPES.includes(values.type)) throw Error('Selecione o tipo de atividade.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.startLocal || '')) throw Error('Informe a data e o horário reais de início.');
  const start = new Date(values.startLocal);
  const localParts = [start.getFullYear(), String(start.getMonth()+1).padStart(2,'0'), String(start.getDate()).padStart(2,'0')].join('-')+'T'+String(start.getHours()).padStart(2,'0')+':'+String(start.getMinutes()).padStart(2,'0');
  if (!Number.isFinite(start.getTime()) || localParts !== values.startLocal) throw Error('Data ou horário inválido.');
  const durationMinutes = numericValue(values.minutes,300,'a duração real em minutos');
  const end = new Date(start.getTime()+durationMinutes*60000);
  if (end.getTime() > now) throw Error('A atividade precisa ter terminado. Confira início e duração.');
  const distanceKm = numericValue(values.distance,1000,'a distância em km',true);
  const caloriesKcal = numericValue(values.calories,100000,'as calorias ativas em kcal',true);
  return {schemaVersion:1, source:'Meu Treino', activityType:values.type,
    startDate:start.toISOString(), endDate:end.toISOString(), durationMinutes,
    ...(distanceKm !== undefined ? {distanceKm} : {}),
    ...(caloriesKcal !== undefined ? {caloriesKcal} : {})};
}

export function shortcutUrl(payload, name = SHORTCUT_NAME) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw Error('Informe o nome do Atalho (até 80 caracteres).');
  return 'shortcuts://run-shortcut?name='+encodeURIComponent(name.trim())+'&input=text&text='+encodeURIComponent(JSON.stringify(payload));
}
