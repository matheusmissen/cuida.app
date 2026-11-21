# Cuida — cuidadora virtual para idosos que moram sozinhos

Este arquivo dá ao Claude Code o contexto do projeto. Leia antes de qualquer tarefa.

## Fontes oficiais

- **`docs/PRD.md`** é a fonte oficial do que o MVP faz: telas, regras de alerta, tempos, cadastro, consentimento (LGPD) e o que fica fora do MVP.
- **`docs/design.md`** é a fonte oficial do visual (Variação E). **Toda tela nova ou ajustada segue `docs/design.md`.**
- Se este arquivo discordar do PRD ou do design, **valem `docs/PRD.md` e `docs/design.md`**.
- A versão anterior do projeto está na etiqueta `v1-antiga`.

## Regra de trabalho no Git

- **Nenhuma mudança vai direto para o `main`**: nada de merge nem push no `main`.
- Cada mudança é feita num ramo próprio, enviada para o GitHub e entra por **pull request**, que o dono do projeto aprova.
- Mudança no Supabase (migration, Edge Function, segredo) só com autorização do dono, **antes do merge** do pull request que depende dela. Quando a ferramenta de migration pedir uma confirmação que não chega, o dono roda o SQL no SQL Editor e depois conferimos pelo banco.

## O que é o Cuida

Um **web app instalável (PWA)**, sem loja de apps, com dois apps ligados ao Supabase:

- **App do idoso:** instalar pelo link, primeiro acesso com código de 4 números, consentimento por finalidade, check-in diário com 6 rostinhos, conversa por voz com a Lia, hora do remédio com "Tomei", próxima consulta, "Preciso de ajuda" e "Minha privacidade".
- **App da família:** cadastro do idoso e dos remédios, conectar o celular do idoso, painel do dia, alertas com escalada, grupo de cuidado, receitas lidas pela IA (conferidas antes de virar alarme), exames, consultas e notificações.

O objetivo do MVP é provar que **o idoso usa sozinho e a família fica sabendo quando algo sai do normal.**

**Fora do MVP (não implementar):** extrair valores de exames e gráficos, checagem de golpe, adicionar contato, WhatsApp integrado, planos pagos, parceiros.

## Stack

- Monorepo: `apps/idoso` e `apps/familia` (Expo, TypeScript, Expo Router, exportados para a web), `packages/regras` (motor de regras), `packages/cliente` (lógica compartilhada dos apps), `packages/visual` (`@cuida/visual`, Variação E) e `supabase/` (migrations, Edge Functions em Deno, testes SQL, script da demo).
- Supabase (projeto `cuida-app`, ref `rumwnbcefunxrybszrry`, São Paulo): Postgres com **RLS em todas as tabelas**, Auth (e-mail para a família; anônimo para o celular do idoso), Storage privado, Edge Functions, pg_cron (a `verificar-doses` roda a cada minuto) e Vault.
- Notificações: **web push** (VAPID, só WebCrypto, `supabase/functions/_shared/webpush.ts`) para os dois apps; alarmes locais do expo-notifications só quando roda como app nativo.
- Voz: transcrição no aparelho (Web Speech API no navegador) e resposta falada; o agente roda na Edge Function `agente` (API da Anthropic, segredo `LLM_API_KEY`).
- Publicado na Vercel: https://cuida-app-familia.vercel.app e https://cuida-app-idoso.vercel.app (Root Directory `apps/idoso` ou `apps/familia`; build em `apps/*/vercel.json`).

## Design (Variação E)

- Tema e componentes em `packages/visual`: cores, fontes (Nunito 800 e Atkinson Hyperlegible), `BotaoPrincipal`, `BotaoSecundario`, `Cartao`, `Quadradinho`, `Campo`, `BarraAbas`, `Rostinho`/`GradeRostinhos`/`SeloRostinho`, `Paisagem`, `DesenhoComprimido` e ícones. Use esses componentes; não copie cores. Ao mudar `packages/visual/src/tema.ts`, mude também `docs/design.md` (o teste `packages/visual/test/tema.test.ts` confere). Conferência visual: `/vitrine` nos dois apps.
- Botões ficam em **uma linha**: textos curtos; o botão diminui a letra se faltar espaço (no idoso, nunca abaixo de 20).
- Todas as telas dos dois apps estão na Variação E. Na família, as telas mais antigas usam `components/ui.tsx` e `lib/tema.ts`, que só repassam os valores de `@cuida/visual` (sem cores próprias); a barra de baixo é a `BarraAbas`. O visual anterior ("Manhã Clara") está só no histórico do Git.

## Regras de interface do app do idoso

- Português do Brasil. Letra mínima de 20, alto contraste, botões de no mínimo 64 px.
- Nenhum menu, nenhuma configuração, nenhum gesto de deslizar (a exceção é "Minha privacidade", exigida pela LGPD). Tudo o mais é configurado pelo app da família.
- Toda resposta da Lia sai em voz e em texto grande. A voz é sempre de português do Brasil, de preferência feminina e natural (`escolherVozDaLia` em `packages/cliente/src/voz.ts`, usada por `apps/idoso/src/lib/voz.ts`); nunca a de Portugal.

## Regras de alerta

**As regras são código determinístico no servidor, nunca decididas pelo LLM.** O LLM só transforma a fala em dados. Se a IA cair, alarmes, check-in com rostinhos, "Preciso de ajuda" e alertas por silêncio continuam. Na dúvida, a regra sobe de nível. Toda regra tem teste.

- **Níveis:** vermelho (emergência: todo o grupo na hora); laranja (alerta crítico: o responsável; se ele não agir em `escalada_min`, todo o grupo de uma vez); amarelo (só no painel); informativo (só histórico).
- **Tempos por paciente** (1 a 240 min, lidos com `temposDoPaciente` em `packages/regras/src/tempos.ts`): `tolerancia_dose_min` (padrão 30), `tolerancia_checkin_min` (15), `escalada_min` (15). "Modo demonstração" em Ajustes = tudo em 1 minuto.
- **Gerais:** "Preciso de ajuda" → vermelho. Dose sem "Tomei" na tolerância → laranja (`dose.nao_confirmada`). Check-in sem resposta → laranja. Rostinho "Muito mal" → laranja (`geral.checkin_muito_mal`). 24 h sem usar o app → vermelho. Queda, dor no peito ou falta de ar → vermelho. A Lia não entendeu 3 vezes → laranja. Humor baixo 3 dias, estoque baixo → amarelo.
- **Leucemia** (limites a validar com o hematologista; febre configurável, padrão 37,8 °C): febre/calafrio ou sangramento → vermelho; manchas roxas, sinais de infecção, cansaço forte 3 dias → laranja; apetite baixo ou náusea 2 dias → amarelo.
- **Resolvem sozinhos** (gatilhos no banco): o "Tomei" resolve o alerta da dose; o check-in resolve o "sem resposta". "Reenviar lembrete" reinicia a contagem da escalada.
- **Consentimento manda em quem é avisado:** sem "mostrar para a família", só o responsável recebe alertas, inclusive emergências (`quemPodeSerAvisado` em `_shared/escala.ts`, a mesma regra de `ve_saude` no banco).

## Agente (Edge Function `agente`)

- Ferramentas: `confirmar_remedio`, `registrar_checkin`, `pedir_ajuda`, `proximos_compromissos`.
- Camadas: o LLM extrai sintomas; a rede de palavras-chave (`agente/sinais.ts`) é mesclada e o mais grave vence; com sinal de alerta e sem registro do LLM (ou com o LLM fora do ar), o servidor registra sozinho; toda resposta passa por `agente/revisao.ts`.
- Limites (no prompt e cobertos por testes): nunca diagnostica nem sugere mudar, parar ou começar remédio; nunca diz que um sintoma "não é nada"; nunca pede senha, dados bancários ou códigos; frases curtas, uma pergunta por vez, tom carinhoso; entende "tô quentinha" = possível febre e "meio caída" = cansaço/humor baixo.
- Sem o consentimento "conversar com a Lia", devolve uma resposta fixa e não chama o LLM.
- **Limite diário de IA** (`_shared/limites.ts`, tabela `uso_ia`, `contar_uso_ia` só para o servidor): 60 mensagens para a Lia por celular e 10 leituras de receita ou pedido por conta da família, por dia. Passou: a Lia responde uma frase fixa (a rede de segurança continua avisando a família) e a leitura volta "limite de leituras de hoje". Ao mudar `limites.ts`, publique `agente` e `ler-receita`.

## Como as partes funcionam (onde está cada coisa)

- **Instalar e primeiro acesso:** a família abre "Conectar o celular" (`apps/familia/src/app/vincular.tsx`): manda o link pelo WhatsApp e mostra o código de 4 números (30 min, uso único). No idoso: `TelaInstalar` → `PrimeiroAcesso` → `TelaConsentimento` → `PedirAvisos`. Banco: `gerar_codigo_vinculo`, `vincular_aparelho` (bloqueia depois de 5 erros em 15 min).
- **Consentimento do idoso** (3 finalidades: `registro`, necessária; `familia`; `lia`): `packages/cliente/src/consentimento.ts`, `registrar_consentimento`, histórico em `consentimentos_historico`, gatilho `_so_o_idoso_consente`. `ve_saude(paciente)` = responsável sempre, acompanhantes só com `familia`; vale nas políticas de remédios, horários, regras, memória, doses, check-ins, alertas, documentos, consultas e fotos.
- **Minha privacidade** (idoso): muda as permissões e mostra "Quem acompanha você" (`grupo_do_idoso`, `idoso_tirar_do_grupo`; tirar o responsável passa o papel ao próximo; a única pessoa não sai).
- **Termos do familiar:** `packages/cliente/src/termos.ts` (`VERSAO_TERMOS`: mudou o texto, troque a versão). Criar conta exige o aceite; contas antigas aceitam uma vez. Banco: `termos_aceitos`, `aceitar_termos`.
- **Apagar minha conta** (família, Ajustes → Sua conta → `app/apagar-conta.tsx`): mostra o que acontece em cada grupo (`resumo_para_apagar_conta`, frases em `packages/cliente/src/conta.ts`) e pede a palavra APAGAR. A Edge Function `apagar-conta` chama `apagar_conta` (só o servidor): sai dos grupos, passa a responsabilidade à próxima pessoa e apaga os pacientes em que era a única (com os arquivos); por último apaga o usuário do Auth. A conta dos jurados (`jurados@example.com`, `CONTA_DEMONSTRACAO` em `conta.ts`) não pode ser apagada: o app não oferece e `apagar_conta` recusa.
- **Grupo de cuidado:** papéis `principal` (responsável) e `apoio` (acompanhante); convites de 6 caracteres; só o responsável muda a rotina de remédios (gatilho `_so_responsavel_muda_remedios`).
- **Check-in diário:** `pacientes.horario_checkin` (padrão 08:00; null desliga). Idoso: `TelaCheckin` com 6 rostinhos antes de tudo; 1–3 a Lia agradece, 4–6 a Lia entra na conversa. Grava pela Edge Function `registrar-checkin` ou, se falhar, por `registrar_rostinho`. Família: `CartaoUltimoCheckin` mostra o rostinho do dia (`checkinDoPainel`).
- **Hora do remédio:** `apps/idoso/src/components/alarme.tsx` (foto da caixa ou desenho do comprimido, "Tomei", "Lembrar em 10 minutos", "Ouvir de novo"). Cor e formato em `packages/cliente/src/comprimido.ts`; fotos no bucket privado `remedios` (`<paciente_id>/caixa-...`; só o responsável envia). Adiar não é tomar: a família continua sendo avisada na tolerância. O adiamento também vai ao servidor (`adiar_dose`, colunas `doses.adiada_ate`/`lembrete_adiado_em`) e a `verificar-doses` manda o lembrete de novo por web push, mesmo com o app fechado (`dosesAdiadasParaLembrar` em `_shared/lembretes.ts`).
- **Alertas da família:** `apps/familia/src/components/tela-alerta.tsx` (o que aconteceu, quem foi avisado, quando o grupo será avisado, "Reenviar lembrete" pela Edge Function `reenviar-lembrete`, "Ligar", "Já falei com..., está tudo bem").
- **Consultas:** tabela `consultas`; família em `app/consultas.tsx` e `CartaoProximaConsulta` no painel; idoso vê a próxima em até 7 dias. Lembretes ao idoso no dia anterior (a partir das 10h) e 3 horas antes (`consultasParaLembrar` em `_shared/lembretes.ts`).
- **Documentos, receitas e pedidos médicos:** tabela `documentos` e bucket privado `documentos`. A Edge Function `ler-receita` lê receitas e pedidos médicos e só transcreve e sugere (`_shared/receita.ts` e `_shared/pedido.ts`); **nunca cria alarmes nem consultas**. Receita: a família confere em "Confira a receita" e `criar_alarmes_da_receita` cria só os itens conferidos. Pedido médico (pedido, guia ou cartão de retorno): a Lia sugere data (escrita ou pelo prazo, como "retorno em 30 dias"), médico, especialidade, local e preparo; a família confere em "Confira o pedido" (`app/documentos/pedido.tsx`) e `conferir_pedido` cria a consulta (ou só guarda); `documentos.consulta_id` liga o pedido à consulta. Exames e relatórios só são guardados.
- **"Preciso de ajuda":** Edge Function `pedir-ajuda` (grava por `pedir_ajuda()` e manda push); se falhar, chama `pedir_ajuda()` direto; sem internet, a tela oferece o SAMU (192) e não diz "família avisada".
- **`verificar-doses`** (pg_cron, a cada minuto; só aceita chave de servidor, `_shared/autorizacao.ts`): gera as doses, cria os alertas de dose e de check-in sem resposta, faz a escalada, o alerta de 24 h de silêncio e manda os lembretes por web push (remédio, remédio adiado, check-in e consultas).
- **PWA:** cada app tem `public/` com `manifest.webmanifest`, ícones e `sw.js` (o mesmo nos dois; ao mudar, troque `VERSAO` e copie para os dois).

## Supabase: operação

- Segredos das Edge Functions: `LLM_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (a pública também está em `packages/cliente/src/notificacoes.ts`; trocar uma exige trocar a outra). O Vault guarda `project_url` e `service_role_key` (a chave secreta nova `sb_secret_...`) para o agendamento.
- Publicar Edge Functions **com os caminhos do repositório** (elas importam `packages/regras`). Funções: `agente`, `verificar-doses`, `registrar-checkin`, `pedir-ajuda`, `reenviar-lembrete`, `ler-receita` e `apagar-conta`. Quem usa `_shared/alertar.ts`: `verificar-doses`, `pedir-ajuda`, `agente` e `registrar-checkin`; ao mudar `alertar.ts` ou `escala.ts`, publique as quatro. Só a `verificar-doses` tem a verificação de JWT desligada.
- Conferir o agendamento: `select status_code, content from net._http_response order by created desc limit 3;`.
- Testes do banco: Postgres 16 local com um esboço de `auth`/`storage`, todas as migrations e `supabase/seed.sql`, depois cada `supabase/tests/*_manual.sql` (cada linha deve sair `t`; blocos "deve dar erro" falham de propósito).

## Demonstração

- Conta dos jurados: `jurados@example.com` (senha só no formulário de envio). `supabase/demo/preparar_demo.sql` apaga e recria a "Dona Maria" dessa conta (remédios, uma semana de histórico, uma consulta, modo demonstração, celular desconectado), põe a acompanhante fictícia "Bruna (neta)" (`bruna.demo@example.com`, sem senha) no grupo, registra as permissões da Dona Maria (`v_ja_consentiu`) e o aceite dos termos. Ao trocar `VERSAO_TERMOS`, troque `v_versao_termos` no script. Rode antes de gravar e antes da avaliação: sem celular conectado, cada remédio vencido vira um alerta.
- **Página para os jurados:** https://cuida-app-familia.vercel.app/demo (`apps/familia/public/demo.html`, rewrite `/demo` em `apps/familia/vercel.json`): os dois apps lado a lado em iframes, com o roteiro; no celular, abas. Não muda os apps nem o banco. O app do idoso não pede para instalar quando está dentro dela (`dentroDeOutraPagina` em `apps/idoso/src/lib/instalacao.ts`); o `sw.js` não guarda `/demo` como página inicial.
- Roteiro do vídeo e passo a passo dos jurados: `docs/demo.md`. Antes de gravar, desligue ou mantenha o modo demonstração de propósito.

## Regras do Hack Brasil (obrigatórias)

- Repositório novo e público (até pelo menos 15/12/2026), criado depois de 04/11/2026 às 21h. Código open source de terceiros só citando a origem no commit.
- **Demo web obrigatória:** os jurados não instalam nada; os dois apps rodam no navegador e ficam publicados até o fim da avaliação.
- **Dados sintéticos:** só dados fictícios no repositório, nos logs, nos testes e no vídeo.
- **Sem segredos no repositório:** chaves só em variáveis de ambiente e nos segredos do Supabase; `.env` no `.gitignore` e `.env.example` só com os nomes. Os apps usam só a chave anon.
- README com problema, como rodar, link da demo, link do vídeo, arquitetura e como testar as regras de alerta.
- **Entrega até 30/11/2026, 23:59. Congelamento:** nenhum commit depois disso até a final.

## Falta (escolha do dono)

- Link do vídeo no README.

## Como trabalhar neste repositório

- Fatias pequenas de ponta a ponta; teste antes da próxima. Lógica pura em `packages/*` ou `_shared/`, com testes (`npm test`); `npm run typecheck` checa os dois apps e as Edge Functions.
- Para ver uma tela: `EXPO_OFFLINE=1` com variáveis falsas, `npx expo export --platform web`, servir `dist/` e fotografar com Playwright (simulando o banco quando precisar). `npx expo install` precisa de `EXPO_OFFLINE=1` neste ambiente.
- Dados de saúde são sensíveis (LGPD): nada de dados reais em seeds, logs ou commits. Antes de cada commit, confira que nenhuma chave ou `.env` entrou no diff.
- Textos de interface em português do Brasil, simples, como se falasse com a família; código e tabelas em português, como estão.
- A tabela `checkins` tem mais campos do que os citados aqui; a migration é a fonte da verdade.
