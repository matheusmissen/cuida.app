# Cuida

Assistente de voz que cuida do idoso que mora sozinho e avisa a família quando algo sai do normal.

Projeto da trilha **Saúde e bem-estar** do Hack Brasil 2026.

> Em construção. **Todos os dados usados na demo, nos testes e no seed são fictícios.**

## Links

- Repositório oficial: https://github.com/matheusmissen/cuida.app
- Demo web: _a definir_
- Vídeo: _a definir_
- Última atualização: 17/11/2026

## O problema

Cerca de 5,8 milhões de idosos moram sozinhos no Brasil. Eles esquecem remédios e nem sempre contam à família que estão mal. Para quem trata uma doença grave, como leucemia, uma febre não percebida pode virar internação.

## Como funciona

- **App do idoso:** uma tela, um botão de voz, alarme de remédio com "Tomei" e check-in diário falado.
- **App da família:** remédios, regras de alerta, painel do dia e alertas em tempo real.
- **Regras de alerta determinísticas:** a IA só transforma a fala em dados; quem decide o alerta é código testado, separado do LLM. Se a IA cair, os alarmes e alertas continuam funcionando.

## Estrutura

```
apps/
  idoso/        app do idoso (Expo Router): vínculo por código/QR, tela única, alarme "Tomei" com voz
  familia/      app da família (Expo Router): login, paciente, remédios e horários, QR, painel e alertas
packages/
  regras/       motor de regras de alerta (TypeScript, sem dependências) + testes
  cliente/      cliente Supabase, tipos e utilitários compartilhados pelos apps + testes
supabase/
  migrations/   esquema do banco com Row Level Security, doses do dia e pg_cron
  functions/    Edge Functions (Deno): verificar-doses (cron), agente (Lia), pedir-ajuda e ler-receita;
                _shared/ e agente/ têm lógica pura testada em Node
  seed.sql      paciente fictícia "Dona Maria" com uma semana de doses, check-ins e alertas
  tests/        testes manuais de RLS, doses, check-in, documentos e pedido de ajuda (psql)
```

## Arquitetura

```
 App do idoso (Expo, web e celular)            App da família (Expo, web e celular)
  voz no aparelho · alarme "Tomei" ·            painel do dia · remédios · documentos ·
  check-in · "Preciso de ajuda"                 alertas em tempo real e push
        │  chave anon + token do aparelho              │  chave anon + login por e-mail
        ▼                                              ▼
 ┌──────────────────────────── Supabase (região São Paulo) ────────────────────────────┐
 │ Postgres com RLS em todas as tabelas · funções SQL (confirmar_dose, pedir_ajuda...) │
 │ Edge Functions: agente (LLM só extrai dados) · pedir-ajuda · ler-receita ·          │
 │                 verificar-doses (pg_cron a cada 5 min)                              │
 │ packages/regras: regras de alerta determinísticas, testadas, sem IA                 │
 │ Storage privado (documentos) · Realtime (alertas) · push pelo Expo                  │
 └─────────────────────────────────────────────────────────────────────────────────────┘
```

- **Quem decide o alerta é código**, nunca o LLM. Se a IA cair, alarmes, botão de ajuda e alerta por
  silêncio continuam funcionando.
- **Segredos só no servidor** (Edge Functions e Vault). Os apps usam apenas a chave anon do Supabase.

## Como rodar

Requisitos: Node 22.6 ou mais recente e, para o banco, a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install

# testes: motor de regras, utilitários dos apps e lógica das Edge Functions
npm test

# checagem de tipos dos dois apps
npm run typecheck

# banco local com o esquema e o seed fictício
supabase start
supabase db reset
supabase functions serve
```

Cada app lê as variáveis do seu próprio `.env`. Copie os nomes de `.env.example` para
`apps/idoso/.env` e `apps/familia/.env` com a URL e a chave **anon** do Supabase (nunca a service role):

```bash
npm run familia   # app da família no navegador
npm run idoso     # app do idoso no navegador
```

Alarmes do sistema e push só funcionam em build de desenvolvimento EAS (não no Expo Go).
Na web, o alarme aparece como modal em tela cheia na própria página.

**Nunca faça commit do `.env`.**

### Agendamentos no Supabase hospedado

A migration cria dois jobs no `pg_cron`: `gerar-doses` (diário) e `verificar-doses` (a cada 5 min, chama a
Edge Function). A URL e a chave de servidor ficam no Vault, fora do repositório:

```sql
select vault.create_secret('https://<projeto>.supabase.co', 'project_url');
select vault.create_secret('<chave secreta sb_secret_...>', 'service_role_key');
```

Use a **chave secreta nova** (Settings → API Keys → Secret keys → `default`, começa com `sb_secret_`).
Projetos novos do Supabase injetam nas Edge Functions só as chaves nesse formato, então a service_role antiga
(`eyJ...`) é recusada pela `verificar-doses`. Projetos antigos ainda podem usar a service_role: a função aceita as
duas (`supabase/functions/_shared/autorizacao.ts`). O nome do segredo no Vault continua `service_role_key`.

Ligue também o login anônimo (Authentication → Sign In / Providers → Anonymous) para o app do idoso.

Publicar as Edge Functions:

```bash
supabase secrets set LLM_API_KEY=...
supabase functions deploy agente pedir-ajuda ler-receita verificar-doses
```

### Demo web na Vercel

Cada app é um projeto separado na Vercel, ligado a este repositório. A configuração de build já está em
`apps/idoso/vercel.json` e `apps/familia/vercel.json` (instala o monorepo na raiz, roda
`expo export --platform web` e serve `dist/` como site de página única).

1. Na Vercel: **Add New → Project**, escolha este repositório e, em **Root Directory**, `apps/idoso`.
   Deixe ligada a opção de incluir arquivos fora do Root Directory (o app usa `packages/`).
2. Em **Environment Variables**, cadastre `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   (só a chave anon; nunca a service role).
3. Repita com Root Directory `apps/familia`.
4. No Supabase, em Authentication → URL Configuration, adicione os dois endereços da Vercel.

O microfone na web exige HTTPS, que a Vercel já fornece. O Chrome e o Edge têm reconhecimento de fala;
no Firefox o app do idoso mostra um campo de texto grande.

## Fluxo do remédio (etapa 18–21/11)

1. A família cadastra o paciente, os remédios e os horários e gera um código/QR de vínculo.
2. O celular do idoso entra anonimamente e se vincula com o código (válido por 15 min, uso único).
3. As doses do dia são geradas no servidor (horário de Brasília). O celular agenda alarmes locais no horário
   e 30 min depois; a tela mostra o remédio em letra grande, a Lia lê em voz alta e há um botão "Tomei".
4. Sem "Tomei": aos 30 min o alarme toca de novo; aos 60 min a Edge Function `verificar-doses` cria um
   alerta laranja (vermelho se o remédio for crítico) e manda push. Laranja sem resposta em 30 min vai
   para o próximo da escala.
5. Nenhuma interação do celular do idoso em 24 h: a `verificar-doses` cria um alerta vermelho (uma vez por silêncio).

## Conversa com a Lia (Edge Function `agente`)

O celular transcreve a fala no próprio aparelho e envia o texto; a resposta volta em texto e é falada com `expo-speech`.

- Entrada: `POST /functions/v1/agente` com o token do aparelho do idoso e `{ texto, historico?: [{ papel: 'idoso' | 'lia', texto }] }`.
- Saída: `{ resposta, alertas: [{ nivel, motivo }] }`.

A IA nunca decide sozinha se a família deve ser avisada:

1. O LLM conversa e chama ferramentas: `registrar_checkin`, `confirmar_remedio` (usa a mesma função do botão "Tomei"), `pedir_ajuda` e `proximos_compromissos`.
2. Uma rede de palavras-chave lê a mesma fala ("tô quentinha", "meio caída", "caí", entendendo negações como "não tive febre") e é mesclada ao que o LLM extraiu: o sinal mais grave vence.
3. Se houver sinal de alerta e o LLM não registrar o check-in, ou se o LLM estiver fora do ar, o servidor registra sozinho.
4. `avaliarCheckin` (packages/regras) decide o nível e `criarEAvisar` grava o alerta e avisa a família.
5. Toda resposta passa por uma revisão que bloqueia diagnóstico, "não é nada", mudança de remédio e pedido de senha.

Segredos: `supabase secrets set LLM_API_KEY=...` (opcionais: `LLM_MODEL`, padrão `claude-haiku-5-5`; `NOME_ASSISTENTE`, padrão `Lia`).
Publicar: `supabase functions deploy agente`.

> Primeiro deploy: as Edge Functions importam `packages/regras` de fora de `supabase/functions`. Confirme que a CLI empacota esses arquivos. Se não empacotar, copie `packages/regras/src` para `supabase/functions/_shared/regras` e troque os imports.

## Conversa com a Lia (etapa 22–25/11, app do idoso)

1. O idoso aperta **Falar com a Lia** e fala. A transcrição acontece no aparelho
   (`expo-speech-recognition`, que usa o reconhecimento on-device quando o sistema oferece) ou, na web,
   pela Web Speech API do navegador. Sem reconhecimento (por exemplo, Firefox), aparece um campo de texto grande.
2. O texto e as últimas 12 falas vão para a Edge Function `agente` (`{ texto, historico }`), com o token do aparelho.
3. A resposta aparece em letra grande e é falada com `expo-speech`. Se o agente não responder, a Lia avisa
   em voz que não conseguiu e pede para tentar de novo.

## Botão "Preciso de ajuda" (etapa 26–27/11)

Fica sempre no fim da tela inicial do idoso e **não usa IA**:

1. O app chama a Edge Function `pedir-ajuda`, que grava o alerta vermelho pela função do banco
   `pedir_ajuda()` (com o token do aparelho) e manda push para todo o círculo de cuidado.
2. Se a Edge Function falhar, o app chama `pedir_ajuda()` direto: o alerta aparece em tempo real no painel
   da família, sem push.
3. Se tudo falhar (sem internet), a tela não diz que a família foi avisada: mostra o botão para ligar para o
   SAMU (192).

Toques repetidos em 2 minutos reaproveitam o mesmo alerta. Teste do banco: `supabase/tests/ajuda_manual.sql`.

## Check-in diário (etapa 22–25/11)

- A família define o horário no painel (padrão 09:00; pode desligar).
- No horário, a Lia chama no app do idoso ("Vamos conversar um pouquinho? Como está se sentindo hoje?") e
  repete 30 min depois. No celular também toca um lembrete local. Se o alarme de remédio estiver aberto, o
  check-in espera o "Tomei".
- A resposta vai para o agente, que registra o check-in e aplica as regras (por exemplo, "tô quentinha" →
  febre → alerta vermelho).
- Sem check-in 1 h depois do horário (2 tentativas), o servidor cria um alerta laranja para o responsável
  principal. A conta é `situacaoDoCheckin`, em `packages/regras`, usada pelo servidor e pelo app.
- No app da família, o alerta vermelho aparece como uma faixa no topo do painel, com som ou vibração, até
  alguém tocar em "Vi, estou cuidando".

## Documentos e leitura de receita

No app da família ficam as receitas, os exames e os relatórios médicos da paciente (tabela `documentos` e bucket privado `documentos`, com arquivos em `<paciente_id>/`). Só o círculo de cuidado vê esses arquivos; o aparelho do idoso não.

A receita pode ser lida pela IA, mas **a família sempre confere antes de qualquer alarme existir**:

1. A família tira a foto (ou envia um PDF); o app guarda o arquivo e cria o documento com status `enviado`.
2. A Edge Function `ler-receita` lê a imagem com a API da Anthropic e só transcreve. A lógica de `_shared/receita.ts` sugere os horários ("de 8 em 8 horas" → 06:00, 14:00, 22:00; "ao deitar" → 22:00) e marca para revisão o que não ficou claro: frequência ilegível, dose ausente ou leitura incerta.
3. Na tela "Confira a receita", a família ajusta o que precisar e confirma. O app chama `criar_alarmes_da_receita`, que cria os remédios e horários só dos itens enviados, respeita a duração do tratamento (`remedios.termina_em`) e marca a receita como `conferida`.

Exames e relatórios são só guardados (foto ou PDF, data e lista); a IA não lê esses documentos.

Publicar: `supabase functions deploy ler-receita`. Teste do banco: `supabase/tests/documentos_manual.sql`.

## Regras de alerta

| Nível | Exemplos | Quem é avisado |
| --- | --- | --- |
| Vermelho | Febre ou sangramento (leucemia), queda, dor no peito, botão de ajuda, 24 h sem uso | Todo o círculo de cuidado, na hora |
| Laranja | Dose não confirmada em 60 min, manchas roxas, cansaço forte 3 dias | Responsável principal; sem resposta em 30 min, o próximo |
| Amarelo | Humor baixo 3 dias, estoque baixo | Resumo diário |

Como testar as regras: `npm test` roda os casos do motor (`packages/regras/test`), da situação das doses
(`packages/cliente/test`) e da decisão de dose perdida, escala e push (`supabase/functions/_shared/*.test.ts`).
As funções SQL têm testes em `supabase/tests/` (rode com `psql` depois de `supabase db reset`).

Os limites clínicos (por exemplo, a temperatura de febre, padrão 37,8 °C) são configuráveis por paciente e devem ser definidos com o médico.
