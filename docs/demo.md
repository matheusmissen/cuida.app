# Demonstração do Cuida

Todos os dados são fictícios. "Dona Maria" não existe.

- App da família: https://cuida-app-familia.vercel.app
- App do idoso: https://cuida-app-idoso.vercel.app

## Antes de gravar (e antes da avaliação)

1. A conta de demonstração existe no Supabase (Authentication → Users), com e-mail `jurados@example.com`, já confirmada.
2. Rode `supabase/demo/preparar_demo.sql` no SQL Editor. Ele apaga e recria a Dona Maria dessa conta:
   - remédios às 8h, 12h e 20h;
   - uma semana de histórico;
   - modo demonstração ligado, com todos os tempos em 1 minuto;
   - a Bruna (neta), acompanhante fictícia, no grupo;
   - a Dona Maria já com as 3 permissões (para o alerta chegar à Bruna) e os termos aceitos na conta;
   - celular desconectado.

   Se quiser mostrar a tela de consentimento no primeiro acesso, troque `v_ja_consentiu` para `false` no início do script. Aí o alerta só chega à Bruna depois que a Dona Maria concordar com "mostrar para a família".
3. Rode o script de novo perto da avaliação: sem celular conectado, cada remédio vencido vira um alerta, e eles se acumulam.
4. Antes de rodar, cadastre um remédio para daqui a 2 ou 3 minutos (Remédios → Adicionar), para o alarme tocar durante a gravação.
5. Use duas telas: o app da família num navegador e o app do idoso em outro (ou no celular, instalado).
6. Para a cena do pedido médico, tenha à mão um papel fictício, por exemplo: "Retorno com Dra. Ana, hematologia, em 30 dias. Levar hemograma."

## Roteiro do vídeo (até 3 minutos)

| Tempo | Cena | O que mostrar |
| --- | --- | --- |
| 0:00–0:15 | O problema | Idosos que moram sozinhos; a família longe não sabe se o remédio foi tomado nem como a pessoa está. |
| 0:15–0:40 | Família conecta o celular | Painel da Dona Maria → "Conectar o celular" → "Mostrar o código". No app do idoso, digitar os 4 números. A família vê "Pronto!". |
| 0:40–1:00 | Consentimento (LGPD) | No idoso: as 3 permissões, cada uma com o seu "Concordo". Na família, em Ajustes → Grupo de cuidado, aparecem as respostas. |
| 1:00–1:40 | Check-in com rostinhos | O idoso toca em "Mal", depois em "Mal" de novo e em "Está certo". A Lia entra na conversa e ele diz "tô quentinha". Na família chega o alerta vermelho: febre em tratamento de leucemia. |
| 1:40–2:30 | Remédio esquecido | O alarme toca no idoso e ninguém toca em "Tomei". Depois de 1 minuto, o responsável recebe o alerta laranja. A tela do alerta mostra "Reenviar lembrete" e "Ligar". Sem ação em mais 1 minuto, a acompanhante também é avisada. |
| 2:30–2:45 | "Tomei" e ajuda | O idoso toca em "Tomei" e o alerta se resolve sozinho. Mostrar o botão "Preciso de ajuda" (fica fixo embaixo; ao tocar, há 5 segundos para cancelar). |
| 2:45–2:52 | Pedido médico | Na família: Arquivos → Pedidos → "Ler pedido". A Lia sugere data, médica e especialidade; a família escreve o horário e toca em "Criar consulta". |
| 2:52–3:00 | Fechamento | As regras de alerta são código fixo e testado (a IA só entende a fala); se a IA cair, alarmes e alertas continuam. |

## Para os jurados

1. No app da família, entre com a conta de demonstração (os dados de acesso vão no formulário de envio).
2. Toque em "Conectar o celular" e depois em "Mostrar o código".
3. Abra o app do idoso em outra aba, ou no celular, e digite o código.
Sem conectar nenhum celular, dá para ver o fluxo principal: quando um remédio vence sem "Tomei", o Lucas (a conta de demonstração) recebe o alerta laranja em até 1 minuto; se ninguém agir, 1 minuto depois o alerta sobe para o grupo e a tela do alerta mostra "Bruna (neta) · avisada às …".

4. Faça o check-in, converse com a Lia e espere o próximo remédio. Os alertas chegam no painel da família em até 1 minuto.
5. No alarme, "Lembrar em 10 minutos" faz o lembrete voltar como notificação, mesmo com o app fechado (se as notificações estiverem ligadas). A família continua sendo avisada no tempo normal: adiar não é tomar.
6. Em Arquivos, envie uma receita ou um pedido médico (foto ou PDF fictício). A Lia só sugere; nada vira alarme ou consulta sem a família conferir.

A conta de demonstração não pode ser apagada (o botão "Apagar minha conta" não aparece nela, e o servidor também recusa).

Se outra pessoa conectar o celular depois, o celular anterior é desconectado. Para começar do zero, rode de novo o script `preparar_demo.sql`.
