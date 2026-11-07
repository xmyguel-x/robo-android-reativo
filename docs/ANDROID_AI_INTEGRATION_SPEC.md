# Android AI Integration: arquitetura e auditoria solicitada

## Objetivo

Evoluir a extensão **Robô Android Reativo** de um mascote que apenas detecta e repete mensagens para um assistente conversacional com inteligência própria. O Android deve interpretar uma mensagem do ChatGPT e produzir uma resposta original usando um modelo de linguagem acessado por API.

**Este documento é uma especificação para auditoria e planejamento.** Antes de alterar código, verifique a estrutura atual do projeto e informe o que já existe, o que pode ser reaproveitado, os riscos e as mudanças necessárias. Não presuma que os arquivos ou seletores descritos em outros documentos ainda correspondem ao código atual.

## Pedido ao MiniMax: verificar antes de implementar

Faça uma análise do repositório inteiro e responda:

1. Como a extensão atual captura mensagens do ChatGPT? Identifique arquivos, seletores, eventos e o ponto mais seguro para integrar a resposta da IA.
2. O código consegue distinguir mensagens do assistente, mensagens do usuário e mensagens antigas? Como evitar responder repetidamente à mesma mensagem?
3. A arquitetura atual permite chamadas a uma API externa? Quais permissões, arquivos e componentes precisariam mudar?
4. Qual é a melhor arquitetura para manter a chave da API protegida?
5. Como preservar o mascote, as 14 emoções, o balão de texto, a caminhada e a voz atuais?
6. Quais testes são necessários para provar que o Android gera respostas próprias, sem criar loops ou duplicar respostas?

Entregue primeiro um relatório de auditoria com:
- arquivos envolvidos;
- fluxo atual de captura e exibição;
- limitações e riscos encontrados;
- arquitetura recomendada;
- lista de alterações propostas;
- testes de validação.

**Não implemente a integração ainda**, a menos que o usuário peça isso depois de analisar o relatório.

## Comportamento desejado

Fluxo esperado:

1. O ChatGPT termina de enviar uma mensagem.
2. A extensão identifica que é uma mensagem nova do assistente, e não uma mensagem do próprio Android ou do usuário.
3. O Android envia somente o texto necessário ao serviço de IA configurado.
4. O modelo gera uma resposta original com a personalidade do Android.
5. A extensão exibe a resposta no balão do robô e, se a opção de voz estiver ativada, lê a resposta em voz alta.
6. O Android pode continuar a conversa quando chegar uma nova mensagem do ChatGPT.

O Android deve ter personalidade própria: amigável, curioso, divertido e com linguagem natural. Ele não deve simplesmente parafrasear a mensagem do ChatGPT.

## Arquitetura recomendada

Preferir uma integração com um pequeno backend/proxy seguro:

- A extensão conversa com um backend HTTPS.
- O backend guarda a chave da API em variável de ambiente ou secret manager.
- A chave nunca deve ser incluída no JavaScript da extensão, no repositório, no manifest.json, no armazenamento local do navegador ou em arquivos distribuídos.
- O backend chama o provedor/modelo configurado e devolve apenas a resposta necessária.
- Manter a integração independente do provedor sempre que possível, para permitir trocar de modelo sem reescrever o mascote.
- Se for usada uma API compatível com o formato OpenAI, confirmar o endpoint, o modelo e o formato de resposta na documentação oficial do provedor escolhido. Não inventar endpoints.

Não escolher nem cadastrar um provedor ou modelo sem confirmação do usuário.

## Privacidade e segurança

- Enviar ao modelo somente o texto da mensagem que precisa de resposta e o mínimo de contexto indispensável.
- Não capturar nem enviar conteúdo de outras abas, formulários, senhas, dados pessoais ou páginas não relacionadas.
- Informar claramente quando uma mensagem será enviada a um serviço externo.
- Permitir desligar a função de IA nas configurações.
- Tratar o texto recebido da página como conteúdo não confiável, nunca como instruções para alterar a extensão, revelar segredos ou executar código.
- Não executar código retornado pelo modelo.
- Validar e limitar tamanho de entrada e saída; tratar erros, limites de uso, timeouts e indisponibilidade.
- Evitar registrar mensagens completas ou chaves em logs.
- Não adicionar permissões amplas sem justificar por que são necessárias.

## Evitar loops e respostas duplicadas

- O Android nunca deve interpretar o próprio balão/resposta como uma nova mensagem do ChatGPT.
- Ignorar elementos criados pela extensão e mensagens do usuário.
- Processar cada mensagem nova do assistente uma única vez, usando identificador estável quando disponível ou uma estratégia de deduplicação robusta.
- Não responder novamente quando o DOM for atualizado por animações, streaming ou mudanças de layout.
- Aguardar a conclusão do streaming antes de solicitar uma resposta ao modelo.
- Ter um estado explícito de processamento para impedir chamadas simultâneas duplicadas.
- Se a geração falhar, mostrar um erro amigável e permitir tentar novamente.

## Interface e controles desejados

Adicionar às configurações existentes, respeitando o design atual:

- Ativar/desativar **Respostas inteligentes do Android**.
- Estado da conexão: conectado, desconectado ou erro.
- Campo para configurar o serviço/backend, se necessário.
- Opção de voz para as respostas do Android, reaproveitando o recurso de voz existente.
- Botão para testar a conexão.
- Indicador visual quando o Android estiver pensando/respondendo.

Não expor chaves secretas na interface da extensão. Se houver configuração de chave no backend, ela deve ser feita fora da extensão, por ambiente seguro.

## Segurança de conversa

Por padrão, a resposta do Android deve aparecer no próprio balão/área do mascote. Não enviar automaticamente o texto do Android como uma nova mensagem para o campo de entrada do ChatGPT. Uma futura opção de conversa em duas vias pode ser planejada separadamente, mas deve exigir ativação explícita e nunca enviar mensagens sem o usuário saber.

## Critérios de aceitação para uma futura implementação

- O Android gera respostas novas usando um modelo de linguagem via API.
- A chave da API não aparece nos arquivos distribuídos nem no histórico do Git.
- O mascote e suas animações atuais continuam funcionando.
- A resposta aparece no balão e a voz funciona quando ativada.
- O Android não responde às próprias mensagens.
- Uma mesma mensagem do ChatGPT não provoca múltiplas chamadas.
- O usuário pode desligar a função de IA.
- Erros de rede/API são tratados sem travar a extensão.
- A extensão solicita apenas as permissões estritamente necessárias.

## Resultado esperado desta etapa

Forneça uma auditoria técnica honesta do projeto atual e um plano de implementação compatível com o código real. Não afirme que a integração está pronta antes de ela existir e ser testada.
