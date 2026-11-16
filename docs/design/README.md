# Design do Cuida — "Manhã Clara"

Visual aprovado em 16/11/2026. Canvas com as telas: https://claude.ai/artifact/Bs4YQK8cht8RXmSLA1huhk (página "Versão Fable").

Ideia: calmo e simples, com cartões arredondados em tons pastel sobre um fundo creme, uma ação principal preta por tela e muito respiro. O vermelho fica reservado para alertas e para o botão de ajuda.

## Arquivos

- `tokens.json`: cores, fontes, tamanhos, raios, sombras e alvos de toque. É a fonte da verdade dos temas.
- `telas/*.dc.html`: as seis telas aprovadas, em HTML com estilos inline. Use como referência exata de layout, textos, espaçamentos e ícones (SVG de traço). **Não** importe esses arquivos nos apps: eles são só referência; reconstrua em React Native.

| Tela | Arquivo | App |
| --- | --- | --- |
| Início | `telas/Idoso-Inicio.dc.html` | idoso |
| Alarme do remédio | `telas/Idoso-Alarme.dc.html` | idoso (no celular, tela cheia; na web, modal) |
| Conversa com a Lia | `telas/Idoso-Conversa.dc.html` | idoso |
| Família avisada | `telas/Idoso-Ajuda.dc.html` | idoso (depois de "Preciso de ajuda") |
| Painel do dia | `telas/Familia-Painel.dc.html` | família |
| Alerta vermelho | `telas/Familia-Alerta.dc.html` | família |

## Regras

**Cores com papel fixo**
- Sálvia: remédios, confirmações e a tela do alarme.
- Lilás: a Lia (cartão da fala, halo do botão de voz).
- Pêssego: avatares das pessoas da família.
- Vermelho (`#B3261E`): **somente** alertas e "Preciso de ajuda". Nunca como decoração.
- Tinta (`#18181C`): a ação principal de cada tela, com texto branco.

**Tipografia**
- Atkinson Hyperlegible (feita para baixa visão) em todo o texto corrido e nos rótulos.
- Outfit (peso 500) em saudação, horários, nome do remédio, fala da Lia e títulos.
- App do idoso: nenhum texto abaixo de 20 pt. Fala da Lia em 30 pt.
- App da família: corpo de 15 a 17 pt; 13–14 pt só em selos de status em negrito.

**Formas e profundidade**
- Cartões brancos com raio de 28 a 36 e a sombra `cartao` (bem leve). Selos e botões em pílula (raio 999).
- Botões principais pretos com sombra `botaoPrincipal`. O "Tomei" tem 132 de altura.
- Botões secundários do idoso ("Ouvir de novo", "Voltar ao início"): caixa branca de 68 de altura, largura total, sombra `cartao`, texto 22 em negrito. Discretos, mas visíveis.

**App do idoso**
- Alvos de toque de 64 ou mais. Sem menus, sem barra de navegação, sem gestos de deslizar.
- Uma ação principal por tela. Toda fala da Lia aparece em letra grande e é falada.
- Toda tela que não é a inicial tem um caminho de volta ("Voltar ao início" ou "Tomei").

**App da família**
- Barra de navegação flutuante em pílula (Hoje, Remédios, Alertas, Ajustes); só o item ativo mostra o nome.
- Cartão vermelho de alerta no topo do painel quando houver alerta vermelho não visto, com sombra `alerta`.

**Acessibilidade**
- Contraste de texto de pelo menos 4,5:1 (os pares de `tokens.json` já passam).
- `accessibilityLabel` em botões só com ícone; ícones decorativos escondidos dos leitores de tela.
- Respeitar o tamanho de fonte do sistema sem quebrar o layout.

**Dados**
- Telas, seeds, testes e o vídeo usam só dados fictícios (Dona Maria, Lucas, Ana, Remédio A/B), como exige o regulamento.
