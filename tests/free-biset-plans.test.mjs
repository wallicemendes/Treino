import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildHistoryExport} from '../history-export.mjs';
import {analyzeTraining} from '../training-analysis.mjs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(html.slice(html.indexOf('const PLAN_VERSION='),html.indexOf('let displayedPlans='))+';globalThis.plans=PLANS;globalThis.guidance=FREE_EXERCISE_GUIDANCE;globalThis.version=PLAN_VERSION;',context);
const plans=JSON.parse(JSON.stringify(context.plans));
const previousCounts={A:6,B:6,C:7,D:6,E:6};
const freeNames=new Set(['Elevação lateral','Rosca martelo','Tríceps francês com halter','Agachamento livre sem carga','Prancha lateral','Prancha solo','Crucifixo inverso com halteres','Rosca alternada com halteres','Abdominal curto solo','Bird dog','Abdominal dead bug']);
const machineNames=new Set(['Tríceps corda','Rosca direta polia','Cadeira extensora','Cadeira abdutora','Panturrilha em pé','Crucifixo máquina','Tríceps pulley','Cadeira adutora','Panturrilha no Leg Press']);

test('every pair in all five plans has exactly one machine first and one bodyweight or dumbbell partner second',()=>{
  for(const [day,exercises] of Object.entries(plans)){
    assert.ok(exercises.length>previousCounts[day],day+' adds exercises');
    assert.ok(!exercises.some(exercise=>exercise[0]==='Elevação pélvica máquina'));
    assert.equal(new Set(exercises.map(exercise=>exercise[0])).size,exercises.length);
    const groups=new Map();
    exercises.forEach((exercise,index)=>{
      if(!exercise[3])return;
      const group=groups.get(exercise[3])||[];
      group.push({exercise,index});groups.set(exercise[3],group);
    });
    for(const [key,group] of groups){
      assert.equal(group.length,2,day+' pair '+key);
      assert.equal(group[1].index,group[0].index+1);
      assert.equal(group[0].exercise[1],group[1].exercise[1]);
      assert.ok(machineNames.has(group[0].exercise[0]),day+' first exercise is a machine or pulley');
      assert.ok(!freeNames.has(group[0].exercise[0]),day+' first exercise must not be a second free exercise');
      assert.ok(freeNames.has(group[1].exercise[0]),day+' second partner uses bodyweight or dumbbells');
      assert.ok(!machineNames.has(group[1].exercise[0]),day+' second exercise must not be a second machine');
      assert.ok(group.every(item=>item.exercise[1]===2));
    }
    assert.ok(exercises.reduce((total,exercise)=>total+exercise[1],0)<=20,day+' volume ceiling');
  }
});

test('leg pairings avoid same-muscle pre-exhaustion and keep extension and abduction in different groups',()=>{
  const extension=plans.B.find(exercise=>exercise[0]==='Cadeira extensora');
  const abduction=plans.B.find(exercise=>exercise[0]==='Cadeira abdutora');
  assert.notEqual(extension[3],abduction[3]);
  assert.deepEqual(plans.B.filter(exercise=>exercise[3]===extension[3]).map(exercise=>exercise[0]),['Cadeira extensora','Prancha solo']);
  assert.ok(!plans.B.some(exercise=>exercise[0]==='Agachamento livre sem carga'));
});

test('new free partners have execution guidance and no invented starting load',()=>{
  for(const exercises of Object.values(plans)){
    for(const exercise of exercises.filter(item=>freeNames.has(item[0]))){
      assert.ok(context.guidance[exercise[0]],exercise[0]);
      assert.ok(exercise.length<=4);
    }
  }
  assert.ok(html.includes("['Elevação pélvica máquina',2,'10–12']"),'legacy prescription stays available');
});

test('new B exports eight independent exercises without changing past records',()=>{
  const old={date:'2026-10-14',day:'B',cardio:20,exercises:[{name:'Cadeira extensora',sets:3,target:'12–15',done:true,load:'40',reps:'12,12,12'}]};
  const current={date:'2026-10-15',day:'B',planVersion:context.version,cardio:25,exercises:plans.B.map(([name,sets,target,biset])=>({name,sets,target,...(biset?{biset}:{}),done:false,load:'',reps:''}))};
  const data={workouts:[old,current],weights:[]},before=JSON.stringify(data),payload=buildHistoryExport(data);
  assert.equal(payload.workouts[1].exercises.length,8);
  assert.equal(payload.workouts[1].exercises.filter(item=>item.biset==='1').length,2);
  assert.equal(payload.workouts[0].exercises[0].load,'40');
  assert.equal(JSON.stringify(data),before);
  assert.equal(analyzeTraining(payload,'2026-10-16').completedExercises,1);
});
