import {analyzeTraining, renderAnalysis} from './training-analysis.mjs';

export function mountAnalysis({auth, firestore, doc, getDocFromServer, onAuthStateChanged, document, today}) {
  const button = document.getElementById('analyzeTraining');
  const status = document.getElementById('analysisStatus');
  const results = document.getElementById('analysisResults');
  let generation = 0;
  let busy = false;
  const reset = () => {
    generation++;
    busy = false;
    results.replaceChildren();
    results.removeAttribute('aria-busy');
    button.disabled = !auth.currentUser;
    status.textContent = auth.currentUser ? 'Pronto para analisar o histórico salvo na sua conta. Aguarde a sincronização de registros recentes.' : 'Entre com Google para analisar o histórico da sua conta.';
  };
  onAuthStateChanged(auth, reset);
  button.onclick = async () => {
    if (busy) return;
    const user = auth.currentUser;
    if (!user) { reset(); return; }
    const request = ++generation;
    busy = true;
    button.disabled = true;
    results.replaceChildren();
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Lendo seu histórico e preparando a análise…';
    try {
      const snapshot = await getDocFromServer(doc(firestore, 'usuarios', user.uid, 'dados', 'principal'));
      if (request !== generation || auth.currentUser !== user) return;
      if (!snapshot.exists()) throw Error('Nenhum histórico salvo na nuvem desta conta.');
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) throw Error('Aguarde a sincronização dos registros e tente novamente.');
      const result = analyzeTraining(snapshot.data(), today());
      renderAnalysis(results, result);
      status.textContent = 'Análise concluída. Calculada neste aparelho, sem enviar seu histórico a serviços de IA.';
    } catch (error) {
      if (request !== generation || auth.currentUser !== user) return;
      const messages = {
        'permission-denied': 'Sua conta não tem permissão para ler este histórico.',
        unavailable: 'Não foi possível acessar a nuvem. Verifique a internet e tente novamente.',
        unauthenticated: 'Entre novamente com Google para analisar seu treino.'
      };
      status.textContent = messages[error.code] || (error.code ? 'Não foi possível analisar. Tente novamente.' : error.message);
    } finally {
      if (request === generation) {
        busy = false;
        button.disabled = !auth.currentUser;
        results.removeAttribute('aria-busy');
      }
    }
  };
}
