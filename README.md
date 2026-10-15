# Meu Treino — exportação para ChatGPT

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
