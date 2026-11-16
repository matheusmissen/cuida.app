# Cuida — MVP do app de cuidado para idosos que moram sozinhos

Este arquivo dá ao Claude Code o contexto do projeto. Leia antes de qualquer tarefa.

## O que estamos construindo

Dois apps ligados a um backend:

- **App do idoso** (Expo): uma tela, um botão grande de voz, alarme de remédio em tela cheia com botão "Tomei", check-in diário por voz e botão "Preciso de ajuda".
- **App da família** (Expo): cadastro do paciente e dos remédios, regras de alerta, painel do dia e recebimento de alertas por push.

O primeiro usuário real é uma idosa que mora sozinha e trata leucemia. O objetivo do MVP é provar que **o idoso usa sozinho e a família fica sabendo quando algo sai do normal.**

## Escopo do MVP (só isto)

1. Lembrete de remédio com confirmação "Tomei" e aviso à família se não confirmar.
2. Check-in diário por voz, com regras de alerta (inclui o modelo de leucemia).
3. Alertas para a família por push, botão "Preciso de ajuda" e alerta por silêncio de 24 h.

**Fora do MVP (não implementar ainda):** exames/OCR, checagem de golpe, adicionar contato, WhatsApp, planos pagos, parceiros.

## Stack

- Monorepo com `apps/idoso`, `apps/familia` (Expo, TypeScript, Expo Router) e `supabase/` (migrations, Edge Functions).
- Supabase: Postgres, Auth, Storage, Edge Functions, pg_cron. Região São Paulo. Row Level Security em todas as tabelas.
- Notificações: expo-notifications (locais para alarmes, push para alertas). Usar build de desenvolvimento EAS, não Expo Go.
- Voz: transcrição no aparelho (reconhecimento de fala do sistema) e resposta falada com expo-speech. O agente roda numa Edge Function.
- LLM com tool calling para o agente. Chaves de API só em variáveis de ambiente do servidor, nunca no app.

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

## Estado atual (16/11)

Pronto e testado:
- `packages/regras`: motor de regras de alerta em TypeScript puro, sem dependências, com 27 testes (`npm test`). Use estas funções nas Edge Functions; não reimplemente as regras.
- `supabase/migrations`: esquema completo com RLS, funções `criar_paciente`, `gerar_codigo_vinculo`, `vincular_aparelho` e `registrar_interacao`. Validado em Postgres 16 com o teste de `supabase/tests/rls_manual.sql`.
- `supabase/seed.sql`: paciente fictícia "Dona Maria" com remédios, doses, check-ins e um alerta.
- `supabase/functions/avaliar-regras`: cron de 1 em 1 minuto (gera doses, realarme aos 30 min, dose perdida aos 60 min, silêncio de 24 h, escala de alertas laranja). Sem LLM.
- `supabase/functions/agente`: conversa com a Lia. Entrada `POST { texto, historico: [{ papel: 'idoso' | 'lia', texto }] }` com o token do aparelho do idoso; saída `{ resposta, alertas }`. Usa a API da Anthropic (`LLM_API_KEY`, modelo em `LLM_MODEL`), rede de palavras-chave (`sinais.ts`) e revisão das respostas (`revisao.ts`).
- O app do idoso transcreve a fala no aparelho (reconhecimento de fala do sistema; na web, Web Speech API) e fala a resposta com `expo-speech`. Não há serviço de transcrição no servidor.
- O app do idoso deve chamar `salvar_push_idoso(token)` depois do vínculo, para o servidor poder repetir o alarme.
- `npm test` roda 71 testes (regras + lógica das funções + limites do agente) e confere se a cópia das regras em `supabase/functions/_shared/regras` está em dia. Depois de mudar `packages/regras`, rode `npm run regras:sincronizar`.

Próximo passo: criar `apps/idoso` e `apps/familia` com `npx create-expo-app@latest` (template com Expo Router e TypeScript), adicionar suporte a web e o cliente Supabase, e implementar a etapa de 18–21/11.

Os campos de `checkins` vão além da tabela resumida acima: incluem também calafrio, sinais_infeccao, apetite_baixo, nausea, queda, dor_no_peito, falta_de_ar e confuso. A migration é a fonte da verdade.

## Como trabalhar neste repositório

- Construa em fatias pequenas de ponta a ponta e pare para testar antes da próxima.
- Escreva testes para toda regra de alerta (febre, sangramento, dose perdida, silêncio).
- Dados de saúde são sensíveis (LGPD) e o regulamento exige dados sintéticos: nada de dados reais em seeds, logs ou commits.
- Antes de cada commit, confira que nenhuma chave ou `.env` entrou no diff.
- Textos de interface em português do Brasil; código e nomes de tabelas como acima.
