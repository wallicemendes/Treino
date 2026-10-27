import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHistoryExport} from '../history-export.mjs';
import {analyzeTraining} from '../training-analysis.mjs';

test('export preserves independent bi-set loads and legacy combined records without mutating data', () => {
  const old = {date:'2026-10-14',day:'C',cardio:0,notes:'',exercises:[{name:'Rosca direta polia + tríceps pulley',sets:2,target:'12 cada',done:true,load:'20',reps:'12,12'}]};
  const current = {date:'2026-10-15',day:'E',planVersion:'upper-lower-5dias-biset-2026-10',cardio:25,notes:'',exercises:[
    {name:'Rosca direta polia',sets:2,target:'10–15',biset:'2',done:true,load:'10',reps:'12,12'},
    {name:'Tríceps pulley',sets:2,target:'10–15',biset:'2',done:true,load:'15',reps:'12,12'}
  ]};
  const data={workouts:[old,current],weights:[]},before=JSON.stringify(data);
  const exported=buildHistoryExport(data);
  assert.equal(JSON.stringify(data),before);
  assert.equal(exported.workouts[0].exercises[0].name,old.exercises[0].name);
  assert.equal(exported.workouts[1].planVersion,current.planVersion);
  assert.equal(exported.workouts[1].day,'E');
  assert.deepEqual(exported.workouts[1].exercises,current.exercises);
  const analysis=analyzeTraining(exported,'2026-10-16');
  assert.equal(analysis.sessions,2);
  assert.equal(analysis.reportedSets,4);
});
