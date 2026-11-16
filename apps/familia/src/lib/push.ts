// Registro do push da família (só em aparelho; na web os alertas chegam em tempo real na página).
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registrarPush(usuarioId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alertas', {
      name: 'Alertas de saúde',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push: configure o projectId do EAS (eas init) para receber alertas no celular.');
    return;
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.from('cuidadores').update({ expo_push_token: token }).eq('usuario_id', usuarioId);
}
