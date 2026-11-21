# Cuida

Cuidadora virtual para idosos que moram sozinhos: lembra os remédios, faz o check-in diário e avisa a família quando algo sai do normal.

Projeto da trilha **Saúde e bem-estar** do Hack Brasil 2026.

> **Todos os dados da demo, dos testes e do script de demonstração são fictícios.** "Dona Maria" não existe.

## Links

- **Demo web**, sem instalar nada:
  - app da família: https://cuida-app-familia.vercel.app
  - app do idoso: https://cuida-app-idoso.vercel.app
- **Conta de demonstração** (app da família): `jurados@example.com`. A senha vai no formulário de envio do Hack Brasil.
- **Vídeo**: _a definir_
- **Roteiro da demo e passo a passo para os jurados**: [`docs/demo.md`](docs/demo.md)
- **O que o MVP faz** (fonte oficial): [`docs/PRD.md`](docs/PRD.md). **Visual**: [`docs/design.md`](docs/design.md).

## O problema

Cerca de 5,8 milhões de idosos moram sozinhos no Brasil. Eles esquecem remédios e nem sempre contam à família que estão mal. Para quem trata uma doença grave, como leucemia, uma febre não percebida pode virar internação. A família, longe, não sabe se o remédio foi tomado nem como a pessoa está.

O objetivo do MVP é provar duas coisas: **o idoso usa sozinho**, e **a família fica sabendo quando algo sai do normal**.

## Como funciona

O Cuida é um **web app instalável (PWA)**. Roda no navegador do celular e vai para a tela de início sem loja de apps. São dois apps.

**Idoso** (letras grandes, botões grandes, sem menus):
1. **Instalar e entrar:** a família manda o link por WhatsApp. O app mostra o passo a passo para colocar o Cuida na tela de início (iPhone ou Android). No primeiro acesso, o idoso digita um **código de 4 números**, que a família passa por telefone. Não há senha.
2. **Consentimento (LGPD):** três permissões, cada uma com o seu "Concordo":
   - guardar como ele está e os remédios;
   - mostrar para a família;
   - conversar com a Lia (IA).

   Ele pode mudar de ideia depois em "Minha privacidade".
3. **Check-in diário:** "Como você está hoje?" com **6 rostinhos**. Nos 3 mais baixos, a **Lia** (assistente de voz) entra na conversa para entender melhor. Ela entende frases como "tô quentinha".
4. **Hora do remédio:** alarme em tela cheia, com voz e o botão **"Tomei"**.
5. **"Preciso de ajuda":** sempre na tela. Avisa a família na hora e não depende da IA.

**Família:**
- painel do dia, com o último check-in, os remédios e os alertas em tempo real;
- cadastro de remédios;
- receitas lidas pela IA, que **a família confere antes** de qualquer alarme existir;
- pedidos médicos lidos pela IA: ela sugere a consulta (data, médico, especialidade, local e preparo), e a família confere antes de salvar;
- consultas, com lembrete para o idoso no dia anterior e 3 horas antes;
- grupo de cuidado, com um responsável e acompanhantes e convites por código;
- notificações por web push.

**Escalada dos alertas:** um alerta crítico vai primeiro ao **responsável**. Ele pode "Reenviar lembrete", "Ligar para o idoso" ou marcar "Já falei com ela, está tudo bem". Se não agir em 15 minutos, **todo o grupo** é avisado de uma vez. Emergências vão para todos na hora. Quando o idoso toca em "Tomei" ou faz o check-in, o alerta se resolve sozinho.

## Arquitetura

```
 App do idoso (PWA, Expo web)                    App da família (PWA, Expo web)
  rostinhos · voz no aparelho · "Tomei" ·          painel · remédios · receitas · grupo ·
  "Preciso de ajuda" · consentimento               alertas em tempo real
        │  chave anon + login anônimo do aparelho          │  chave anon + login por e-mail
        ▼                                                  ▼
 ┌─────────────────────────────── Supabase (São Paulo) ───────────────────────────────┐
 │ Postgres com Row Level Security em todas as tabelas                                │
 │   funções SQL: vincular_aparelho, confirmar_dose, registrar_rostinho, pedir_ajuda, │
 │   registrar_consentimento, ve_saude (quem da família vê os dados)...               │
 │ Edge Functions (Deno):                                                             │
 │   agente ............ conversa com a Lia (o LLM só transforma a fala em dados)     │
 │   verificar-doses ... pg_cron a cada minuto: doses esquecidas, check-in sem        │
 │                       resposta, escalada, 24 h de silêncio, lembretes ao idoso     │
 │   registrar-checkin · pedir-ajuda · reenviar-lembrete · ler-receita (receitas e    │
 │                       pedidos médicos: a IA só sugere, a família confere)          │
 │ packages/regras: regras de alerta determinísticas e testadas, sem IA               │
 │ Web push (VAPID, só WebCrypto) · Realtime · Storage privado (documentos)           │
 └────────────────────────────────────────────────────────────────────────────────────┘
```

- **Quem decide o alerta é código, nunca o LLM.** A IA só transforma a fala em dados estruturados. Se a IA cair, os alarmes, o botão de ajuda, o check-in com rostinhos e os alertas por silêncio continuam funcionando.
- **Rede de segurança na fala:** palavras-chave ("tô quentinha", "caí", "falta de ar") são lidas junto com o LLM, e o sinal mais grave vence. As respostas da Lia passam por uma revisão que bloqueia diagnóstico, "não é nada", mudança de remédio e pedido de senha.
- **Segredos só no servidor** (segredos das Edge Functions e Vault). Os apps usam apenas a chave anon do Supabase.

### Estrutura do repositório

```
apps/
  idoso/          app do idoso (Expo Router, web): instalar, código, consentimento, rostinhos, Lia, alarme
  familia/        app da família (Expo Router, web): painel, remédios, receitas, grupo, alertas
packages/
  regras/         motor de regras de alerta (TypeScript puro, sem dependências) + testes
  cliente/        lógica compartilhada pelos apps (consentimento, instalação, escalada...) + testes
  visual/         tema e componentes da Variação E (rostinhos, paisagem, botões) + testes
supabase/
  migrations/     esquema, RLS, funções SQL e agendamentos
  functions/      Edge Functions; _shared/ e agente/ têm a lógica pura testada em Node
  tests/          testes das funções SQL e das regras de acesso (psql)
  demo/           preparar_demo.sql: recria a paciente fictícia da conta de demonstração
  seed.sql        paciente fictícia para o banco local
```

## Como testar as regras de alerta

```bash
npm install
npm test            # 284 testes: motor de regras, lógica dos apps e das Edge Functions
npm run typecheck   # tipos dos dois apps e das Edge Functions
```

| Nível | O que dispara (exemplos) | Quem é avisado |
| --- | --- | --- |
| Vermelho | Febre ou sangramento em tratamento de leucemia; queda, dor no peito ou falta de ar relatadas; "Preciso de ajuda"; 24 h sem usar o app | Todo o grupo, na hora |
| Laranja | Remédio sem "Tomei" em 30 min; check-in sem resposta em 15 min; rostinho "Muito mal"; manchas roxas; cansaço forte 3 dias seguidos; a Lia não entendeu 3 vezes | Responsável; se ele não agir em 15 min, todo o grupo |
| Amarelo | Humor baixo 3 dias; falta de apetite 2 dias; estoque baixo | Só no painel |

Onde está cada parte:
- **Regras:** `packages/regras/src/avaliar.ts`, com testes em `packages/regras/test/`.
- **Tempos:** `packages/regras/src/tempos.ts`. Valem por paciente. O "modo demonstração", em Ajustes, põe tudo em 1 minuto.
- **Escalada e notificações:** `supabase/functions/_shared/escala.ts` e `lembretes.ts`, com testes `*.test.ts`.
- **Rede de palavras-chave e revisão da Lia:** `supabase/functions/agente/sinais.ts` e `revisao.ts`.
- **Banco:** os scripts em `supabase/tests/*_manual.sql` conferem as funções SQL e quem vê o quê (rode com `psql`, depois de aplicar as migrations). Cada linha de resultado deve sair `t`.

Os limites clínicos, como a temperatura de febre (padrão 37,8 °C), são configuráveis por paciente e devem ser definidos com o médico.

**Para ver as regras funcionando na demo:** com a conta de demonstração, conecte o app do idoso e toque no rostinho "Mal". Para a Lia, diga "tô quentinha", e o alerta vermelho chega no painel da família. Para o remédio, deixe o alarme tocar sem "Tomei": em 1 minuto chega o alerta laranja. O passo a passo completo está em [`docs/demo.md`](docs/demo.md).

## Como rodar

Requisitos: Node 22.6 ou mais recente. Para o banco local, a [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example apps/idoso/.env     # preencha só EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
cp .env.example apps/familia/.env
npm run familia                     # app da família no navegador
npm run idoso                       # app do idoso no navegador
```

Banco local com o esquema e o seed fictício:

```bash
supabase start
supabase db reset
supabase functions serve
```

**Nunca faça commit do `.env`.** Os apps usam só a chave anon, nunca a service role.

### Supabase hospedado

1. Aplique as migrations de `supabase/migrations/`, em ordem.
2. Ligue o login anônimo, para o celular do idoso: Authentication → Sign In / Providers → Anonymous.
3. Guarde no Vault os dados do agendamento que chama a `verificar-doses` a cada minuto:
   ```sql
   select vault.create_secret('https://<projeto>.supabase.co', 'project_url');
   select vault.create_secret('<chave secreta sb_secret_...>', 'service_role_key');
   ```
4. Cadastre os segredos das Edge Functions:
   - `LLM_API_KEY`: a chave da Anthropic;
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`: as chaves do web push. A pública também está em `packages/cliente/src/notificacoes.ts`, e trocar uma exige trocar a outra.
5. Publique as funções `agente`, `verificar-doses`, `registrar-checkin`, `pedir-ajuda`, `reenviar-lembrete`, `ler-receita` e `apagar-conta`.
   - As funções importam `packages/regras` de fora de `supabase/functions`. Publique com os caminhos do repositório.
   - Na `verificar-doses`, a verificação de JWT fica desligada: ela confere a chave de servidor por conta própria (`_shared/autorizacao.ts`).

### Demo web na Vercel

Cada app é um projeto separado na Vercel, com Root Directory `apps/idoso` ou `apps/familia`. Deixe incluídos os arquivos fora do Root Directory, porque os apps usam `packages/`. A configuração de build está em `apps/*/vercel.json`.

Cadastre as variáveis `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Depois, no Supabase, em Authentication → URL Configuration, adicione os dois endereços.

O microfone na web exige HTTPS, que a Vercel já fornece. O Chrome, o Edge e o Safari têm reconhecimento de fala. No Firefox, o app do idoso mostra um campo de texto grande.

## Dados e LGPD

- **Dados sintéticos:** nenhum dado real no repositório, nos logs ou no vídeo.
- **Consentimento do idoso** por finalidade, com histórico de cada resposta (`consentimentos_historico`). Só ele muda as permissões, pelo próprio celular.
  - Sem "mostrar para a família", só o responsável vê os dados e recebe alertas (regra `ve_saude` no banco).
  - Sem "conversar com a Lia", a fala não vai para a IA.
- **Row Level Security** em todas as tabelas. Documentos ficam num Storage privado, visível só ao grupo de cuidado.
- **Apagar a conta:** o familiar apaga a própria conta em Ajustes. Se for a única pessoa no grupo, os dados de quem ele cuida também são apagados; se não, a responsabilidade passa para a próxima pessoa do grupo.
- **Guardamos só o necessário:** sem CPF, endereço ou plano de saúde. Sem venda ou compartilhamento comercial de dados de saúde.

## Licença

Código aberto sob a licença [MIT](LICENSE). Os dados da demonstração, dos testes e do vídeo são fictícios.
