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

/** Reagenda todos os alarmes a partir das doses não confirmadas. */
export async function agendarAlarmes(doses: DoseComRemedio[]): Promise<void> {
  if (!(await preparar())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
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
          data: { doseId: dose.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, channelId: 'alarmes' },
      });
    }
  }
}
