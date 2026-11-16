# Cuida

Assistente de voz que cuida do idoso que mora sozinho e avisa a família quando algo sai do normal.

Projeto da trilha **Saúde e bem-estar** do Hack Brasil 2026.

> Em construção. **Todos os dados usados na demo, nos testes e no seed são fictícios.**

## Links

- Demo web: _a definir_
- Vídeo: _a definir_

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
  functions/    Edge Functions (Deno); _shared/ tem a lógica pura testada em Node
  seed.sql      paciente fictícia "Dona Maria" para a demo
  tests/        testes manuais de RLS e das funções de doses (psql)
```

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
Edge Function). A URL e a service role ficam no Vault, fora do repositório:

```sql
select vault.create_secret('https://<projeto>.supabase.co', 'project_url');
select vault.create_secret('<service role key>', 'service_role_key');
```

Ligue também o login anônimo (Authentication → Sign In / Providers → Anonymous) para o app do idoso.

## Fluxo do remédio (etapa 18–21/11)

1. A família cadastra o paciente, os remédios e os horários e gera um código/QR de vínculo.
2. O celular do idoso entra anonimamente e se vincula com o código (válido por 15 min, uso único).
3. As doses do dia são geradas no servidor (horário de Brasília). O celular agenda alarmes locais no horário
   e 30 min depois; a tela mostra o remédio em letra grande, a Lia lê em voz alta e há um botão "Tomei".
4. Sem "Tomei": aos 30 min o alarme toca de novo; aos 60 min a Edge Function `verificar-doses` cria um
   alerta laranja (vermelho se o remédio for crítico) e manda push. Laranja sem resposta em 30 min vai
   para o próximo da escala.

## Conversa com a Lia (etapa 22–25/11, app do idoso)

1. O idoso aperta **Falar com a Lia** e fala. A transcrição acontece no aparelho
   (`expo-speech-recognition`, que usa o reconhecimento on-device quando o sistema oferece) ou, na web,
   pela Web Speech API do navegador. Sem reconhecimento (por exemplo, Firefox), aparece um campo de texto grande.
2. O texto e as últimas 12 falas vão para a Edge Function `agente` (`{ texto, historico }`), com o token do aparelho.
3. A resposta aparece em letra grande e é falada com `expo-speech`. Se o agente não responder, a Lia avisa
   em voz que não conseguiu e pede para tentar de novo.

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
