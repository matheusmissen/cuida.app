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
   - celular desconectado.
3. Para mostrar a escalada para o grupo, convide uma segunda conta como acompanhante (Ajustes → Grupo de cuidado).
4. Antes de rodar, cadastre um remédio para daqui a 2 ou 3 minutos (Remédios → Adicionar), para o alarme tocar durante a gravação.
5. Use duas telas: o app da família num navegador e o app do idoso em outro (ou no celular, instalado).

## Roteiro do vídeo (até 3 minutos)

| Tempo | Cena | O que mostrar |
| --- | --- | --- |
| 0:00–0:15 | O problema | Idosos que moram sozinhos; a família longe não sabe se o remédio foi tomado nem como a pessoa está. |
| 0:15–0:40 | Família conecta o celular | Painel da Dona Maria → "Conectar o celular" → "Mostrar o código". No app do idoso, digitar os 4 números. A família vê "Pronto!". |
| 0:40–1:00 | Consentimento (LGPD) | No idoso: as 3 permissões, cada uma com o seu "Concordo". Na família, em Ajustes → Grupo de cuidado, aparecem as respostas. |
| 1:00–1:40 | Check-in com rostinhos | O idoso toca em "Mal". A Lia entra na conversa e ele diz "tô quentinha". Na família chega o alerta vermelho: febre em tratamento de leucemia. |
| 1:40–2:30 | Remédio esquecido | O alarme toca no idoso e ninguém toca em "Tomei". Depois de 1 minuto, o responsável recebe o alerta laranja. A tela do alerta mostra "Reenviar lembrete" e "Ligar". Sem ação em mais 1 minuto, a acompanhante também é avisada. |
| 2:30–2:50 | "Tomei" e ajuda | O idoso toca em "Tomei" e o alerta se resolve sozinho. Mostrar o botão "Preciso de ajuda". |
| 2:50–3:00 | Fechamento | As regras de alerta são código fixo e testado (a IA só entende a fala); se a IA cair, alarmes e alertas continuam. |

## Para os jurados

1. No app da família, entre com a conta de demonstração (os dados de acesso vão no formulário de envio).
2. Toque em "Conectar o celular" e depois em "Mostrar o código".
3. Abra o app do idoso em outra aba, ou no celular, e digite o código.
4. Faça o check-in, converse com a Lia e espere o próximo remédio. Os alertas chegam no painel da família em até 1 minuto.

Se outra pessoa conectar o celular depois, o celular anterior é desconectado. Para começar do zero, rode de novo o script `preparar_demo.sql`.
