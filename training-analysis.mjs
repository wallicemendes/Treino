const DAY = 86400000;

function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

function number(value, maximum = Infinity) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const parsed = Number(typeof value === 'string' ? value.trim().replace(',', '.') : value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function repetitions(exercise) {
  if (typeof exercise.target === 'string' && /\b(s|seg|segundos?|min|minutos?|cada)\b/i.test(exercise.target)) return null;
  if (typeof exercise.reps !== 'string' || !/^\s*\d+(\s*[,;/]\s*\d+)*\s*$/.test(exercise.reps)) return null;
  const values = exercise.reps.trim().split(/\s*[,;/]\s*/).map(Number);
  return values.every(value => value > 0 && value <= 1000) ? values : null;
}

const iso = timestamp => new Date(timestamp).toISOString().slice(0, 10);
const mean = values => values.reduce((total, value) => total + value, 0) / values.length;
const format = value => value.toLocaleString('pt-BR', {maximumFractionDigits: 1});
const displayDate = value => value.split('-').reverse().join('/');

export function analyzeTraining(data, asOf) {
  const end = dateNumber(asOf);
  if (end === null) throw Error('Data de análise inválida.');
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.weights)) {
    throw Error('Histórico inválido: treinos e pesos precisam ser listas.');
  }
  let ignored = 0;
  let completedExercises = 0;
  let reportedSets = 0;
  let plannedSets = 0;
  let cardioMinutes = 0;
  let cardioRecords = 0;
  const exercises = new Map();
  const workouts = [];
  for (const workout of data.workouts) {
    const timestamp = dateNumber(workout?.date);
    if (timestamp === null || timestamp > end || !Array.isArray(workout?.exercises)) { ignored++; continue; }
    const completed = workout.exercises.filter(exercise => exercise && exercise.done === true);
    const cardio = number(workout.cardio, 300);
    if (!completed.length && !(cardio > 0)) continue;
    workouts.push({date: workout.date, timestamp});
    if (cardio !== null) { cardioMinutes += cardio; cardioRecords++; }
    for (const exercise of completed) {
      completedExercises++;
      const sets = number(exercise.sets, 100);
      const validSets = sets !== null && Number.isInteger(sets) && sets > 0 ? sets : null;
      const reps = repetitions(exercise);
      plannedSets += validSets ?? 0;
      if (reps && validSets && reps.length <= validSets) reportedSets += reps.length;
      const name = typeof exercise.name === 'string' ? exercise.name.trim() : '';
      if (!name) { ignored++; continue; }
      if (!exercises.has(name)) exercises.set(name, []);
      exercises.get(name).push({date: workout.date, load: number(exercise.load, 1000), reps,
        rawReps: typeof exercise.reps === 'string' ? exercise.reps : '', sets: validSets,
        target: typeof exercise.target === 'string' ? exercise.target : ''});
    }
  }
  const monday = end - ((new Date(end).getUTCDay() + 6) % 7) * DAY;
  const weeks = Array.from({length: 4}, (_, index) => {
    const start = monday - (3 - index) * 7 * DAY;
    const records = workouts.filter(workout => workout.timestamp >= start && workout.timestamp < start + 7 * DAY);
    return {start: iso(start), sessions: records.length, days: new Set(records.map(workout => workout.date)).size, partial: index === 3};
  });
  const evolution = [...exercises].sort(([first], [second]) => first.localeCompare(second, 'pt-BR')).map(([name, records]) => {
    records.sort((first, second) => first.date.localeCompare(second.date));
    const latest = records.at(-1);
    const previous = records.findLast(record => record.date < latest.date);
    const details = [`Último registro: ${displayDate(latest.date)}; ${latest.load === null ? 'carga não informada' : format(latest.load) + ' kg'}; ${latest.rawReps ? 'reps/duração: ' + latest.rawReps : 'repetições não informadas'}.`];
    if (!previous) details.push('Dados insuficientes: registre este exercício em pelo menos duas datas para comparar.');
    else {
      details.push(`Anterior: ${displayDate(previous.date)}; ${previous.load === null ? 'carga não informada' : format(previous.load) + ' kg'}; ${previous.rawReps ? 'reps/duração: ' + previous.rawReps : 'repetições não informadas'}.`);
      if (previous.load !== null && latest.load !== null) details.push(`Variação de carga: ${format(latest.load - previous.load)} kg. Carga maior sozinha não comprova evolução; considere técnica e repetições.`);
      if (latest.reps && previous.reps && latest.load !== null && latest.load === previous.load && latest.sets === previous.sets && latest.target === previous.target && latest.reps.length === previous.reps.length) {
        details.push(`Na mesma carga e quantidade de séries informadas: ${previous.reps.reduce((total, value) => total + value, 0)} → ${latest.reps.reduce((total, value) => total + value, 0)} repetições totais.`);
      } else details.push('Repetições sem comparação direta: faltam valores equivalentes, ou carga, meta ou número de séries mudou. Duração e exercícios combinados são exibidos como registrados.');
    }
    const target = latest.target.match(/^\s*(\d+)\s*(?:[–—-]\s*(\d+))?\s*$/);
    const upper = target ? Number(target[2] || target[1]) : null;
    const atTarget = record => record && record.load !== null && record.reps && record.sets && record.reps.length === record.sets && record.reps.every(value => value >= upper);
    if (upper > 0 && previous && previous.load === latest.load && previous.target === latest.target && previous.sets === latest.sets && atTarget(previous) && atTarget(latest)) {
      details.push('Progressão: você atingiu o topo da meta em duas datas na mesma carga. Se a técnica estiver estável e houver boa recuperação, considere o menor incremento disponível; volte à carga anterior se perder execução.');
    } else details.push('Progressão: mantenha uma carga que permita executar a meta com boa técnica. Registre todas as séries antes de decidir aumentar.');
    return {name, details};
  });
  const dailyWeights = new Map();
  for (const weight of data.weights) {
    const timestamp = dateNumber(weight?.date);
    const value = number(weight?.value, 400);
    if (timestamp === null || timestamp > end || value === null || value < 20) { ignored++; continue; }
    if (!dailyWeights.has(weight.date)) dailyWeights.set(weight.date, []);
    dailyWeights.get(weight.date).push(value);
  }
  const weights = [...dailyWeights].map(([date, values]) => ({date, value: mean(values)})).sort((first, second) => first.date.localeCompare(second.date));
  let weightSummary = 'Dados insuficientes para tendência de peso. Registre em pelo menos duas datas em cada uma de duas janelas consecutivas de 7 dias.';
  if (weights.length) {
    const latest = weights.at(-1);
    const reference = dateNumber(latest.date);
    const recent = weights.filter(weight => dateNumber(weight.date) > reference - 7 * DAY);
    const prior = weights.filter(weight => dateNumber(weight.date) > reference - 14 * DAY && dateNumber(weight.date) <= reference - 7 * DAY);
    weightSummary = `Último peso: ${format(latest.value)} kg em ${displayDate(latest.date)}. ` + weightSummary;
    if (recent.length >= 2 && prior.length >= 2) {
      const recentMean = mean(recent.map(weight => weight.value));
      const priorMean = mean(prior.map(weight => weight.value));
      weightSummary = `Médias das janelas ${displayDate(iso(reference - 13 * DAY))}–${displayDate(iso(reference - 7 * DAY))} e ${displayDate(iso(reference - 6 * DAY))}–${displayDate(latest.date)}: ${format(priorMean)} → ${format(recentMean)} kg (${format(recentMean - priorMean)} kg). ${prior.length} e ${recent.length} dias medidos. Oscilações não indicam, sozinhas, mudança de gordura ou músculo.`;
    }
    if (end - reference > 14 * DAY) weightSummary += ' Os últimos dados de peso têm mais de 14 dias; registre medidas recentes.';
  }
  return {asOf, sessions: workouts.length, completedExercises, reportedSets, plannedSets,
    cardioMinutes, cardioRecords, weeks, evolution, weightSummary, ignored};
}

export function renderAnalysis(root, result) {
  const document = root.ownerDocument;
  root.replaceChildren();
  function append(parent, tag, text) {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }
  append(root, 'p', `Análise até ${displayDate(result.asOf)}. Totais do histórico válido salvo na nuvem; frequência nas últimas quatro semanas de calendário.`);
  append(root, 'h3', 'Realização e séries');
  append(root, 'p', `${result.sessions} treino(s); ${result.completedExercises} exercício(s) marcado(s) como feito(s). ${result.reportedSets} série(s) com repetições numéricas informadas em exercícios feitos; ${result.plannedSets} séries planejadas nesses exercícios.`);
  append(root, 'p', '“Feito” marca o exercício inteiro, não cada série. Uma lista como 12,12,10 informa três séries; um valor isolado informa somente uma. Séries realmente concluídas não podem ser confirmadas individualmente.');
  if (!result.sessions) append(root, 'p', 'Dados insuficientes: nenhum treino com exercício feito ou cardio positivo foi encontrado.');
  append(root, 'h3', 'Frequência semanal');
  const list = append(root, 'ul', '');
  for (const week of result.weeks) append(list, 'li', `Semana de ${displayDate(week.start)}: ${week.sessions} treino(s) em ${week.days} dia(s)${week.partial ? ' — semana atual incompleta' : ''}.`);
  append(root, 'h3', 'Cardio');
  append(root, 'p', result.cardioRecords ? `${format(result.cardioMinutes)} minutos registrados em ${result.cardioRecords} treino(s). Não há dados de intensidade ou distância para avaliá-las.` : 'Dados insuficientes: nenhum valor válido de cardio registrado.');
  append(root, 'h3', 'Peso corporal');
  append(root, 'p', result.weightSummary);
  append(root, 'h3', 'Evolução por exercício');
  if (!result.evolution.length) append(root, 'p', 'Dados insuficientes: marque exercícios realizados e registre cargas e repetições.');
  for (const exercise of result.evolution) {
    const article = append(root, 'article', '');
    article.className = 'entry';
    append(article, 'h4', exercise.name);
    for (const detail of exercise.details) append(article, 'p', detail);
  }
  append(root, 'h3', 'Recuperação e próximos passos');
  append(root, 'p', 'Observe disposição, sono, desconforto e qualidade da execução. Se o desempenho cair repetidamente ou a recuperação estiver ruim, considere reduzir a exigência e rever o planejamento com um profissional. Não aumente carga com dor. O histórico não mede esforço, técnica ou recuperação.');
  if (result.ignored) append(root, 'p', `${result.ignored} registro(s) ou exercício(s) com dados inválidos ou datas futuras foram desconsiderados. Valores ausentes não foram tratados como zero.`);
}
