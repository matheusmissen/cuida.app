// Check-in diário no app do idoso (sem React Native): testado em Node.
// Quando a Lia chama é decidido por situacaoDoCheckin (packages/regras), a mesma conta do servidor.
import { tentativasDoCheckin } from '@cuida/regras';
import { saudacao } from './formato.ts';
import type { CheckinLinha } from './tipos.ts';

const DIA = 24 * 60 * 60_000;

/** O que a Lia diz ao chamar para o check-in (tentativa 1 ou 2). */
export function fraseDoCheckin(apelido: string, tentativa: 1 | 2, agora: Date): string {
  return tentativa === 1
    ? `${saudacao(agora)}, ${apelido}! Vamos conversar um pouquinho? Como está se sentindo hoje?`
    : `${apelido}, ainda não conversamos hoje. Como está se sentindo? Aperte o botão azul para me responder.`;
}

/**
 * Instantes das notificações do check-in (celular): o lembrete de hoje e o de amanhã que ainda
 * estão no futuro. Se o check-in de hoje já foi feito, só o de amanhã.
 */
export function instantesDoCheckin(horario: string | null, agora: Date, feitoHoje: boolean): Date[] {
  if (!horario) return [];
  const hoje = feitoHoje ? [] : tentativasDoCheckin(horario, agora);
  const amanha = tentativasDoCheckin(horario, new Date(agora.getTime() + DIA));
  return [...hoje, ...amanha].filter((d) => d.getTime() > agora.getTime());
}

/**
 * O que chama atenção num check-in, em linguagem simples para a família.
 * Sinais de alerta primeiro. Lista vazia = nada fora do normal relatado.
 */
export function resumoDoCheckin(c: CheckinLinha): string[] {
  const temperatura = typeof c.temperatura === 'number' ? ` (${Number(c.temperatura).toFixed(1).replace('.', ',')} °C)` : '';
  const itens: [boolean, string][] = [
    [Boolean(c.queda), 'Queda'],
    [Boolean(c.dor_no_peito), 'Dor no peito'],
    [Boolean(c.falta_de_ar), 'Falta de ar'],
    [Boolean(c.febre), `Febre${temperatura}`],
    [Boolean(c.calafrio), 'Calafrio'],
    [Boolean(c.sangramento), 'Sangramento'],
    [Boolean(c.manchas), 'Manchas roxas'],
    [Boolean(c.sinais_infeccao), 'Sinais de infecção'],
    [c.cansaco === 'forte', 'Cansaço forte'],
    [c.humor === 'baixo', 'Humor baixo'],
    [Boolean(c.apetite_baixo), 'Pouco apetite'],
    [Boolean(c.nausea), 'Náusea'],
    [Boolean(c.confuso), 'Respostas confusas'],
  ];
  const lista = itens.filter(([sim]) => sim).map(([, texto]) => texto);
  if (!c.febre && temperatura) lista.push(`Temperatura${temperatura}`);
  return lista;
}
