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
  idoso/          app do idoso (Expo)
  familia/        app da família (Expo)
packages/
  regras/         motor de regras de alerta (TypeScript, sem dependências) + testes
supabase/
  migrations/     esquema do banco com Row Level Security
  functions/
    avaliar-regras/  roda a cada minuto: doses, silêncio de 24 h, escala de avisos (sem IA)
    agente/          conversa com a Lia: LLM + rede de segurança + revisão das respostas
    _shared/         cópia gerada das regras e lógica compartilhada
    test/            testes da lógica e dos limites do agente
  seed.sql        paciente fictícia "Dona Maria" para a demo
  tests/          teste manual de RLS
scripts/          sincroniza packages/regras com as Edge Functions
```

## Arquitetura de segurança do agente

A IA nunca decide sozinha se a família deve ser avisada:

1. O LLM conversa e extrai os sintomas chamando ferramentas (`registrar_checkin`, `confirmar_remedio`, `pedir_ajuda`, `proximos_compromissos`).
2. Uma rede de palavras-chave lê a mesma fala ("tô quentinha", "meio caída", "caí") e é mesclada ao que o LLM extraiu: o sinal mais grave vence.
3. Se houver sinal de alerta e o LLM não registrar o check-in, o servidor registra sozinho. Se o LLM estiver fora do ar, a rede continua funcionando.
4. As regras de alerta (`packages/regras`) decidem o nível e quem avisar.
5. Toda resposta passa por uma revisão que bloqueia diagnóstico, "não é nada", mudança de remédio e pedido de senha.

A fala é transcrita no próprio aparelho e a resposta é falada pela voz do sistema, então o MVP não depende de serviço pago de voz.

## Como rodar

Requisitos: Node 22.6 ou mais recente e, para o banco, a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# 71 testes: regras de alerta, doses, escala de avisos, rede de segurança e revisão do agente
npm test

# banco local com o esquema e o seed fictício
supabase start
supabase db reset

# Edge Functions
supabase secrets set LLM_API_KEY=... CRON_SECRET=...
supabase functions deploy agente
supabase functions deploy avaliar-regras --no-verify-jwt
```

O agendamento da `avaliar-regras` a cada minuto (pg_cron) está comentado em `supabase/migrations/20261116220000_push_do_idoso.sql`.

Se alterar `packages/regras`, rode `npm run regras:sincronizar` antes do commit (o `npm test` acusa cópia desatualizada).

Copie `.env.example` para `.env` e preencha. **Nunca faça commit do `.env`.**

## Regras de alerta

| Nível | Exemplos | Quem é avisado |
| --- | --- | --- |
| Vermelho | Febre ou sangramento (leucemia), queda, dor no peito, botão de ajuda, 24 h sem uso | Todo o círculo de cuidado, na hora |
| Laranja | Dose não confirmada em 60 min, manchas roxas, cansaço forte 3 dias | Responsável principal; sem resposta em 30 min, o próximo |
| Amarelo | Humor baixo 3 dias, estoque baixo | Resumo diário |

Os limites clínicos (por exemplo, a temperatura de febre, padrão 37,8 °C) são configuráveis por paciente e devem ser definidos com o médico.
