import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = new Set(['index.html', 'training-analysis.mjs', 'analysis-controller.mjs', 'history-export.mjs', 'cardio-utils.mjs', 'health-shortcut.mjs', 'health-shortcut-ui.mjs', 'saude-iphone.txt']);
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!allowed.has(name)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.txt') ? 'text/plain; charset=utf-8' : 'text/javascript; charset=utf-8');
  response.end(await readFile(path.join(root, name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {});
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log('PASS', message); }
const fixture = {workouts: ['2026-10-08', '2026-10-15'].map(date => ({date, day: 'A', cardio: '15', exercises: [{name: '<img src=x onerror=alert(1)> Supino', done: true, load: '20', reps: '12,12,12', sets: 3, target: '10–12'}]})), weights: []};

const mockModules = {
  'firebase-app.js': 'export const initializeApp = config => config;',
  'firebase-auth.js': `
    const state = window.__firebaseTest;
    export const getAuth = () => state.auth;
    export class GoogleAuthProvider {}
    export const signInWithPopup = async () => {};
    export const signOut = async () => state.switchUser(null);
    export const onAuthStateChanged = (auth, callback) => { state.listeners.push(callback); queueMicrotask(() => callback(auth.currentUser)); return () => {}; };
  `,
  'firebase-firestore.js': `
    const state = window.__firebaseTest;
    export const getFirestore = () => ({});
    export const doc = (db, ...parts) => parts;
    export const getDoc = async () => state.snapshot();
    export const getDocFromServer = async reference => {
      state.reads.push(reference);
      if (state.hold) await new Promise(resolve => state.release = resolve);
      if (state.error) throw Object.assign(Error('provider error'), {code: state.error});
      return state.snapshot();
    };
    export const setDoc = async () => { state.writes++; throw Error('Unexpected write'); };
    export const runTransaction = async () => { state.writes++; throw Error('Unexpected transaction'); };
    export const onSnapshot = () => () => {};
  `
};

try {
  for (const width of [320, 390, 430, 1280]) {
    const context = await browser.newContext({viewport: {width, height: 844}, isMobile: width < 500, hasTouch: width < 500});
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(data => {
      const state = window.__firebaseTest = {auth: {currentUser: null}, listeners: [], data, reads: [], writes: 0, hold: false, error: null, exists: true, metadata: {fromCache: false, hasPendingWrites: false}};
      state.snapshot = () => ({exists: () => state.exists, data: () => state.data, metadata: state.metadata});
      state.switchUser = async uid => { state.auth.currentUser = uid ? {uid} : null; await Promise.all(state.listeners.map(callback => callback(state.auth.currentUser))); };
    }, fixture);
    await page.route('https://www.gstatic.com/firebasejs/**', route => {
      const name = new URL(route.request().url()).pathname.split('/').at(-1);
      return route.fulfill({contentType: 'text/javascript', body: mockModules[name] || ''});
    });
    await page.goto(url);
    await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
    check(await page.locator('.done:checked').count() === 0, `${width}px: new session starts with every exercise unchecked`);
    check(!(await page.locator('#account').isVisible()) && !(await page.locator('#cloudTools').isVisible()), `${width}px: cloud controls stay off the training screen`);
    if (width === 390) {
      for (const [day, count, pairs] of [['A',8,2],['B',8,3],['C',9,3],['D',8,2],['E',8,2]]) {
        await page.locator('#day').selectOption(day);
        check(await page.locator('.exercise').count() === count && await page.locator('.biset-label').count() === pairs, day + ': complete plan and explicit paired accessory labels');
        check(await page.locator('.biset-group').evaluateAll(groups=>groups.every(group=>group.querySelectorAll('.exercise').length===2 && group.textContent.includes('Uma série de cada'))), day+': each bi-set is one group with two separately recorded exercises and explicit execution order');
        if(day==='B'){
          const pairs=await page.locator('.biset-group').allTextContents();
          check(pairs[0].includes('Cadeira extensora')&&pairs[0].includes('Prancha solo')&&pairs[1].includes('Cadeira abdutora')&&pairs[1].includes('Abdominal dead bug'), 'B pairs each machine with separate core work instead of another machine or quadriceps exercise');
        }
        if (day === 'D') {
          const names=await page.locator('.exercise-title').allTextContents();
          assert.equal(names.includes('Elevação pélvica máquina'),false);
          assert.equal(names[1],'Leg Press 45°');
        }
      }
      check((await page.locator('#planGuide').innerText()).includes('25 min'), 'session guide includes cardio and progression');
      for (const [date,day] of [['2026-10-19','A'],['2026-10-20','B'],['2026-10-21','C'],['2026-10-22','D'],['2026-10-23','E']]) {
        await page.clock.setFixedTime(new Date(date+'T12:00:00Z'));
        check(await page.evaluate(() => suggestedDay())===day, date+': weekday maps to '+day);
      }
      await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
      check(await page.evaluate(() => {
        const original=db;
        db={workouts:[{date:'2026-10-14',exercises:[{name:'Reference',done:true,load:'10'}]},{date:'2026-10-13',exercises:[{name:'Reference',done:true,load:'20'}]},{date:'2026-10-16',exercises:[{name:'Reference',done:true,load:'30'}]}],weights:[]};
        const reference=recentLoad('Reference');db=original;
        return reference==='10';
      }), 'load reference uses chronological date and excludes sessions after selected date');
      const legacy = {id:'legacy-c',date:'2026-10-14',day:'C',cardio:20,notes:'original',extra:'preserve',exercises:[{name:'Rosca direta polia + tríceps pulley',sets:2,target:'12 cada',done:true,load:'20',reps:'12,12',extra:'keep'}]};
      await page.evaluate(record => {
        localStorage.setItem('meu_treino_historico_v2',JSON.stringify({workouts:[record],weights:[]}));
        localStorage.removeItem('meu_treino_rascunho_v1');
      }, legacy);
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      check(await page.evaluate(() => JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts.length === 1), 'opening new plans does not migrate history');
      await page.evaluate(() => editWorkout('legacy-c'));
      check(await page.locator('.exercise').count() === 1 && (await page.locator('.exercise-title').innerText()).includes(' + '), 'editing legacy C retains combined exercise instead of replacing it');
      check(await page.locator('#day').isDisabled(), 'saved workout day stays fixed during editing');
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      await page.getByRole('button', {name:'Salvar alterações',exact:true}).click();
      check(await page.evaluate(record => JSON.stringify(JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts[0]) === JSON.stringify(record),legacy), 'save and reload of legacy edit preserves the entire original record');
      await page.locator('#day').selectOption('C');
      await page.locator('.done').first().check();
      await page.getByRole('button', {name:'Finalizar e salvar treino',exact:true}).click();
      check(await page.evaluate(record => {
        const records=JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts;
        return records.length===2 && JSON.stringify(records[0])===JSON.stringify(record) && records[1].planVersion==='upper-lower-5dias-maquina-livre-v2-2026-10' && records[1].exercises.length===9 && records[1].exercises.filter(item=>item.biset).length===6;
      },legacy), 'new C appends with separate arms and bi-set metadata without overwriting legacy');
      await page.locator('#day').selectOption('E');
      await page.locator('.done').first().check();
      await page.getByRole('button', {name:'Finalizar e salvar treino',exact:true}).click();
      check(await page.evaluate(() => {
        const records=JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts;
        return records.length===3 && records[2].day==='E' && records[2].exercises.length===8 && records[2].exercises.every(item=>item.sets===2);
      }), 'fifth training day saves independently with adjusted volume');
      await page.evaluate(()=>{
        const names=['Leg Press 45°','Cadeira flexora','Cadeira extensora','Cadeira abdutora','Panturrilha em pé','Prancha solo'];
        localStorage.setItem('meu_treino_rascunho_v1',JSON.stringify({date:'2026-10-15',day:'B',planVersion:'upper-lower-5dias-biset-2026-10',exercises:names.map((name,index)=>({name,sets:3,target:name==='Prancha solo'?'20–40 s':'12–15',done:index===0,load:'',reps:''})),cardioActivities:[],notes:''}));
      });
      await page.reload();
      await page.waitForFunction(()=>!!document.getElementById('exportChatGPT'));
      await page.locator('#planGuide summary').click();
      check(await page.locator('.exercise').count()===6 && (await page.locator('#planGuide').innerText()).includes('rascunho mantém a ficha anterior'), 'existing six-exercise draft is preserved with clear instructions to start a new plan');
      check((await page.locator('#draftBanner').innerText()).includes('Ficha anterior'), 'old draft warning is visible outside the collapsed workout instructions');
      await page.getByRole('button',{name:'Finalizar e salvar treino',exact:true}).click();
      check(await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts.at(-1);return saved.planVersion==='upper-lower-5dias-biset-2026-10'&&saved.exercises.length===6;}), 'saving a pre-update draft retains its original plan version and exercise count');
      await page.evaluate(() => {
        localStorage.setItem('meu_treino_historico_v2',JSON.stringify({workouts:[],weights:[]}));
        localStorage.setItem('meu_treino_rascunho_v1',JSON.stringify({date:'2026-10-15',day:'C',exercises:[{name:'Rosca direta polia + tríceps pulley',done:true,load:'20',reps:'12,12'}],cardioActivities:[],notes:''}));
      });
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      check(await page.locator('.exercise').count()===1 && (await page.locator('.exercise').innerText()).includes('2 séries × 12 cada'), 'pre-update draft retains its original exercise and legacy prescription');
      await page.evaluate(() => {localStorage.clear();});
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      await page.locator('.done').first().check();
      await page.locator('.load').first().fill('25');
      await page.getByRole('button', {name: '+ Adicionar', exact: true}).click();
      await page.locator('.cardio-minutes').fill('20');
      await page.locator('.cardio-speed').fill('5.5');
      await page.locator('.cardio-incline').fill('2');
      await page.locator('.cardio-distance').fill('1.8');
      await page.locator('.cardio-calories').fill('-1');
      await page.getByRole('button', {name:'Finalizar e salvar treino',exact:true}).click();
      check(await page.locator('#cardioError').isVisible() && await page.evaluate(() => JSON.parse(localStorage.getItem('meu_treino_historico_v2')||'{"workouts":[]}').workouts.length===0), 'invalid calories block save without writing a workout');
      await page.locator('.cardio-calories').fill('150');
      await page.locator('.cardio-distance').fill('-1');
      await page.getByRole('button', {name:'Finalizar e salvar treino',exact:true}).click();
      check(await page.locator('.cardio-distance').evaluate(input=>input.classList.contains('input-error')), 'negative cardio distance is rejected');
      await page.locator('.cardio-distance').fill('1.8');
      await page.getByRole('button', {name: '+ Adicionar', exact: true}).click();
      await page.locator('.cardio-distance').nth(1).fill('5');
      await page.locator('.cardio-calories').nth(1).fill('90');
      await page.locator('.cardio-type').nth(1).selectOption('Bicicleta');
      check(await page.locator('.cardio-distance').nth(1).inputValue()==='5' && await page.locator('.cardio-calories').nth(1).inputValue()==='90', 'changing cardio machine retains distance and calories');
      await page.locator('.cardio-minutes').nth(1).fill('15');
      await page.getByRole('button', {name: '+ Adicionar', exact: true}).click();
      await page.locator('.cardio-type').nth(2).selectOption('Escada');
      await page.locator('.cardio-minutes').nth(2).fill('10');
      check(await page.locator('.cardio-distance').nth(2).isVisible() && await page.locator('.cardio-calories').nth(2).isVisible(), 'stair cardio supports optional distance and calories');
      await page.locator('.remove-cardio').nth(2).click();
      check(await page.locator('.cardio-item').count() === 2, 'multiple cardio entries can be added and removed');
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      check(await page.locator('#draftBanner').isVisible() && await page.locator('.done').first().isChecked(), 'active draft is identified and restored intentionally');
      check(await page.locator('.cardio-minutes').first().inputValue() === '20', 'cardio draft survives reload');
      check(await page.locator('.cardio-item').count() === 2, 'multiple cardio entries survive reload');
      check(await page.locator('.cardio-distance').first().inputValue()==='1.8' && await page.locator('.cardio-calories').first().inputValue()==='150', 'cardio distance and calories survive draft reload');
      await page.getByRole('button', {name: 'Finalizar e salvar treino', exact: true}).click();
      check(await page.locator('.done:checked').count() === 0, 'saving starts a clean unchecked session');
      check(!(await page.locator('#draftBanner').isVisible()), 'saving clears the active draft');
      check(await page.locator('#todayWorkout').isVisible() && (await page.locator('#todayWorkout').innerText()).includes('25 kg'), 'saved workout appears immediately in today summary');
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      const todayText = await page.locator('#todayWorkout').innerText();
      check(await page.locator('#todayWorkout').isVisible() && todayText.includes('Treino de hoje — salvo'), 'today summary returns when the app reopens');
      check(todayText.includes('25 kg') && todayText.includes('Esteira: 20 min') && todayText.includes('Bicicleta: 15 min'), 'today summary restores exercises and cardio values');
      check(todayText.includes('1.8 km • 150 kcal') && todayText.includes('5 km • 90 kcal'), 'saved summary displays distance and calories per activity');
      const beforeHealth=await page.evaluate(()=>localStorage.getItem('meu_treino_historico_v2'));
      await page.locator('#todayWorkout').getByRole('button',{name:'Enviar ao Saúde',exact:true}).click();
      await page.locator('#healthDialog').waitFor({state:'visible'});
      check(await page.locator('#healthMinutes').inputValue()==='' && await page.locator('#healthTime').inputValue()==='', 'health handoff requires actual strength duration and start time without assuming 90 minutes');
      check(await page.locator('#healthActivity option').count()===3, 'health handoff separates strength and each cardio activity');
      await page.locator('#healthTime').fill('06:00');
      await page.locator('#healthMinutes').fill('40');
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      check(!(await page.locator('#healthLaunch').isVisible()), 'health link cannot be prepared without duplicate check confirmation');
      await page.locator('#healthConfirmed').check();
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      const strengthUrl=new URL(await page.locator('#healthLaunch').getAttribute('href'));
      const strengthPayload=JSON.parse(strengthUrl.searchParams.get('text'));
      check(strengthUrl.protocol==='shortcuts:' && strengthUrl.searchParams.get('name')==='Meu Treino Saúde' && strengthPayload.durationMinutes===40 && !Object.hasOwn(strengthPayload,'caloriesKcal'), 'health link uses encoded shortcut text and actual strength duration with no invented energy');
      if(process.env.SCREENSHOT_DIR){
        await mkdir(process.env.SCREENSHOT_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,'saude-mobile.png')});
      }
      await page.locator('#healthActivity').selectOption('cardio-0');
      check(await page.locator('#healthMinutes').inputValue()==='20' && await page.locator('#healthDistance').inputValue()==='1.8' && await page.locator('#healthCalories').inputValue()==='150' && await page.locator('#healthTime').inputValue()==='', 'health cardio preloads actual recorded metrics but requires its own start time');
      check(!(await page.locator('#healthLaunch').isVisible()), 'changing activity invalidates the previously prepared health link');
      await page.locator('#healthTime').fill('07:00');
      await page.locator('#healthConfirmed').check();
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      const cardioPayload=JSON.parse(new URL(await page.locator('#healthLaunch').getAttribute('href')).searchParams.get('text'));
      check(cardioPayload.activityType==='Caminhada' && cardioPayload.durationMinutes===20 && cardioPayload.distanceKm===1.8 && cardioPayload.caloriesKcal===150, 'cardio handoff includes distance in km and user-reviewed energy in kcal');
      await page.locator('#healthDistance').fill('0');
      await page.locator('#healthCalories').fill('0');
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      const zeroPayload=JSON.parse(new URL(await page.locator('#healthLaunch').getAttribute('href')).searchParams.get('text'));
      check(zeroPayload.distanceKm===0 && zeroPayload.caloriesKcal===0, 'health handoff preserves explicit zero optional values');
      await page.locator('#healthDistance').fill('');
      await page.locator('#healthCalories').fill('');
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      const blankPayload=JSON.parse(new URL(await page.locator('#healthLaunch').getAttribute('href')).searchParams.get('text'));
      check(!Object.hasOwn(blankPayload,'distanceKm') && !Object.hasOwn(blankPayload,'caloriesKcal'), 'health handoff omits blank metrics instead of recording zeros');
      await page.locator('#healthDate').fill('2099-01-01');
      await page.getByRole('button',{name:'Revisar envio',exact:true}).click();
      check((await page.locator('#healthStatus').innerText()).includes('terminado') && !(await page.locator('#healthLaunch').isVisible()), 'health handoff rejects future activities');
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.getElementById('healthDialog').scrollWidth<=document.getElementById('healthDialog').clientWidth), 'health dialog fits mobile viewport without horizontal overflow');
      const guideResponse=await page.request.get(url+'/saude-iphone.txt');
      check(guideResponse.ok() && (await guideResponse.text()).includes('Registrar Treino'), 'shortcut setup guide is served with the application');
      await page.locator('#healthDialog').getByRole('button',{name:'Fechar',exact:true}).click();
      check(await page.evaluate(()=>localStorage.getItem('meu_treino_historico_v2'))===beforeHealth, 'health preparation never rewrites workout history');
      check(await page.locator('.done:checked').count() === 0, 'reopened app keeps the new session unchecked');
      await page.getByRole('button', {name: 'Editar', exact: true}).click();
      check(await page.locator('#editBanner').isVisible() && await page.getByRole('button', {name: 'Salvar alterações', exact: true}).isVisible(), 'edit action clearly identifies saved-workout editing mode');
      check(await page.locator('.done').first().isChecked() && await page.locator('.load').first().inputValue() === '25', 'editing loads saved completion and exercise values');
      await page.locator('.load').first().fill('27.5');
      await page.locator('.reps').first().fill('10,10,10');
      await page.locator('.cardio-distance').first().fill('2.1');
      await page.locator('.cardio-calories').first().fill('160');
      await page.reload();
      await page.waitForFunction(() => !!document.getElementById('exportChatGPT'));
      check(await page.locator('#editBanner').isVisible() && await page.locator('.load').first().inputValue() === '27.5', 'saved-workout edit survives reload as an identified draft');
      await page.getByRole('button', {name: 'Salvar alterações', exact: true}).click();
      const updatedTodayText = await page.locator('#todayWorkout').innerText();
      check(updatedTodayText.includes('27.5 kg') && updatedTodayText.includes('10,10,10 reps'), 'saving edits refreshes today summary values');
      check(updatedTodayText.includes('2.1 km • 160 kcal'), 'distance and calories survive editing and reload');
      check(await page.evaluate(() => JSON.parse(localStorage.getItem('meu_treino_historico_v2')).workouts.length === 1), 'editing updates the existing workout without creating a duplicate');
      await page.getByRole('button', {name: 'Histórico', exact: true}).click();
      check((await page.locator('#historyList').innerText()).includes('Esteira: 20 min • 5.5 km/h • 2% inclinação'), 'history shows structured treadmill details');
      check((await page.locator('#historyList').innerText()).includes('Bicicleta: 15 min'), 'history shows each cardio activity separately');
      check((await page.locator('#historyList').innerText()).includes('2.1 km • 160 kcal'), 'history shows entered cardio distance and calories');
      await page.locator('#historyList').getByRole('button',{name:'Enviar ao Saúde',exact:true}).click();
      await page.locator('#healthDialog').waitFor({state:'visible'});
      check(await page.locator('#healthActivity option').count()===3, 'saved history also exposes the health handoff');
      await page.locator('#healthDialog').getByRole('button',{name:'Fechar',exact:true}).click();
      check(await page.locator('#historyList').getByRole('button', {name: 'Editar', exact: true}).isVisible(), 'saved workouts can also be edited from history');
      if (process.env.SCREENSHOT_DIR) {
        await mkdir(process.env.SCREENSHOT_DIR, {recursive: true});
        await page.getByRole('button', {name: 'Treinar', exact: true}).click();
        await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, 'treino-mobile.png'), fullPage: true});
      }
    }
    await page.getByRole('button', {name: 'Relatórios', exact: true}).click();
    const button = page.getByRole('button', {name: 'Analisar meu treino', exact: true});
    const result = page.locator('#analysisResults');
    check(await button.isDisabled(), `${width}px: signed-out button disabled`);
    await page.evaluate(() => window.__firebaseTest.switchUser('account-a'));
    if (width === 390) {
      check((await page.locator('#todayWorkout').innerText()).includes('20 kg'), 'cloud sync refreshes today summary with the authenticated history');
      check(await page.locator('#todayWorkout img').count() === 0, 'today summary renders saved exercise names as text');
      await page.getByRole('button', {name: 'Nuvem', exact: true}).click();
      check(await page.locator('#account').isVisible() && await page.locator('#cloudTools').isVisible(), 'cloud tab contains account, sync and import controls');
      check(await page.getByRole('button', {name: 'Importar registros deste aparelho', exact: true}).isVisible(), 'device import is available only inside cloud tab');
      await page.getByRole('button', {name: 'Relatórios', exact: true}).click();
    }
    await button.click();
    await page.waitForFunction(() => document.getElementById('analysisStatus').textContent.includes('concluída'));
    check((await result.innerText()).includes('30 minutos'), `${width}px: real analysis rendered`);
    check(await result.locator('img').count() === 0, `${width}px: exercise names are text, not HTML`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px: no horizontal overflow`);
    check((await button.boundingBox()).height >= 44, `${width}px: accessible touch target`);
    if (process.env.SCREENSHOT_DIR && width === 390) {
      await mkdir(process.env.SCREENSHOT_DIR, {recursive: true});
      await page.screenshot({path: path.join(process.env.SCREENSHOT_DIR, 'analise-mobile.png'), fullPage: true});
    }
    if (width === 390) {
      check(await page.evaluate(() => window.__firebaseTest.writes === 0 && window.__firebaseTest.reads.every(reference => JSON.stringify(reference) === JSON.stringify(['usuarios', 'account-a', 'dados', 'principal']))), 'read-only and restricted to authenticated UID');
      for (const [code, text] of [['permission-denied', 'permissão'], ['unavailable', 'internet'], ['unauthenticated', 'novamente']]) {
        await page.evaluate(value => { window.__firebaseTest.error = value; }, code);
        await button.click();
        await page.waitForFunction(value => document.getElementById('analysisStatus').textContent.includes(value), text);
        check(await result.innerText() === '' && await button.isEnabled(), `error ${code}: clears result and allows retry`);
      }
      await page.evaluate(() => { window.__firebaseTest.error = null; window.__firebaseTest.exists = false; });
      await button.click();
      await page.waitForFunction(() => document.getElementById('analysisStatus').textContent.includes('Nenhum histórico'));
      check(await result.innerText() === '', 'missing document has no successful analysis');
      for (const metadata of [{fromCache: true, hasPendingWrites: false}, {fromCache: false, hasPendingWrites: true}]) {
        await page.evaluate(value => { window.__firebaseTest.exists = true; window.__firebaseTest.metadata = value; }, metadata);
        await button.click();
        await page.waitForFunction(() => document.getElementById('analysisStatus').textContent.includes('Aguarde a sincronização'));
        check(await result.innerText() === '', 'unconfirmed snapshot rejected');
      }
      await page.evaluate(() => { const state = window.__firebaseTest; state.metadata = {fromCache: false, hasPendingWrites: false}; state.hold = true; });
      await button.click();
      check(await button.isDisabled() && await result.getAttribute('aria-busy') === 'true', 'loading feedback and duplicate click prevention');
      await page.evaluate(() => window.__firebaseTest.switchUser('account-b'));
      await page.evaluate(() => { window.__firebaseTest.release(); window.__firebaseTest.hold = false; });
      await page.waitForFunction(() => !document.getElementById('analysisResults').hasAttribute('aria-busy'));
      check(await result.innerText() === '', 'late account-a response discarded after account switch');
      await page.evaluate(() => { window.__firebaseTest.data = {workouts: [], weights: []}; });
      await button.click();
      await page.waitForFunction(() => document.getElementById('analysisStatus').textContent.includes('concluída'));
      check((await result.innerText()).includes('Dados insuficientes'), 'empty new account does not reuse previous history');
      await page.evaluate(() => window.__firebaseTest.switchUser(null));
      check(await result.innerText() === '' && await button.isDisabled(), 'logout clears existing analysis');
      await page.evaluate(() => window.__firebaseTest.switchUser('account-c'));
      await page.evaluate(() => { window.__firebaseTest.hold = true; });
      await button.click();
      await page.evaluate(() => window.__firebaseTest.switchUser(null));
      await page.evaluate(() => { window.__firebaseTest.release(); window.__firebaseTest.hold = false; });
      check(await result.innerText() === '' && await button.isDisabled(), 'logout during read never displays stale history');
      check(await page.evaluate(() => window.__firebaseTest.writes === 0), 'all analysis scenarios perform zero Firestore writes');
      for (const tab of ['Treinar', 'Histórico', 'Backup', 'Nuvem']) {
        await page.getByRole('button', {name: tab, exact: true}).click();
        check(await page.getByRole('button', {name: tab, exact: true}).getAttribute('class') === 'active', `existing tab ${tab} remains usable`);
      }
    }
    check(errors.length === 0, `${width}px: no JavaScript errors: ${errors.join('; ')}`);
    await context.close();
  }
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => !!document.getElementById('exportChatGPT'), {timeout: 30000});
  await page.getByRole('button', {name: 'Relatórios', exact: true}).click();
  check(await page.locator('#analyzeTraining').isDisabled(), 'real Firebase SDK: signed-out analysis disabled');
  check(errors.length === 0, 'real Firebase SDK: no JavaScript errors');
  await context.close();
  console.log(`${checks} browser checks passed`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
