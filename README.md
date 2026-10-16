# Meu Treino — registro, análise local e exportação

## Sessão atual e cardio

- Uma sessão nova sempre começa com todos os exercícios desmarcados. Cargas anteriores aparecem somente como referência visual.
- Ao abrir o aplicativo, os treinos já salvos na data atual aparecem em **Treino de hoje — salvo**, com exercícios, cargas, repetições, cardio e observações, sem preencher a nova sessão.
- Alterações ainda não salvas formam um rascunho local identificado na tela e restaurado ao reabrir o app. Salvar ou descartar inicia uma sessão limpa.
- Uma sessão aceita várias atividades de cardio: Esteira, Bicicleta e Escada. Cada item tem duração própria; Esteira também registra velocidade e inclinação.
- Registros novos mantêm `cardio` como total numérico para compatibilidade e adicionam `cardioActivities`. Registros antigos com somente `cardio` continuam no histórico, nas análises e nas exportações sem reescrita destrutiva.

## Analisar meu treino no aplicativo

Entre com Google, aguarde a sincronização e abra **Relatórios → Analisar meu treino**. O botão lê somente `usuarios/{auth.currentUser.uid}/dados/principal` no Firebase já integrado (`meu-treino-583da`). Requer internet para buscar uma versão confirmada no servidor. O cálculo é local, determinístico e gratuito, sem API ou envio a serviços de IA. Nenhuma escrita, restauração, alteração de regras ou autenticação é feita pela análise. Registros locais ainda não sincronizados não entram no resultado.

- Frequência: quatro semanas de calendário, de segunda a domingo, incluindo a semana atual incompleta. Treinos salvos e dias distintos são contados separadamente. Um registro precisa ter exercício com `done === true` ou cardio positivo; exercícios somente planejados não contam como realizados.
- Séries: `sets` é o número planejado e `done` marca o exercício inteiro. A análise mostra separadamente séries planejadas e séries com repetições numéricas informadas nos exercícios feitos. `12,12,10` informa três séries; `12` informa uma. O modelo atual não comprova a conclusão de cada série. Duração, exercícios combinados e texto ambíguo não são convertidos em repetições.
- Evolução: compara os últimos registros em duas datas distintas para cada nome exato de exercício. A variação de carga usa kg por exercício, não por lado. Repetições só são comparadas com carga, meta e número de séries equivalentes. Mudanças de máquina, técnica ou esforço não podem ser inferidas. A sugestão condicional de pequeno incremento exige atingir o topo da mesma meta em todas as séries, em duas datas na mesma carga.
- Cardio: minutos, conforme o campo de registro e o código existente; não há inferência de distância ou intensidade. Zero explícito difere de campo vazio.
- Peso: médias diárias, depois médias de duas janelas consecutivas de sete dias, terminando na última pesagem. São necessários pelo menos dois dias medidos em cada janela. Múltiplas medidas na mesma data são primeiro agrupadas pela média. Pesagens com mais de 14 dias são sinalizadas; variação não é interpretada como gordura ou músculo.

Datas inválidas/futuras e registros malformados são desconsiderados com aviso; campos vazios não viram zero. Histórico vazio, ausência de documento, falta de permissão, rede indisponível e sincronização pendente têm mensagens próprias. O resultado é limpo ao iniciar nova análise, sair ou trocar de conta; respostas atrasadas da conta anterior são descartadas. Não há fallback para o histórico compartilhado do `localStorage`.

### Testar e publicar

Use Node.js 22 ou superior:

```sh
npm test
npm install
npx playwright install chromium
npm run test:browser
```

O teste de navegador serve os arquivos reais por HTTP, simula Firebase apenas nos cenários autenticados e testa também os SDKs reais em sessão sem login. Pode usar `BROWSER_EXECUTABLE` para um Chromium/Edge instalado, `PLAYWRIGHT_MODULE` para uma instalação externa de Playwright e `SCREENSHOT_DIR` para salvar a captura móvel. Não use dados pessoais nos testes.

Em 15/10/2026 passaram 15 testes automatizados de cálculo/regressão e 42 verificações de navegador no Edge, nas larguras 320, 390, 430 e 1280 px. Foram verificados erro/retry, leitura restrita ao UID, ausência de escritas da análise, snapshots não confirmados, troca/saída de conta durante a leitura, limpeza de resultado, nomes de exercícios como texto, ausência de transbordamento horizontal e preservação das abas. A captura móvel foi inspecionada. Trata-se de emulação de viewport móvel; não foi testado em um iPhone físico nem com dados privados de uma conta real.

Para publicar, mantenha `index.html`, `cardio-utils.mjs`, `history-export.mjs`, `training-analysis.mjs` e `analysis-controller.mjs` juntos na raiz servida pelo GitHub Pages. Após publicar na `main`, aguarde o deploy do Pages e confira os arquivos no endereço público. Em uma sessão real, valide **Relatórios → Analisar meu treino** após a sincronização e compare os resultados com seu histórico. Esses passos não exigem alterar regras ou configurações do Firebase.

## Como usar

1. Publique `index.html` e `history-export.mjs` juntos, na mesma pasta do site existente. Sirva por HTTP/HTTPS, não por `file://`.
2. Entre com Google na conta que contém seu histórico e aguarde a sincronização.
3. Abra **Backup → Analisar no ChatGPT → Exportar histórico para ChatGPT**.
4. Salve `meu-treino-chatgpt-AAAA-MM-DD.json`. Revise o conteúdo, incluindo observações, antes de anexá-lo a uma conversa do ChatGPT.
5. Exemplo de pedido: “Analise frequência, evolução das cargas, repetições, cardio e peso corporal. Diferencie exercícios planejados e realizados; não invente dados ausentes.”

A exportação exige internet e usa a sessão Firebase Auth existente. Não requer credencial da OpenAI nem configuração de backend.

## Dados e segurança

O código existente usa o projeto `meu-treino-583da`, login Google e o documento `usuarios/{uid}/dados/principal`, no Firestore padrão. Esse é o único documento usado pelo aplicativo para armazenar os arrays `workouts` e `weights`; outros documentos e contas não são consultados.

O botão faz uma leitura `getDocFromServer` com o UID obtido de `auth.currentUser`. Verifica novamente a identidade da sessão antes de gerar o arquivo e rejeita snapshots em cache ou com escritas pendentes. Não usa o histórico compartilhado do `localStorage` para esta exportação. Não chama `persist`, `setDoc`, transações, importações ou APIs do ChatGPT. Registros locais ainda não sincronizados não entram no arquivo.

O JSON contém somente campos permitidos: data e tipo de treino, exercícios, séries e metas planejadas, indicador de realização, carga, repetições, minutos de cardio, observações e pesos corporais. Valores vazios, zeros e textos originais são preservados. UID, e-mail, identificadores dos registros, tokens, configuração Firebase e campos desconhecidos não são copiados. Texto livre pode conter informações pessoais inseridas pelo usuário; revise antes de compartilhar.

As regras do Firestore e a autenticação existentes continuam sendo aplicadas. Nenhuma regra ou configuração de autenticação é alterada. A configuração web Firebase já presente no app é mantida; nenhuma credencial administrativa é adicionada.

## Verificação manual em ambiente autenticado

- Exporte com uma conta que tenha histórico e compare contagens e campos com seus registros salvos na nuvem.
- Sem login, o botão deve ficar desabilitado. Ao sair ou trocar de conta durante a leitura, não deve baixar o histórico da sessão anterior.
- Sem internet, sem permissão ou sem documento, deve apresentar mensagem sem baixar um arquivo de sucesso.
- Uma conta com arrays vazios deve gerar um JSON válido com arrays vazios.
- Confirme que a exportação só faz leitura e download; não restaura nem importa registros.

A validação com dados simulados não substitui o teste de login e das regras de produção em uma sessão do usuário.

## Validação desta implementação

Em 15/10/2026, passaram 15 verificações automatizadas executando o módulo real da página com dependências Firebase simuladas: caminho restrito ao UID atual, preservação de campos e registros, exclusão de campos não permitidos, download e limpeza do Blob, ausência de login, permissão negada, falta de rede, autenticação expirada, documento inexistente, arrays vazios, dados malformados, snapshots não confirmados e troca/saída de sessão durante a leitura. Nenhuma escrita Firestore ou localStorage foi feita nesses testes.

Também passou o teste em Microsoft Edge headless, viewport móvel de 390 × 844, com os módulos reais do Firebase carregados pela rede: aba Backup, botão desabilitado sem login, orientação para entrar, ausência de erros JavaScript e de transbordamento horizontal.

A CLI autenticada confirmou o projeto e a instância Firestore `(default)`, edição Standard. Não foi executado download de dados reais com uma sessão Firebase Auth de usuário no navegador, nem auditoria das regras de produção. Os testes acima verificam a implementação; a publicação do site deve ser validada separadamente no GitHub Pages.
