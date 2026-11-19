// Alarmes locais do celular: tocam mesmo sem internet e com o app fechado.
// No horário e de novo aos 30 min (regra de dose sem confirmação).
import { horaCurta, instantesDeAlarme, type DoseComRemedio } from '@cuida/cliente';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let preparado = false;

async function preparar(): Promise<boolean> {
  if (preparado) return true;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarmes', {
      name: 'Alarmes de remédio',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 800, 400, 800],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  preparado = status === 'granted';
  return preparado;
}

type Tipo = 'dose' | 'checkin' | 'adiado';

/** Cancela só as notificações agendadas de um tipo (doses e check-in são reagendados separadamente). */
async function cancelarTipo(tipo: Tipo): Promise<void> {
  const agendadas = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    agendadas
      .filter((n) => (n.content.data?.tipo ?? 'dose') === tipo)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Reagenda os lembretes do check-in diário (a Lia chama no horário e 30 min depois). */
export async function agendarCheckin(instantes: Date[]): Promise<void> {
  if (!(await preparar())) return;
  await cancelarTipo('checkin');
  for (const [i, quando] of instantes.entries()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'A Lia quer saber como você está',
        body: i % 2 === 0 ? 'Abra o Cuida para conversar com a Lia.' : 'Ainda não conversamos hoje. Abra o Cuida.',
        sound: 'default',
        data: { tipo: 'checkin' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: 'alarmes' },
    });
  }
}

/** Reagenda todos os alarmes de remédio a partir das doses não confirmadas. */
export async function agendarAlarmes(doses: DoseComRemedio[]): Promise<void> {
  if (!(await preparar())) return;
  await cancelarTipo('dose');
  const agora = new Date();
  for (const dose of doses) {
    const remedio = dose.horarios.remedios;
    for (const [i, quando] of instantesDeAlarme(dose, agora).entries()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: i === 0 ? 'Hora do remédio' : 'Ainda falta tomar o remédio',
          body: `${remedio.nome} — ${remedio.dose} (${horaCurta(dose.previsto_em)}). Abra e aperte "Tomei".`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { tipo: 'dose', doseId: dose.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: 'alarmes' },
      });
    }
  }
}

/** "Me lembre daqui a 10 minutos": um alarme só, que não é apagado quando os alarmes das doses são refeitos. */
export async function agendarAdiado(dose: DoseComRemedio, quando: Date): Promise<void> {
  if (!(await preparar())) return;
  const remedio = dose.horarios.remedios;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hora do remédio',
      body: `${remedio.nome} — ${remedio.dose}. Abra e aperte "Tomei".`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { tipo: 'adiado', doseId: dose.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: 'alarmes' },
  });
}
