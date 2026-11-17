# PRD do Cuida (MVP)

O Cuida é uma cuidadora virtual para idosos que moram sozinhos, com uma versão para a família acompanhar de longe. Prazo do MVP: Hack Brasil 2026 (entrega até 30/11).

## 1. Visão geral

**O que o Cuida faz e para quem?** O Cuida é uma cuidadora virtual para idosos que moram sozinhos. Ela ajuda o idoso nas tarefas do dia a dia, como lembrar dos remédios, dos exames e fazer o check-in diário. Ao mesmo tempo, mantém a família informada sobre a saúde e a rotina dele, para que ela fique tranquila mesmo de longe.

**Como vamos saber que o MVP funcionou?** O MVP será validado se, durante 5 dias seguidos, o idoso:
- fizer o check-in diário sozinho, sem nenhuma ajuda do familiar; e
- estiver aderente à medicação, ou seja, confirmar pelo menos 90% das doses previstas com até 30 minutos de diferença do horário.

## 2. Usuários

**Idoso típico:** 60 anos ou mais, quer continuar independente e tem pouca familiaridade com tecnologia. A interface precisa ser simples, clara e tolerante a erros.

**Familiar típico:** mora ou trabalha longe do idoso. Quer acompanhar o dia a dia de forma prática, com atualizações diárias, sem precisar ligar ou cobrar o tempo todo.

**Vários familiares e vários idosos:** vários familiares podem acompanhar o mesmo idoso, e um familiar pode acompanhar mais de um idoso (por exemplo, a avó e o avô).

**Papéis no grupo de cuidado de cada idoso:**
- Responsável principal: cadastra o idoso, os remédios, os horários e os exames, e convida os outros familiares. Pode passar esse papel para outra pessoa.
- Acompanhante: vê o painel com check-ins, doses e alertas. Pode deixar recados, mas não muda a rotina de remédios.

**Como os alertas funcionam:**
- Alertas críticos (check-in não feito, dose não confirmada ou sinal de urgência detectado pela Lia) seguem uma escalada: primeiro vão para o responsável principal; se ele não agir em 15 minutos, vão para todos do grupo.
- Alertas de emergência vão para todos do grupo ao mesmo tempo, sem escalada (ver seção 4).
- Resumo diário opcional: fora do MVP.

## 3. Cadastro e vínculo

**Quem cria a conta?** O familiar responsável cria a conta e faz toda a configuração: dados do idoso, remédios, horários e exames. O idoso só usa uma interface simples, sem configurar nada.

**Como os dois perfis se conectam?** Depois de cadastrar o idoso, o responsável gera um link de acesso e manda para ele, por WhatsApp ou SMS. Ao abrir o link, o idoso não entra direto: primeiro vê uma tela de boas-vindas que ensina a instalar o Cuida na tela inicial, com passo a passo para o celular dele:
- iPhone: abrir o link no Safari, tocar em Compartilhar e depois em "Adicionar à Tela de Início".
- Android: tocar no botão "Instalar o Cuida" (ou, no menu do Chrome, "Adicionar à tela inicial").
- Link aberto dentro do WhatsApp: a tela avisa para abrir no Safari (iPhone) ou no Chrome (Android), porque o navegador do WhatsApp não instala apps.

Só depois de instalado o idoso abre o Cuida pelo ícone e faz o primeiro acesso. No iPhone isso é obrigatório: o app instalado não aproveita o login feito no Safari, e as notificações só funcionam com o app instalado.

**O idoso precisa de senha?** Não. No primeiro acesso, já pelo app instalado, aparece um código de verificação (4 números) no app do responsável, que passa o código ao idoso por telefone ou pessoalmente. Depois disso, o idoso fica conectado.

## 4. Check-in diário

- 6 níveis com rostinhos coloridos, do verde (muito bem) ao vermelho (muito mal), inspirados na escala visual de dor. Se o idoso escolher um dos 3 níveis mais baixos, a Lia (assistente de IA) entra na conversa para entender melhor.
- O lembrete chega às 8h; o responsável pode mudar o horário. O check-in é a primeira tela do dia.
- Se o idoso não responder em 15 minutos, o responsável é avisado e pode reenviar o lembrete. Se o responsável não agir em mais 15 minutos, o aviso vai para todos do grupo.
- Se o idoso disser que está mal, a Lia interpreta a resposta e decide se avisa algum familiar, sempre seguindo a escalada.
- Regra de segurança: se o idoso falar em queda, dor no peito, falta de ar ou confusão, todos do grupo são avisados na hora, sem depender da Lia.

## 5. Lembrete de remédio

- O familiar responsável cadastra os remédios. O idoso só recebe os lembretes e confirma.
- Cada remédio tem: nome, dose, horários, cor e formato do comprimido, e foto da caixa.
- No horário, o idoso recebe uma notificação e confirma com um toque ("Tomei"). Se não confirmar em 30 minutos, o responsável é avisado e pode reenviar o lembrete. Se o responsável não agir em mais 15 minutos, o aviso vai para todos do grupo.
- Os 30 minutos são a mesma tolerância da métrica de adesão do MVP.

## 6. Painel do familiar

Ao abrir: último check-in (nível, horário e resumo da conversa com a Lia), remédios do dia (tomados e pendentes), alertas recentes e próximos compromissos.

- Por notificação: alertas críticos e emergências.
- Só no painel: check-ins positivos, doses confirmadas e histórico.

## 7. Exames e consultas

- Foto ou PDF de exames, receitas e pedidos médicos. A Lia lê o documento e sugere data, médico, especialidade, descrição e lembretes. O familiar revisa e confirma.
- De preferência o familiar envia.
- O idoso recebe lembrete de consulta no dia anterior e algumas horas antes. O familiar vê a consulta no painel.

## 8. Fora do MVP

Integração com WhatsApp; parcerias com farmácias, clínicas e planos; pulseiras e relógios; chamada de voz com a Lia; detecção automática de quedas; botão de pânico com ligação para o 192; relatórios para o médico; leitura de bula e interações; resumo diário opcional e troca entre idosos no painel.

## 9. Restrições

- Precisa funcionar na maioria dos celulares. O Cuida será um web app instalável (PWA): roda no navegador, sem loja de apps. Letras grandes, botões grandes e bom contraste.
- Prazo: entrega até 30/11 no Hack Brasil 2026.

### Dados e LGPD

Dados guardados: nome, telefone e data de nascimento do idoso; nome, telefone e e-mail dos familiares; check-ins; conversas com a Lia; remédios, doses e confirmações; exames, receitas e consultas.

Dados de saúde são dados pessoais sensíveis (LGPD art. 5º, II; art. 11): o consentimento precisa ser específico, destacado e por finalidade.

**Como pedir o consentimento:**
1. O consentimento é do idoso (titular). No primeiro acesso, ele vê uma tela simples e concorda com cada finalidade separadamente: guardar como está se sentindo e os remédios; mostrar para a família; conversar com a Lia (IA) sobre a saúde.
2. O familiar consente com os termos dele (dados de contato e sigilo sobre as informações do idoso).
3. O idoso pode mudar de ideia em "Minha privacidade": ver quem acompanha, tirar alguém do grupo ou revogar.

**Dados cadastrados antes do consentimento:** ficam "aguardando consentimento". Só o responsável que cadastrou vê; o resto do grupo não vê e a Lia não processa. Quando o idoso aceita, tudo é liberado conforme as finalidades aceitas. Cadastros posteriores já estão cobertos. Se o idoso recusar uma finalidade, a parte ligada a ela continua bloqueada.

**Boas práticas:** guardar só o necessário (sem CPF, endereço ou plano de saúde no MVP); criptografia nas conversas com a Lia e nos documentos; sem venda ou compartilhamento comercial de dados de saúde; exclusão total ao apagar a conta; política de privacidade curta e simples.

## 10. Telas do MVP

**Idoso (7 telas)**
1. Instalar o Cuida: boas-vindas com o passo a passo para adicionar à tela inicial. Só avança quando o app está instalado.
2. Primeiro acesso: no app instalado, digita o código e permite as notificações.
3. Consentimento: as 3 finalidades, cada uma com seu "Concordo".
4. Check-in diário: "Como você está hoje?" com os 6 rostinhos, antes de qualquer outra tela.
5. Conversa com a Lia: abre quando ele escolhe um dos 3 níveis mais baixos.
6. Início: próximo remédio e próxima consulta em destaque, atalhos e botão "Falar com a Lia".
7. Hora do remédio: foto da caixa, cor e formato do comprimido, dose, botão grande "Tomei" e "Me lembre daqui a 10 minutos".

**Familiar (7 telas)**
1. Login e cadastro: cria a conta e aceita os termos.
2. Cadastrar idoso: nome, telefone e horário do check-in; gera o link e o código de acesso.
3. Painel: último check-in, resumo da Lia, remédios do dia, alertas e próximos compromissos.
4. Remédios: lista e formulário de adicionar/editar (nome, dose, horários, cor, formato e foto da caixa).
5. Exames e consultas: lista e "Enviar documento"; a Lia sugere os dados e o familiar confirma.
6. Alerta: o que aconteceu, a escalada, "Reenviar lembrete", "Ligar para o idoso" e "Já falei com ela, está tudo bem".
7. Grupo de cuidado: quem acompanha, convites, papéis e horário do check-in.

**Visual escolhido (Variação E):** ver docs/design.md.

**Dica para a demo:** deixar os tempos de tolerância e escalada configuráveis para encurtar para 1 minuto na apresentação.
