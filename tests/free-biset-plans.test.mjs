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

test('four active plans use independent exercises and prescribed volume',()=>{
  for(const [day,count,sets] of [['A',7,23],['B',6,21],['C',7,23],['D',7,23]]){
    assert.equal(plans[day].length,count);
    assert.equal(plans[day].reduce((sum,item)=>sum+item[1],0),sets);
    assert.ok(plans[day].every(item=>!item[3]));
  }
  assert.equal(plans.B.at(-1)[2],'30–45 s');
  assert.deepEqual(plans.D[2],['Stiff com halteres',3,'10–12']);
  assert.deepEqual(plans.D[6],['Cadeira abdutora',3,'12–15']);
  assert.equal(new Set(plans.D.map(item=>item[0])).size,7);
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

test('new B exports six independent exercises without changing past records',()=>{
  const old={date:'2026-10-14',day:'B',cardio:20,exercises:[{name:'Cadeira extensora',sets:3,target:'12–15',done:true,load:'40',reps:'12,12,12'}]};
  const current={date:'2026-10-15',day:'B',planVersion:context.version,cardio:25,exercises:plans.B.map(([name,sets,target,biset])=>({name,sets,target,...(biset?{biset}:{}),done:false,load:'',reps:''}))};
  const data={workouts:[old,current],weights:[]},before=JSON.stringify(data),payload=buildHistoryExport(data);
  assert.equal(payload.workouts[1].exercises.length,6);
  assert.equal(payload.workouts[1].exercises.filter(item=>item.biset).length,0);
  assert.equal(payload.workouts[0].exercises[0].load,'40');
  assert.equal(JSON.stringify(data),before);
  assert.equal(analyzeTraining(payload,'2026-10-16').completedExercises,1);
});
