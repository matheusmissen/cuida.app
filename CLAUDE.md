# Cuida — MVP do app de cuidado para idosos que moram sozinhos

Este arquivo dá ao Claude Code o contexto do projeto. Leia antes de qualquer tarefa.

## Fontes oficiais (a partir de 17/11/2026)

- **`docs/PRD.md`** é a fonte oficial do que o MVP faz: telas, regras de alerta, tempos, cadastro, consentimento (LGPD) e o que fica fora do MVP. O Cuida passa a ser um **web app instalável (PWA)**, sem loja de apps.
- **`docs/design.md`** é a fonte oficial do visual (Variação E). **Toda tela nova ou ajustada segue `docs/design.md`.**
- Se este arquivo discordar do PRD ou do design, **valem `docs/PRD.md` e `docs/design.md`**. O restante deste arquivo descreve a versão anterior (guardada na etiqueta `v1-antiga`) e será atualizado aos poucos, conforme as etapas do novo plano forem entregues.

## Regra de trabalho no Git

- **Nenhuma mudança vai direto para o `main`**: nada de merge nem push no `main`.
- Cada mudança é feita num ramo próprio, enviada para o GitHub e entra por **pull request**, que o dono do projeto aprova.

## O que estamos construindo

Dois apps ligados a um backend:

- **App do idoso** (Expo): uma tela, um botão grande de voz, alarme de remédio em tela cheia com botão "Tomei", check-in diário por voz e botão "Preciso de ajuda".
- **App da família** (Expo): cadastro do paciente e dos remédios, regras de alerta, painel do dia e recebimento de alertas por push.

O primeiro usuário real é uma idosa que mora sozinha e trata leucemia. O objetivo do MVP é provar que **o idoso usa sozinho e a família fica sabendo quando algo sai do normal.**

## Escopo do MVP (só isto)

1. Lembrete de remédio com confirmação "Tomei" e aviso à família se não confirmar.
2. Check-in diário por voz, com regras de alerta (inclui o modelo de leucemia).
3. Alertas para a família por push, botão "Preciso de ajuda" e alerta por silêncio de 24 h.
4. Documentos no app da família (decidido em 16/11): receitas lidas por IA a partir da foto, que sugerem remédios e horários para a família **conferir antes** de criar os alarmes; exames e relatórios médicos guardados (foto ou PDF, data, lista), sem leitura por IA.

**Fora do MVP (não implementar ainda):** extrair valores de exames e gráficos, checagem de golpe, adicionar contato, WhatsApp, planos pagos, parceiros.

## Stack

- Monorepo com `apps/idoso`, `apps/familia` (Expo, TypeScript, Expo Router) e `supabase/` (migrations, Edge Functions).
- Supabase: Postgres, Auth, Storage, Edge Functions, pg_cron. Região São Paulo. Row Level Security em todas as tabelas.
- Notificações: expo-notifications (locais para alarmes, push para alertas). Usar build de desenvolvimento EAS, não Expo Go.
- Voz: transcrição no aparelho (reconhecimento de fala do sistema; na web, Web Speech API) e resposta falada com expo-speech. O agente roda na Edge Function `agente`; não há serviço de transcrição no servidor.
- LLM com tool calling para o agente. Chaves de API só em variáveis de ambiente do servidor, nunca no app.

## Design

**Visual oficial: Variação E, em `docs/design.md`.** Toda tela nova ou ajustada segue esse guia.

O tema e os componentes base da Variação E ficam em `packages/visual` (`@cuida/visual`): cores, fontes (Nunito 800 e Atkinson Hyperlegible, já carregadas no `_layout` dos dois apps), raios, alturas, `BotaoPrincipal`, `BotaoSecundario`, `Cartao`, `Quadradinho`, `Campo`, `BarraAbas`, `Rostinho`/`GradeRostinhos` e `Paisagem` (dia/noite pela hora do aparelho). Use esses componentes nas telas novas; não copie cores. Ao mudar um valor em `packages/visual/src/tema.ts`, mude também `docs/design.md` (o teste `packages/visual/test/tema.test.ts` confere). Página de conferência: `/vitrine` no app do idoso.

Versão anterior (ainda aplicada nas telas existentes, até serem refeitas): "Manhã Clara". Siga `docs/design/README.md` e `docs/design/tokens.json`; as telas de referência estão em `docs/design/telas/` (HTML só para consulta, não importar nos apps).

## Regras de interface do app do idoso

- Interface em português do Brasil. Letra mínima de 20 pt, alto contraste, botões de no mínimo 64 px.
- Nenhum menu, nenhuma configuração, nenhum gesto de deslizar. Tudo é configurado pelo app da família.
- Toda resposta da assistente sai em voz e em texto grande.
- Nome da assistente: Lia (configurável depois).

## Modelo de dados

| Tabela | Campos principais |
| --- | --- |
| pacientes | id, nome, apelido, data_nascimento, condicoes[], medico_contato, consentimento_em |
| cuidadores | id, usuario_id, paciente_id, papel (principal, apoio), ordem_escala, expo_push_token |
| remedios | id, paciente_id, nome, dose, foto_url, critico, estoque_doses |
| horarios | id, remedio_id, hora, dias_semana |
| doses | id, horario_id, previsto_em, confirmado_em, status (pendente, tomado, perdido) |
| checkins | id, paciente_id, feito_em, febre, temperatura, sangramento, manchas, cansaco, humor, sono, notas, audio_url |
| regras | id, paciente_id, gatilho, condicao (jsonb), nivel, ativa |
| alertas | id, paciente_id, regra_id, nivel, motivo, criado_em, avisados[], visto_por, visto_em |
| memoria_paciente | id, paciente_id, chave, valor |

O app do idoso faz login uma vez por QR code gerado no app da família (vincula o aparelho ao paciente).

## Regras de alerta

**As regras são código determinístico no servidor, nunca decididas pelo LLM.** O LLM só transforma a fala em dados estruturados. Se a IA cair, alarmes e alertas por silêncio continuam funcionando. Na dúvida, a regra sobe de nível.

Níveis: vermelho (todo o círculo na hora), laranja (responsável principal; sem resposta em 30 min, o próximo da escala), amarelo (resumo diário), informativo (só histórico).

Regras gerais:
- Botão "Preciso de ajuda" → vermelho.
- Dose sem confirmação: novo alarme aos 30 min; alerta laranja aos 60 min (vermelho se o remédio for crítico).
- Check-in sem resposta após 2 tentativas em 1 h → laranja.
- Nenhuma interação com o app em 24 h → vermelho.
- Queda, dor no peito ou falta de ar relatadas → vermelho.
- Humor baixo 3 dias seguidos → amarelo. Estoque abaixo de 5 dias → amarelo.

Modelo leucemia (limites a validar com o hematologista; devem ser configuráveis por paciente):
- Febre (temperatura ≥ limite configurado, padrão 37,8 °C) ou relato de febre/calafrio → vermelho.
- Sangramento (gengiva, nariz, urina, fezes) → vermelho.
- Manchas roxas novas → laranja. Sinais de infecção → laranja.
- Cansaço forte 3 dias seguidos → laranja. Falta de apetite ou náusea 2 dias seguidos → amarelo.

## Agente (Edge Function `agente`)

Ferramentas do MVP: `confirmar_remedio`, `registrar_checkin`, `pedir_ajuda`, `proximos_compromissos`.

Limites obrigatórios no prompt de sistema e cobertos por testes:
- Nunca diagnostica, nunca sugere mudar, parar ou começar remédio.
- Nunca diz que um sintoma "não é nada"; sintomas da lista de alerta sempre viram registro.
- Nunca pede senha, dados bancários ou códigos.
- Frases curtas, uma pergunta por vez, tom carinhoso, sem jargão médico.
- Entende linguagem coloquial: "tô quentinha" = possível febre; "meio caída" = cansaço/humor baixo.
- Não entendeu três vezes seguidas → avisa a família.

## Documentos e leitura de receita

- Tabela `documentos` (tipo `receita` | `exame` | `relatorio`) e bucket privado `documentos` no Storage, com arquivos em `<paciente_id>/<arquivo>`; só cuidadores do paciente leem e enviam.
- Edge Function `ler-receita`: recebe `{ documento_id }` com o token do cuidador, lê a imagem com a API da Anthropic (visão) e grava a leitura em `documentos.leitura` com status `aguardando_conferencia`. **Nunca cria alarmes.** A normalização (horários sugeridos, itens que precisam de revisão) é lógica pura em `_shared/receita.ts`, com testes.
- A família confere e edita na tela "Confira a receita"; ao confirmar, o app chama `criar_alarmes_da_receita(p_documento, p_itens)`, que cria `remedios` e `horarios` só dos itens enviados e marca o documento como `conferida`.
- Na dúvida, o item fica marcado "Precisa de você" e não entra nos alarmes até a família definir os horários.

## Cronograma (entrega no Hack Brasil em 30/11/2026, 23:59)

| Datas | Entrega |
| --- | --- |
| 16–17/11 | Repositório público novo, Supabase, monorepo Expo |
| 18–21/11 | Cadastro da família, remédios, alarme com "Tomei", aviso de dose perdida |
| 22–25/11 | Check-in por voz, agente, regras de alerta com testes, push para a família |
| 26–27/11 | Botão de ajuda, versão web publicada (Vercel), paciente sintética no banco |
| 28/11 | Vídeo de até 3 minutos e README |
| 29/11 | Folga para bugs |
| 30/11 | Envio pela manhã |

Fluxo que a demo precisa mostrar: alarme → "Tomei" → check-in dizendo "tô quentinha" → alerta vermelho no app da família.

Se apertar, cortar primeiro o alerta por silêncio de 24 h e o painel do dia completo.

## Regras do Hack Brasil (obrigatórias)

- **Repositório novo e público**, criado depois de 04/11/2026 às 21h, com todos os commits depois disso. Não copiar código privado anterior ao evento. Código open source público pode ser usado, citando a origem na mensagem do commit.
- **Demo web obrigatória:** os jurados não instalam nada. Os dois apps precisam rodar no navegador (Expo web) e ficar publicados (Vercel) até o fim da avaliação. Funções só nativas (alarme em tela cheia, agenda) devem degradar com elegância na web: mostrar o alarme como modal na própria página.
- **Dados sintéticos:** projetos de saúde só podem usar dados fictícios. Criar um seed com uma paciente fictícia (por exemplo, "Dona Maria", 78 anos, leucemia), remédios, check-ins e alertas de exemplo. Nunca dados reais no repositório, nos logs ou no vídeo.
- **Sem segredos no repositório:** chaves do Supabase (service role), do LLM e da transcrição só em variáveis de ambiente. `.env` no `.gitignore` e um `.env.example` com os nomes das variáveis. O app só usa a chave anon do Supabase.
- **Congelamento:** nenhum commit depois de 30/11 às 23:59 até a final.
- **README** com: problema, como rodar, link da demo, link do vídeo, arquitetura e como testar as regras de alerta.
- Repositório público pelo menos até 15/12/2026.

## Estado atual (etapas 18–21/11 e 22–25/11 concluídas; 26–27/11 em andamento)

Pronto e testado:
- `packages/regras`: motor de regras de alerta em TypeScript puro, sem dependências, com 36 testes. Use estas funções nas Edge Functions; não reimplemente as regras.
- `packages/cliente`: cliente Supabase (só chave anon), tipos das tabelas e utilitários de doses (usam `avaliarDose`), com testes.
- `supabase/migrations`: esquema com RLS; `criar_paciente`, `gerar_codigo_vinculo`, `vincular_aparelho`, `registrar_interacao`, `gerar_doses_dia`, `gerar_doses_hoje`, `confirmar_dose`; realtime de alertas/doses; pg_cron (URL e chave no Vault). Validado em Postgres 16 com `supabase/tests/rls_manual.sql` e `doses_manual.sql`.
- `supabase/functions/verificar-doses`: realarme (30 min), alerta de dose perdida (60 min), escala laranja e push. Lógica pura em `_shared/` com testes em Node (`npm test`). `_shared/alertar.ts` (`criarEAvisar`) deve ser reutilizado pelas próximas funções.
- `supabase/functions/verificar-doses` também cria o alerta vermelho de silêncio de 24 h (`_shared/silencio.ts`, usa `avaliarSilencio`).
- `supabase/functions/agente`: conversa com a Lia (API da Anthropic, segredo `LLM_API_KEY`). Entrada `POST { texto, historico?: [{ papel: 'idoso' | 'lia', texto }] }` com o token do aparelho do idoso; saída `{ resposta, alertas }`. Usa `avaliarCheckin` + `criarEAvisar`, rede de palavras-chave (`agente/sinais.ts`) mesclada ao LLM, registro automático se o LLM falhar e revisão das respostas (`agente/revisao.ts`). `confirmar_remedio` chama `confirmar_dose` com o token do idoso. Três pedidos de repetição seguidos da Lia geram alerta laranja (`agente/entendimento.ts` + `avaliarNaoEntendeu`).
- `apps/familia`: login por e-mail, cadastro do paciente com consentimento, remédios/horários, QR de vínculo, painel do dia com alertas em tempo real.
- `apps/idoso`: login anônimo + vínculo por código/QR, tela única, alarme em tela cheia com "Tomei" e voz (expo-speech), alarmes locais no celular; na web o alarme é um modal.
- `apps/idoso` (22–25/11): botão "Falar com a Lia"; transcrição no aparelho (expo-speech-recognition, prefere on-device; na web, Web Speech API; sem reconhecimento, campo de texto grande); chama a Edge Function `agente` com `{ texto, historico }` (últimas 12 falas) e mostra/fala a resposta. Lógica pura em `packages/cliente/src/conversa.ts`, com testes.
- `npm test` roda todos os testes; `npm run typecheck` checa os dois apps.

- Check-in diário (22–25/11): `pacientes.horario_checkin` (padrão 09:00, null desliga). `situacaoDoCheckin` em `packages/regras/src/checkin.ts` decide as tentativas (no horário e 30 min depois) e o alerta laranja de "sem resposta" 1 h depois (`avaliarCheckinSemResposta`); `verificar-doses` cria o alerta uma vez por dia (`_shared/checkin.ts`). No `apps/idoso`, a Lia puxa a conversa no horário (frase guardada no histórico do agente), o botão vira "Responder à Lia" e há lembretes locais no celular; o alarme de remédio tem prioridade. No `apps/familia`, cartão "Check-in diário" (horário editável, situação de hoje, resumo do último check-in).
- Alerta vermelho no `apps/familia`: faixa vermelha no topo do painel, som (web) ou vibração (celular) na chegada e título da aba piscando até "Vi, estou cuidando".

- Documentos (16/11): migration `20261123120000_documentos.sql` (tabela `documentos`, bucket privado `documentos`, `criar_alarmes_da_receita`, `remedios.termina_em` respeitado na geração de doses), validada com `supabase/tests/documentos_manual.sql`. Edge Function `ler-receita` com normalização em `_shared/receita.ts` (18 testes). No `apps/familia`: telas `app/documentos/index.tsx` (abas Receitas/Exames/Relatórios), `adicionar.tsx` (foto pela câmera com expo-image-picker ou arquivo/PDF com expo-document-picker → bucket `documentos` em `<paciente_id>/<arquivo>` → linha em `documentos`) e `receita.tsx` (chama `ler-receita`, itens `precisa_revisao` ficam "Precisa de você" até a família definir horários; "Criar N alarmes" chama `criar_alarmes_da_receita` só com os conferidos). Item Documentos na barra de navegação (5 ícones). Supabase em `lib/documentos.ts`; lógica pura em `packages/cliente/src/documentos.ts`, com testes.

- Etapa 26–27/11 (parte feita em 16/11): botão "Preciso de ajuda" no `apps/idoso` (fim do início). Chama a Edge Function `pedir-ajuda` (grava pelo banco e manda push); se falhar, chama direto a função SQL `pedir_ajuda()` (migration `20261124120000_pedido_de_ajuda.sql`: vermelho para todo o círculo, conta como interação, toques em 2 min não duplicam); se tudo falhar, a tela oferece o SAMU (192) e não diz "família avisada". Lógica em `packages/cliente/src/ajuda.ts`; `packages/regras/test/ajuda.test.ts` confere que a migration usa o mesmo alerta de `pedidoDeAjuda()`; teste do banco em `supabase/tests/ajuda_manual.sql`. Seed com uma semana de doses, check-ins e alertas; "hoje" no seed é o dia de Brasília. `apps/*/vercel.json` prontos (passo a passo no README).

- Supabase hospedado (16/11): projeto `cuida-app` (ref `rumwnbcefunxrybszrry`, sa-east-1) criado pelo conector, com as 6 migrations, o seed, `project_url` no Vault e as 4 Edge Functions publicadas (deploy com os caminhos do repositório, para os imports de `packages/regras` resolverem). Teste no banco hospedado, numa transação desfeita: vínculo por código, "Tomei", pedido de ajuda vermelho para a família, idosa sem editar remédios, estranho sem ver nada e anon bloqueado. A migration `20261125120000_funcoes_de_acesso_sem_anon.sql` atende ao aviso de segurança do Supabase (funções de acesso não executáveis por anon). Os demais avisos são intencionais (funções SECURITY DEFINER checam permissão por dentro; `codigos_vinculo` sem políticas). Em 17/11 o usuário ligou o login anônimo, cadastrou `LLM_API_KEY` e guardou a chave de servidor no Vault. Neste projeto as Edge Functions recebem só chaves no formato novo (`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_SECRET_KEYS` são `sb_secret_...`), então o Vault guarda a chave secreta nova com o nome `service_role_key`. A `verificar-doses` aceita a service_role antiga ou a chave secreta nova, no `Authorization` ou no `apikey` (`_shared/autorizacao.ts`, com testes), e registra no log só o tipo de chave quando recusa. O agendamento respondeu 200 e criou os alertas das doses não confirmadas. `pedir-ajuda`, `agente` e `ler-receita` ainda não foram chamadas com token real (a API do projeto não é acessível do ambiente da nuvem).

- 17/11: conta da família criada no painel do Supabase (Authentication → Users, já confirmada) e ligada à paciente fictícia como cuidador principal; os alertas de dose acumulados sem aparelho vinculado foram marcados como vistos. Enquanto nenhum aparelho confirmar "Tomei", a `verificar-doses` cria um alerta por dose: limpar ou recriar o seed antes de gravar o vídeo. Na Vercel, projeto `cuida-app-idoso` criado (Root Directory `apps/idoso`, preset Other, variáveis `EXPO_PUBLIC_*`); falta o `cuida-app-familia` e, depois, o Site URL e as Redirect URLs em Authentication → URL Configuration do Supabase. Para os jurados, criar uma conta de demonstração separada com e-mail que ninguém receba (por exemplo, `@example.com`).

- Condições de saúde (17/11): no cadastro e em Ajustes do `apps/familia`, pergunta "Possui alguma doença?" e lista em dois grupos (`packages/cliente/src/condicoes.ts`): com alertas automáticos (só `leucemia`) e só registro (`diabetes`, `hipertensao`, `doenca_cardiaca`, `doenca_pulmonar`). Só códigos do catálogo vão para `pacientes.condicoes`; o texto livre vai para `pacientes.outras_condicoes` (migration `20261126120000_outras_condicoes.sql`, até 300 caracteres) e nunca gera alerta. Teste em `packages/cliente/test/condicoes.test.ts` confere que o código do catálogo liga `leucemia.febre` no motor; banco em `supabase/tests/condicoes_manual.sql`. Ao criar um modelo de alertas para outra condição, mover a condição para o grupo com alertas (campo `alertas` no catálogo). Componentes `Opcao`/`Escolha` em `components/opcao.tsx`. Os dois apps estão publicados: https://cuida-app-familia.vercel.app e https://cuida-app-idoso.vercel.app.

Próximo passo: publicar os dois apps na Vercel, `eas init` para o push da família. `npm run typecheck` e `npm test` (175 testes) passaram em 16/11 depois da etapa 26–27/11 (182 testes em 17/11, depois das condições de saúde); o `npm install` avisa de 3 vulnerabilidades moderadas e do pacote obsoleto `text-encoding` (não rodar `npm audit fix --force`, que troca versões principais).

- Design "Manhã Clara" aplicado nos dois apps: temas em `apps/*/src/lib/tema.ts` importam `docs/design/tokens.json` (não duplique cores); fontes Atkinson Hyperlegible e Outfit via `@expo-google-fonts` (carregadas no `_layout`); ícones de traço em `components/icones.tsx` (react-native-svg). Idoso: `Texto`/`Destaque` em `components/ui.tsx` garantem 20 pt; telas de início, conversa (`components/conversa.tsx`), alarme (tela cheia no celular, modal na web) e "Sua família foi avisada" (aparece quando o agente registra pedido de ajuda). Família: painel do dia com cartão vermelho, tela do alerta, barra de navegação flutuante (Hoje, Remédios, Documentos, Alertas, Ajustes) e tela Ajustes (horário do check-in, vincular, sair). `packages/cliente/test/design.test.ts` confere 20 pt, toques de 64 e contraste 4,5:1 dos tokens.
- Ainda sem dados para partes das referências: nomes e telefones do círculo no idoso ("Ligar para o Lucas"), "Quem foi avisado" por pessoa e botões de ligar no alerta da família.

Observações: `npx expo install` precisa de `EXPO_OFFLINE=1` neste ambiente (api.expo.dev bloqueado). O push da família exige `eas init` (projectId).

Os campos de `checkins` vão além da tabela resumida acima: incluem também calafrio, sinais_infeccao, apetite_baixo, nausea, queda, dor_no_peito, falta_de_ar e confuso. A migration é a fonte da verdade.

## Como trabalhar neste repositório

- Construa em fatias pequenas de ponta a ponta e pare para testar antes da próxima.
- Escreva testes para toda regra de alerta (febre, sangramento, dose perdida, silêncio).
- Dados de saúde são sensíveis (LGPD) e o regulamento exige dados sintéticos: nada de dados reais em seeds, logs ou commits.
- Antes de cada commit, confira que nenhuma chave ou `.env` entrou no diff.
- Textos de interface em português do Brasil; código e nomes de tabelas como acima.
