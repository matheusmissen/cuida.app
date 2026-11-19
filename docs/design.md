# Cuida — Guia visual (Variação E)

Referência visual oficial do Cuida. Toda tela nova ou ajustada deve seguir este guia. Canvas de referência (só para humanos): "Cuida — Telas do MVP", fileiras "Variação E".

Princípio: bonito e acolhedor, mas com contraste alto para pessoas idosas. Cantos e botões bem arredondados, texto quase preto, bordas visíveis nos cartões.

## Cores

| Nome | Hex | Uso |
| --- | --- | --- |
| fundo | #FBF8F3 | Fundo de todas as telas (creme) |
| superficie | #FFFFFF | Cartões, campos, barra de abas |
| borda | #DDD5C8 | Borda de cartões (1.5px) |
| borda-campo | #A9B3AF | Borda de campos de texto (1.5px) |
| texto | #1C2321 | Texto principal |
| texto-suave | #3E4744 | Texto secundário (nunca mais claro que isso) |
| primaria | #0F5E5A | Botões principais, aba ativa, destaques |
| primaria-escura | #0A4441 | Texto sobre fundos verdes claros |
| alerta-fundo | #FCEBDD | Fundo de alertas |
| alerta-borda | #E9B48C | Borda de alertas |
| alerta-forte | #B4470F | Selo "Alerta crítico", ponto de notificação |
| alerta-texto | #5A2306 | Texto sobre fundo de alerta |

Pares pastel para cartões e ícones (fundo / borda / cor do ícone):
- lilás: #EDE8FB / #CFC5F0 / #3D2F86 (remédios)
- menta: #E3F2EC / #BFDCCD / #0A4441 (consultas, sucesso)
- pêssego: #FCEBDD / #F0CBAE / #7A3A10 (Lia, exames)
- amarelo: #FBF1D3 / #EAD9A0 / #5E4A0C (família, horários)

Texto sobre pastel é sempre #1C2321 ou a cor escura do par. Nunca texto branco sobre pastel.

## Tipografia

- Títulos: Nunito, peso 800. Textos: Atkinson Hyperlegible, pesos 400 e 700. Carregar as duas do Google Fonts.
- App do idoso: título de tela 30–34px; texto corrido 19px (mínimo 17px); rótulos 18px; horário em destaque 60px (Nunito 800).
- App da família: título 26–28px; texto 16–17px (mínimo 14px em rótulos pequenos).

## Formas e medidas

- Botão principal: formato pílula (border-radius = metade da altura), fundo #0F5E5A, texto branco, Nunito 800. Altura: 64px (padrão), 88–90px no botão "Tomei", 56–60px no app da família.
- Botão secundário: pílula branca com borda 2px #0F5E5A e texto #0F5E5A.
- Cartões: border-radius 24–28px, fundo branco, borda 1.5px #DDD5C8. Cartão em destaque (formulário ativo, item selecionado): borda 2.5px #0F5E5A.
- Campos de texto: pílula (radius 27px), altura 54px, borda 1.5px #A9B3AF, fundo branco, rótulo acima em 16px negrito.
- Ícones: traço (stroke) 2–2.2px, cantos arredondados. Ícone dentro de "quadradinho" pastel com radius 16–19px e borda do par.
- Área de toque mínima: 44px (idoso: 56px ou mais).
- Espaçamento entre blocos: 14–18px. Margem lateral: 20–22px.
- Barra de abas embaixo: fundo branco, borda superior 1.5px #DDD5C8; aba ativa é uma pílula #0F5E5A com ícone e texto brancos; abas inativas em #3E4744. Sempre ícone + texto.

## Rostinhos do check-in (6 níveis)

Blocos 96×96px, radius 34px, borda 2px. Olhos e boca na cor escura do nível.

| Nível | Rótulo | Fundo | Borda | Rosto |
| --- | --- | --- | --- | --- |
| 1 | Muito bem | #C9EBC0 | #7DBF6E | #1A4422 |
| 2 | Bem | #E1F0B5 | #A8C565 | #3A4C12 |
| 3 | Mais ou menos | #FCEBA4 | #D9BC4E | #5A4508 |
| 4 | Não muito bem | #FDD6B2 | #E3A061 | #6E340C |
| 5 | Mal | #F8C4B8 | #DD8574 | #702414 |
| 6 | Muito mal | #F3AEAE | #D46868 | #6E161C |

Grade de 3 colunas, rótulo embaixo em 18px negrito (vitrine e painel da família).

No check-in do idoso, os 6 níveis aparecem em **dois passos**, em opções de largura inteira (rostinho de 80px + rótulo Nunito 800 26px, altura mínima 104px, radius 28px, borda 1.5px #DDD5C8; escolhida: 2.5px #0F5E5A):
1. Bem (2) / Mais ou menos (3) / Mal (5);
2. a mais perto entre duas: Muito bem/Bem, Mais ou menos/Não muito bem, Mal/Muito mal, com "Voltar".

Depois, "Você escolheu: …" fica 5 segundos com "Está certo" e "Mudar resposta" antes de guardar sozinho.

## Paisagem dia / noite

Ilustração em SVG no topo do Início, do Check-in, da Hora do remédio e do Painel da família: céu em degradê, sol (dia) ou lua e estrelas (noite), dois morros e, no Início, uma faixa de água. Cantos inferiores arredondados (32px) quando é cabeçalho; radius 28px quando é cartão.

| Elemento | Dia | Noite |
| --- | --- | --- |
| céu (topo → base) | #FFF3D4 → #FFD9B0 | #1E2A4A → #3A4778 |
| sol / lua | sol #FFC94D com halo #FFE7A6 | lua crescente #F4ECCB + estrelas brancas |
| morro de trás | #9BD6BC | #2F5D58 |
| morro da frente | #4FA98C | #1F4642 |
| água | #8FCBE0 | #28406A |
| texto sobre a paisagem | #1C2321 | #FFFFFF |
| botão sobre a paisagem | verde #0F5E5A, texto branco | branco, texto #0A4441 |

Troca automática pela hora local do aparelho: dia das 6h às 18h; noite das 18h às 6h. Saudação: "Bom dia" / "Boa tarde" / "Boa noite".

## Marca

Símbolo de três pétalas (pêssego #E8875A, verde-petróleo #0F5E5A, lilás #7C6BD6) + palavra "Cuida" em Nunito 800. No app da família: "Cuida Família", com "Família" em #3E4744.

## Padrões do app do idoso

- **"Preciso de ajuda" fica num rodapé fixo** (fundo #FBF8F3, borda superior 1.5px #DDD5C8), fora da rolagem, no Início e no Check-in. Ao tocar, abre 5 segundos de contagem com "Cancelar" (botão de 90px) e "Avisar agora".
- **Código de acesso:** 4 caixinhas de 68×84px (radius 20px, borda 2px #A9B3AF; preenchida ou da vez: #0F5E5A, a da vez com 3.5px), tracinho #3E4744 quando vazia. Nada de texto de exemplo que pareça número digitado.
- **Botão desligado:** fundo #DDD5C8 e texto #3E4744 (6,6:1), sem transparência.
- **Barras de remédios do dia:** tomada cheia #0F5E5A; falta só com contorno 2px #0F5E5A e fundo branco.
- **"Tomei":** depois do toque, um ✓ grande ("Anotado!") por 2 segundos, além da fala.

## Regras de acessibilidade
- Contraste mínimo 4.5:1 em todo texto (3:1 só em títulos de 24px ou mais).
- Cor nunca é a única informação: status sempre com texto ("Tomou", "Pendente", "Alerta crítico").
- Botões de verdade (button/link), com rótulo acessível em botões só de ícone.
- Nada de emoji na interface; usar ícones em SVG.
