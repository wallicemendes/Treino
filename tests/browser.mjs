import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const allowed = new Set(['index.html', 'training-analysis.mjs', 'analysis-controller.mjs', 'history-export.mjs']);
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  if (!allowed.has(name)) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
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
    await page.getByRole('button', {name: 'Relatórios', exact: true}).click();
    const button = page.getByRole('button', {name: 'Analisar meu treino', exact: true});
    const result = page.locator('#analysisResults');
    check(await button.isDisabled(), `${width}px: signed-out button disabled`);
    await page.evaluate(() => window.__firebaseTest.switchUser('account-a'));
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
      for (const tab of ['Treinar', 'Histórico', 'Backup']) {
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
