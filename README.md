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
  idoso/        app do idoso (Expo) — próxima etapa
  familia/      app da família (Expo) — próxima etapa
packages/
  regras/       motor de regras de alerta (TypeScript, sem dependências) + testes
supabase/
  migrations/   esquema do banco com Row Level Security
  seed.sql      paciente fictícia "Dona Maria" para a demo
  tests/        teste manual de RLS
```

## Como rodar

Requisitos: Node 22.6 ou mais recente e, para o banco, a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# testes do motor de regras (27 casos: febre, sangramento, doses, silêncio...)
npm test

# banco local com o esquema e o seed fictício
supabase start
supabase db reset
```

Copie `.env.example` para `.env` e preencha. **Nunca faça commit do `.env`.**

## Regras de alerta

| Nível | Exemplos | Quem é avisado |
| --- | --- | --- |
| Vermelho | Febre ou sangramento (leucemia), queda, dor no peito, botão de ajuda, 24 h sem uso | Todo o círculo de cuidado, na hora |
| Laranja | Dose não confirmada em 60 min, manchas roxas, cansaço forte 3 dias | Responsável principal; sem resposta em 30 min, o próximo |
| Amarelo | Humor baixo 3 dias, estoque baixo | Resumo diário |

Os limites clínicos (por exemplo, a temperatura de febre, padrão 37,8 °C) são configuráveis por paciente e devem ser definidos com o médico.
