# Meu Treino — registro, análise local e exportação

## Fichas Upper/Lower com bi-sets — 27/10/2026

Novas sessões usam a versão `upper-lower-5dias-maquina-livre-v2-2026-10`. Segunda A, quarta C e sexta E treinam superiores; terça B e quinta D, inferiores. Sábado e domingo são dias de recuperação. A/B/D/E têm oito exercícios, C tem nove. Em TODOS os bi-sets, o primeiro exercício usa máquina ou polia e o segundo usa apenas halteres ou peso corporal. Não há pares de duas máquinas nem pares de dois exercícios livres nas fichas novas. Os bi-sets têm duas rodadas; o volume foi ajustado para acomodar os acréscimos. Reserve 5 min para aquecimento, até aproximadamente 60 min para musculação (incluindo aproximação e transições) e 25 min para cardio moderado. Encerre os acessórios ao atingir 60 min, registrando apenas o realizado.

| Dia | Séries separadas, nesta ordem | Bi-sets de acessórios, nesta ordem |
| --- | --- | --- |
| A | Supino máquina 3×10–12; Puxada articulada 3×10–12; Remada máquina neutra 2×10–12; Desenvolvimento máquina 2×10–12 | 2 rodadas: Tríceps corda 10–15 + Elevação lateral com halteres 10–15; 2 rodadas: Rosca direta polia 10–15 + Tríceps francês com halter 10–15 |
| B | Leg Press 45° 3×10–12; Cadeira flexora 3×10–12 | 2 rodadas: Cadeira extensora 12–15 + Prancha solo 20–40 s; 2 rodadas: Cadeira abdutora 12–15 + Abdominal dead bug 8–10 por lado; 2 rodadas: Panturrilha em pé 15–20 + Prancha lateral 20–30 s por lado |
| C | Supino inclinado articulado 3×10–12; Puxada triângulo 3×10–12; Remada máquina neutra 2×10–12 | 2 rodadas: Crucifixo máquina 12–15 + Crucifixo inverso com halteres 12–15; 2 rodadas: Rosca direta polia 10–15 + Elevação lateral com halteres 10–15; 2 rodadas: Tríceps pulley 10–15 + Rosca alternada com halteres 10–12 por lado |
| D | Agachamento Hack 3×10–12; Leg Press 45° 3×10–12; Mesa flexora 3×10–12; ao final Bird dog 2×8–10 por lado | 2 rodadas: Cadeira adutora 12–15 + Prancha lateral 20–30 s por lado; 2 rodadas: Panturrilha no Leg Press 15–20 + Abdominal curto solo 15–20 |
| E | Supino máquina 2×10–12; Puxada articulada 2×10–12; Remada máquina neutra 2×10–12; Desenvolvimento máquina 2×10–12 | 2 rodadas: Tríceps corda 10–15 + Rosca martelo 10–15; 2 rodadas: Crucifixo máquina 12–15 + Crucifixo inverso com halteres 12–15 |

Descanse 90–120 s nos compostos (até 180 s quando necessário), 60–90 s nos acessórios separados e 90–120 s após cada par. Entre os exercícios do bi-set, use o tempo de troca, cerca de 15–30 s. Se a técnica, as repetições ou o fôlego piorarem, aumente o descanso. Se os aparelhos estiverem ocupados, faça séries separadas.

Na tela, cada bi-set é um bloco com **PRIMEIRO exercício** e **SEGUNDO exercício** e registros independentes. Faça uma série de cada, descanse e repita a rodada. Os parceiros livres têm dicas de equipamento e execução; nomes históricos não são renomeados. Comece com 2–3 repetições em reserva. A combinação extensora + agachamento foi retirada da ficha nova para reduzir sobreposição local: extensora agora é pareada com prancha. Metas “cada lado” não devem ser somadas nem tratadas como repetições bilaterais pela análise. Exercícios por tempo têm rótulo próprio em segundos.

Rascunhos existentes mantêm a ficha e a versão em que foram iniciados. O app avisa quando o rascunho é anterior: salve-o ou descarte-o conscientemente para iniciar a nova ficha. A atualização não troca os exercícios dentro de registros salvos.

As cargas anteriores são consultadas pelo nome exato e pela data mais recente até a data da sessão, sem preencher os campos da nova sessão. Comece a adaptação com 2–3 repetições em reserva. Atingir o topo da faixa em todas as séries, com técnica e 1–2 repetições em reserva em duas sessões, permite tentar o menor incremento disponível (~2–5%). Reduza um incremento se ficar abaixo da faixa. Para prancha, progrida a duração até 40 s. Cargas de exercícios sem registro precisam ser calibradas; a carga do antigo exercício combinado de braços não é transferida aos dois exercícios novos.

Pesquisa revisada em 27/10/2026: [Jeff Nippard](https://www.youtube.com/watch?v=McXybGnPFvg) apresenta supersets separados como ferramenta de economia de tempo; [Menno Henselmans](https://mennohenselmans.com/this-is-the-most-time-efficient-training-technique/) destaca pouca sobreposição muscular, recuperação do fôlego e logística; [Eric Helms, em demonstração no canal oficial RP](https://www.youtube.com/watch?v=Rqla2dZslfo), mostra pares de puxar/empurrar e progressão. São princípios de organização, não fichas desses profissionais copiadas para o usuário.

A [meta-análise de 2025](https://doi.org/10.1007/s40279-025-02176-8), com 19 estudos e 313 participantes, encontrou economia de tempo e adaptações semelhantes em média, com maior esforço percebido; pares de movimentos semelhantes comprometeram mais a carga-volume. Não há justificativa para prometer mais hipertrofia apenas por usar bi-set. Os pares acima são uma adaptação prática à exigência máquina/polia + halteres/solo, mantendo compostos primeiro e cargas individuais. Duração e resposta individual variam.

### Compatibilidade e dados

A suíte verifica pares máquina/polia + exercício livre em A–E, preservação de registros e rascunhos antigos, cardio, exportação e análise. A integração com Saúde/Atalhos e a estimativa de calorias da musculação foram removidas. O app não envia dados ao Saúde. Firebase autenticado é simulado nos testes; dados de produção não são alterados.

Não há migração nem escrita no Firestore ao abrir as novas fichas. Nomes existentes permanecem idênticos. O exercício histórico `Rosca direta polia + tríceps pulley` continua nos registros e gráficos; somente novas sessões C passam a registrar os dois braços separadamente.

Editar um registro usa os exercícios, séries e metas daquele registro, inclusive após recarregar o rascunho, preservando campos adicionais. O seletor de dia fica bloqueado durante a edição. Novas sessões acrescentam registros. Rascunhos anteriores à atualização mantêm os exercícios e usam as prescrições antigas quando séries e metas ainda não estavam no rascunho.

Novos registros adicionam `planVersion` e os exercícios pareados adicionam `biset` (identificador local à sessão). A exportação schemaVersion 2 aceita esses campos opcionais e mantém os campos existentes; a análise continua agrupando pelo nome exato. Não publique exportações pessoais no repositório.

## Sessão atual e cardio

- Uma sessão nova sempre começa com todos os exercícios desmarcados. Cargas anteriores aparecem somente como referência visual.
- Ao abrir o aplicativo, os treinos já salvos na data atual aparecem em **Treino de hoje — salvo**, com exercícios, cargas, repetições, cardio e observações, sem preencher a nova sessão.
- O botão **Editar** no resumo de hoje e no Histórico carrega o registro salvo no formulário, preserva a edição como rascunho e atualiza o mesmo treino sem criar duplicata.
- Alterações ainda não salvas formam um rascunho local identificado na tela e restaurado ao reabrir o app. Salvar ou descartar inicia uma sessão limpa.
- Uma sessão aceita várias atividades de cardio: Esteira, Bicicleta e Escada. Cada item tem duração própria; Esteira também registra velocidade e inclinação.
- Cada atividade permite informar opcionalmente distância em km e calorias em kcal, copiadas do aparelho ou relógio. Esses valores não são estimados pelo app. Campos vazios permanecem ausentes; zero explícito é preservado. Valores negativos ou fora dos limites (1000 km e 100000 kcal por atividade) impedem salvar.
- Distância e calorias acompanham o rascunho, a edição, o resumo do dia, o histórico, o backup e a exportação para ChatGPT. São os campos opcionais `distance` e `calories` em `cardioActivities`; registros antigos não recebem valores inventados e não são migrados.
- Registros novos mantêm `cardio` como total numérico para compatibilidade e adicionam `cardioActivities`. Registros antigos com somente `cardio` continuam no histórico, nas análises e nas exportações sem reescrita destrutiva.
- Login, status de sincronização, importação deste aparelho e atualização manual ficam reunidos na aba **Nuvem**, fora da tela de treino.

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

Para publicar, mantenha `index.html`, `cardio-utils.mjs`, `history-export.mjs`, `training-analysis.mjs` e `analysis-controller.mjs` juntos na raiz servida pelo GitHub Pages. Após publicar na `main`, aguarde o deploy e confira a versão pública. Em uma sessão real, valide **Relatórios → Analisar meu treino** após a sincronização. Não é necessário alterar regras ou configurações do Firebase.

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
