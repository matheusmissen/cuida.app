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
  functions/    Edge Functions (Deno): verificar-doses (cron) e agente (Lia); _shared/ e agente/ têm lógica pura testada em Node
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
