import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCardioActivities, describeCardio} from '../cardio-utils.mjs';
import {buildHistoryExport} from '../history-export.mjs';
import {analyzeTraining} from '../training-analysis.mjs';

test('optional distance and calories survive all cardio types, export and analysis without mutation', () => {
  const data={workouts:[{date:'2026-10-15',day:'E',exercises:[],cardio:30,cardioActivities:[
    {type:'Esteira',minutes:10,speed:5.5,incline:0,distance:'1,25',calories:'100,5'},
    {type:'Bicicleta',minutes:10,distance:3,calories:90},
    {type:'Escada',minutes:10,distance:0,calories:0}
  ]}],weights:[]};
  const before=JSON.stringify(data),exported=buildHistoryExport(data);
  const activities=exported.workouts[0].cardioActivities;
  assert.equal(activities[0].distance,1.25);
  assert.equal(activities[0].calories,100.5);
  assert.equal(activities[1].distance,3);
  assert.equal(activities[1].calories,90);
  assert.equal(activities[2].distance,0);
  assert.equal(activities[2].calories,0);
  assert.match(describeCardio(activities[0]),/1.25 km • 100.5 kcal/);
  assert.match(describeCardio(activities[2]),/0 km • 0 kcal/);
  assert.equal(exported.units.distance,'km');
  assert.equal(exported.units.calories,'kcal');
  assert.equal(analyzeTraining(exported,'2026-10-16').cardioMinutes,30);
  assert.equal(JSON.stringify(data),before);
});

test('absent or invalid optional cardio values never become recorded zeroes', () => {
  for(const value of [undefined,null,'',true,-1,'invalid',Infinity]){
    const [activity]=normalizeCardioActivities({cardioActivities:[{type:'Bicicleta',minutes:15,distance:value,calories:value}]});
    assert.deepEqual(activity,{type:'Bicicleta',minutes:15});
  }
  assert.deepEqual(normalizeCardioActivities({cardioActivities:[{type:'Escada',minutes:10,distance:1001,calories:100001}]}),[{type:'Escada',minutes:10}]);
});

test('old cardio records retain their shape and are not assigned distance or energy', () => {
  const legacy={cardio:'25'},structured={cardioActivities:[{type:'Esteira',minutes:20,speed:5.5,incline:2}]};
  const before=JSON.stringify([legacy,structured]);
  assert.deepEqual(normalizeCardioActivities(legacy),[{type:'Cardio (registro legado)',minutes:25,legacy:true}]);
  assert.deepEqual(normalizeCardioActivities(structured),structured.cardioActivities);
  assert.equal(JSON.stringify([legacy,structured]),before);
});
