import test from 'node:test';
import assert from 'node:assert/strict';
import {healthActivities, buildHealthPayload, shortcutUrl} from '../health-shortcut.mjs';

const now=new Date('2026-10-27T23:59:00Z').getTime();
const values={type:'Musculação',startLocal:'2026-10-15T08:30',minutes:'45'};

test('health choices contain only completed strength and actual cardio with independent metrics',()=>{
  const workout={id:'private',notes:'private',exercises:[{name:'Supino máquina',done:true}],cardioActivities:[{type:'Esteira',minutes:20,distance:1.8,calories:150},{type:'Bicicleta',minutes:15}]};
  const before=JSON.stringify(workout),activities=healthActivities(workout);
  assert.equal(activities.length,3);
  assert.equal(activities[0].minutes,undefined);
  assert.equal(activities[1].minutes,20);
  assert.equal(activities[1].distance,1.8);
  assert.equal(activities[2].calories,undefined);
  assert.equal(JSON.stringify(workout),before);
  assert.deepEqual(healthActivities({exercises:[{done:false}]}),[]);
  assert.equal(healthActivities({cardio:25})[0].type,'Outro');
});

test('payload contains real times and only allowed data with no planned duration or personal fields',()=>{
  const payload=buildHealthPayload({...values,uid:'private',notes:'private',exercises:['private']},now);
  assert.deepEqual(Object.keys(payload),['schemaVersion','source','activityType','startDate','endDate','durationMinutes']);
  assert.equal(payload.durationMinutes,45);
  assert.equal(payload.startDate,new Date(values.startLocal).toISOString());
  assert.equal(Date.parse(payload.endDate)-Date.parse(payload.startDate),45*60000);
});

test('optional health metrics distinguish blank and explicit zero and never estimate',()=>{
  for(const value of ['',undefined,null]){
    const payload=buildHealthPayload({...values,distance:value,calories:value},now);
    assert.equal(Object.hasOwn(payload,'distanceKm'),false);
    assert.equal(Object.hasOwn(payload,'caloriesKcal'),false);
  }
  const payload=buildHealthPayload({...values,distance:0,calories:0},now);
  assert.equal(payload.distanceKm,0);
  assert.equal(payload.caloriesKcal,0);
  assert.equal(buildHealthPayload({...values,distance:'1,8',calories:'150,5'},now).caloriesKcal,150.5);
});

test('incomplete, invalid and future activities cannot produce a health payload',()=>{
  for(const override of [{minutes:''},{minutes:0},{minutes:-1},{minutes:301},{minutes:true},{type:'Invalid'},{startLocal:''},{startLocal:'2026-02-30T08:30'},{startLocal:'2026-10-28T08:30'},{distance:-1},{distance:1001},{calories:-1},{calories:100001}]){
    assert.throws(()=>buildHealthPayload({...values,...override},now));
  }
});

test('shortcut URL safely round trips the exact name and JSON through the documented text protocol',()=>{
  const payload=buildHealthPayload(values,now),name='Meu Treino Saúde & teste=1';
  const url=new URL(shortcutUrl(payload,name));
  assert.equal(url.protocol,'shortcuts:');
  assert.equal(url.hostname,'run-shortcut');
  assert.equal(url.searchParams.get('name'),name);
  assert.equal(url.searchParams.get('input'),'text');
  assert.deepEqual(JSON.parse(url.searchParams.get('text')),payload);
  assert.deepEqual([...url.searchParams.keys()],['name','input','text']);
  assert.throws(()=>shortcutUrl(payload,' '));
});
