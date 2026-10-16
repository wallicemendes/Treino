export const CARDIO_TYPES = ['Esteira', 'Bicicleta', 'Escada'];

function finiteNumber(value, minimum, maximum) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const parsed = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export function normalizeCardioActivities(workout) {
  if (!workout || typeof workout !== 'object') return [];
  if (Array.isArray(workout.cardioActivities)) {
    return workout.cardioActivities.flatMap(activity => {
      if (!activity || !CARDIO_TYPES.includes(activity.type)) return [];
      const minutes = finiteNumber(activity.minutes, 1, 300);
      if (minutes === null) return [];
      const normalized = {type: activity.type, minutes};
      if (activity.type === 'Esteira') {
        const speed = finiteNumber(activity.speed, 0.1, 30);
        const incline = finiteNumber(activity.incline, 0, 30);
        if (speed !== null) normalized.speed = speed;
        if (incline !== null) normalized.incline = incline;
      }
      return [normalized];
    });
  }
  const minutes = finiteNumber(workout.cardio, 0, 300);
  return minutes === null ? [] : [{type: 'Cardio (registro legado)', minutes, legacy: true}];
}

export function totalCardioMinutes(workout) {
  return normalizeCardioActivities(workout).reduce((total, activity) => total + activity.minutes, 0);
}

export function hasCardioRecord(workout) {
  return Array.isArray(workout?.cardioActivities)
    ? normalizeCardioActivities(workout).length > 0
    : finiteNumber(workout?.cardio, 0, 300) !== null;
}

export function describeCardio(activity) {
  let description = `${activity.type}: ${activity.minutes} min`;
  if (activity.type === 'Esteira') {
    if (activity.speed !== undefined) description += ` • ${activity.speed} km/h`;
    if (activity.incline !== undefined) description += ` • ${activity.incline}% inclinação`;
  }
  return description;
}
