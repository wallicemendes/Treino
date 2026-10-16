import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTraining} from '../training-analysis.mjs';
import {buildHistoryExport} from '../history-export.mjs';

const exercise = overrides => ({name: 'Supino', done: true, sets: 3, target: '10–12', load: '20', reps: '12,12,12', ...overrides});
const workout = (date, overrides = {}) => ({date, exercises: [exercise()], cardio: '15', ...overrides});
const analyze = (workouts = [], weights = []) => analyzeTraining({workouts, weights}, '2026-10-15');

test('empty account returns explicit insufficient data and four calendar weeks', () => {
  const result = analyze();
  assert.equal(result.sessions, 0);
  assert.equal(result.evolution.length, 0);
  assert.match(result.weightSummary, /insuficientes/);
  assert.deepEqual(result.weeks.map(week => week.start), ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12']);
  assert.equal(result.weeks.at(-1).partial, true);
});

test('counts sessions separately from training days and only strict done', () => {
  const result = analyze([workout('2026-10-12'), workout('2026-10-12'), workout('2026-10-11'),
    workout('2026-10-13', {cardio: '', exercises: [exercise({done: false}), exercise({done: 'true'})]})]);
  assert.equal(result.sessions, 3);
  assert.equal(result.completedExercises, 3);
  assert.equal(result.weeks.at(-1).sessions, 2);
  assert.equal(result.weeks.at(-1).days, 1);
  assert.equal(result.weeks.at(-2).sessions, 1);
});

test('planned sets are not treated as confirmed sets; single reps is one reported set', () => {
  const result = analyze([workout('2026-10-10', {exercises: [exercise(), exercise({reps: '12'}), exercise({done: false}), exercise({reps: ''})]})]);
  assert.equal(result.plannedSets, 9);
  assert.equal(result.reportedSets, 4);
});

test('ambiguous, duration, combined or excessive reps do not fabricate sets', () => {
  for (const overrides of [{reps: '3x12'}, {target: '20–40 s', reps: '30,30'}, {target: '12 cada'}, {reps: '12,12,12,12'}, {reps: '0,0,0'}]) {
    assert.equal(analyze([workout('2026-10-10', {exercises: [exercise(overrides)]})]).reportedSets, 0);
  }
});

test('cardio has minutes, missing is distinct from explicit zero and cardio-only counts', () => {
  const result = analyze([workout('2026-10-10', {cardio: ''}), workout('2026-10-11', {cardio: 0}), workout('2026-10-12', {cardio: '30', exercises: []})]);
  assert.equal(result.cardioMinutes, 30);
  assert.equal(result.cardioRecords, 2);
  assert.equal(result.sessions, 3);
});

test('structured cardio supports multiple activities and treadmill details', () => {
  const result = analyze([workout('2026-10-12', {cardio: undefined, exercises: [], cardioActivities: [
    {type: 'Esteira', minutes: 20, speed: 5.5, incline: 2},
    {type: 'Bicicleta', minutes: 15},
    {type: 'Escada', minutes: 10}
  ]})]);
  assert.equal(result.sessions, 1);
  assert.equal(result.cardioMinutes, 45);
  assert.deepEqual(result.cardioByType.map(item => [item.type, item.minutes]), [['Esteira', 20], ['Bicicleta', 15], ['Escada', 10]]);
  const payload = buildHistoryExport({workouts: [workout('2026-10-12', {cardioActivities: [
    {type: 'Esteira', minutes: 20, speed: 5.5, incline: 2}, {type: 'Bicicleta', minutes: 15}
  ]})], weights: []});
  assert.deepEqual(payload.workouts[0].cardioActivities, [
    {type: 'Esteira', minutes: 20, speed: 5.5, incline: 2}, {type: 'Bicicleta', minutes: 15}
  ]);
});

test('export normalizes legacy cardio without deleting its original value', () => {
  const payload = buildHistoryExport({workouts: [workout('2026-10-12', {cardio: '25'})], weights: []});
  assert.equal(payload.workouts[0].cardio, '25');
  assert.deepEqual(payload.workouts[0].cardioActivities, [{type: 'Cardio (registro legado)', minutes: 25, legacy: true}]);
  assert.equal(payload.schemaVersion, 2);
});

test('malformed records, impossible dates and future dates are excluded', () => {
  const result = analyze([null, workout('2026-02-30'), workout('2026-10-16'), workout('2026-10-10', {exercises: null})], [null, {date: '2026-10-10', value: ''}]);
  assert.equal(result.sessions, 0);
  assert.equal(result.ignored, 6);
});

test('missing, booleans, negative and nonnumeric loads never become zero', () => {
  for (const load of ['', ' ', null, true, -1, 'unknown', Infinity]) {
    assert.equal(analyze([workout('2026-10-10', {exercises: [exercise({load})]})]).evolution[0].details[0].includes('carga não informada'), true);
  }
  assert.match(analyze([workout('2026-10-10', {exercises: [exercise({load: 0})]})]).evolution[0].details[0], /0 kg/);
});

test('progression is conditional on two distinct dates and complete equivalent targets', () => {
  assert.match(analyze([workout('2026-10-08'), workout('2026-10-15')]).evolution[0].details.join(' '), /menor incremento/);
  for (const overrides of [{load: '25'}, {reps: '12'}, {target: '12 cada'}, {sets: 2}, {reps: '12,11,10'}, {load: ''}]) {
    assert.doesNotMatch(analyze([workout('2026-10-08'), workout('2026-10-15', {exercises: [exercise(overrides)]})]).evolution[0].details.join(' '), /menor incremento/);
  }
  assert.doesNotMatch(analyze([workout('2026-10-15'), workout('2026-10-15')]).evolution[0].details.join(' '), /menor incremento/);
});

test('evolution uses chronological distinct dates and preserves names safely as data', () => {
  const result = analyze([workout('2026-10-15', {exercises: [exercise({load: '22,5', name: '<img src=x>'})]}), workout('2026-10-08', {exercises: [exercise({name: '<img src=x>'})]})]);
  assert.equal(result.evolution[0].name, '<img src=x>');
  assert.match(result.evolution[0].details.join(' '), /Variação de carga: 2,5 kg/);
});

test('rep comparison requires same load, target and reported set count', () => {
  const details = analyze([workout('2026-10-08', {exercises: [exercise({reps: '10,10,10'})]}), workout('2026-10-15')]).evolution[0].details.join(' ');
  assert.match(details, /30 → 36 repetições/);
  assert.doesNotMatch(analyze([workout('2026-10-08'), workout('2026-10-15', {exercises: [exercise({load: 25})]})]).evolution[0].details.join(' '), /repetições totais/);
});

test('weight trend uses two windows and averages duplicate same-day measurements', () => {
  const weights = [{date: '2026-10-03', value: 80}, {date: '2026-10-07', value: 80}, {date: '2026-10-10', value: 78}, {date: '2026-10-10', value: 80}, {date: '2026-10-15', value: 79}];
  assert.match(analyze([], weights).weightSummary, /80 → 79 kg \(-1 kg\)/);
  assert.match(analyze([], weights).weightSummary, /2 e 2 dias/);
  assert.match(analyze([], weights.slice(2)).weightSummary, /insuficientes/);
});

test('stale weight data has an explicit warning', () => {
  assert.match(analyze([], [{date: '2026-09-01', value: 80}]).weightSummary, /mais de 14 dias/);
});

test('analysis is deterministic and leaves original arrays and extra fields unchanged', () => {
  const data = {workouts: [workout('2026-10-15'), workout('2026-10-08')], weights: [], secret: 'not analyzed'};
  const before = structuredClone(data);
  const first = analyzeTraining(data, '2026-10-15');
  assert.deepEqual(first, analyzeTraining(data, '2026-10-15'));
  assert.deepEqual(data, before);
  assert.doesNotMatch(JSON.stringify(first), /not analyzed/);
});

test('invalid document and invalid reference date reject clearly', () => {
  for (const data of [null, {}, {workouts: [], weights: {}}]) assert.throws(() => analyzeTraining(data, '2026-10-15'), /Histórico inválido/);
  assert.throws(() => analyzeTraining({workouts: [], weights: []}, '2026-02-30'), /Data de análise inválida/);
});

test('existing export still preserves permitted fields and omits identifiers', () => {
  const payload = buildHistoryExport({workouts: [{...workout('2026-10-15'), id: 'private', notes: 'original'}], weights: []});
  assert.equal(payload.workouts[0].notes, 'original');
  assert.equal(payload.workouts[0].exercises[0].done, true);
  assert.equal(payload.workouts[0].id, undefined);
  assert.equal(payload.units.cardio, 'minutos');
});
