import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { Subscription } from '../types/database';

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for permission and return this device's Expo push token, or null if
 * unavailable (web, simulator, denied permission, or no EAS projectId).
 * The token is what the backend cron sends trial-expiry pushes to.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo push tokens are native-only.
  if (Platform.OS === 'web') return null;
  // Physical device required — simulators/emulators can't receive push.
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId;
  if (!projectId) {
    console.warn('[notifications] No EAS projectId — run `eas init` to enable push.');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (e) {
    console.warn('[notifications] Could not get Expo push token', e);
    return null;
  }
}

/** Read whether the current user has notifications enabled (defaults to on). */
export async function getNotificationsEnabled(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('notification_prefs')
    .select('enabled')
    .eq('user_id', user.id)
    .maybeSingle();
  // No row yet = not configured; treat as off until the user opts in.
  return data?.enabled ?? false;
}

/**
 * Turn notifications on/off. Enabling requests permission and registers this
 * device's push token; disabling clears any scheduled local reminders.
 * Returns the effective enabled state (enabling can fail if permission is
 * denied or push isn't available on this platform).
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
    await supabase
      .from('notification_prefs')
      .upsert({ user_id: user.id, enabled: false }, { onConflict: 'user_id' });
    return false;
  }

  const token = await registerForPushNotificationsAsync();
  await supabase.from('notification_prefs').upsert(
    { user_id: user.id, enabled: true, ...(token ? { push_token: token } : {}) },
    { onConflict: 'user_id' },
  );
  return true;
}

/**
 * Persist the push token so the backend can target this user. Deliberately
 * preserves the existing `enabled` preference — writing `true` here would
 * silently re-enable notifications for someone who turned them off.
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase
    .from('notification_prefs')
    .select('enabled')
    .eq('user_id', user.id)
    .maybeSingle();
  await supabase
    .from('notification_prefs')
    .upsert(
      { user_id: user.id, push_token: token, enabled: existing?.enabled ?? false },
      { onConflict: 'user_id' },
    );
}

/** Clear every pending local reminder (used on sign-out and when opting out). */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

/**
 * Schedule on-device reminders a few days before each subscription renews.
 * (Trial-expiry alerts are handled server-side by the backend cron; this
 * covers ordinary renewals so the user can cancel in time.)
 */
export async function scheduleRenewalReminders(subscriptions: Subscription[]): Promise<void> {
  if (Platform.OS === 'web') return;

  // Rebuild the full schedule from scratch each time subscriptions change.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const REMIND_DAYS = [3, 1];
  // iOS keeps at most 64 pending local notifications and silently drops the
  // rest, so schedule the soonest renewals first and stay under the cap.
  const MAX_SCHEDULED = 60;
  let scheduled = 0;

  const upcomingFirst = [...subscriptions].sort((a, b) =>
    (a.next_renewal ?? '').localeCompare(b.next_renewal ?? ''),
  );

  for (const sub of upcomingFirst) {
    if (scheduled >= MAX_SCHEDULED) break;
    if (!sub.is_active || !sub.next_renewal) continue;

    // Fire at 9am local, N days before the renewal date.
    const renewal = new Date(`${sub.next_renewal}T09:00:00`);
    if (isNaN(renewal.getTime())) continue;

    for (const days of REMIND_DAYS) {
      if (scheduled >= MAX_SCHEDULED) break;
      const fireAt = new Date(renewal);
      fireAt.setDate(fireAt.getDate() - days);
      if (fireAt.getTime() <= Date.now()) continue;

      const when = days === 1 ? 'tomorrow' : `in ${days} days`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${sub.name} renews ${when}`,
          body: `${sub.currency} ${sub.cost.toFixed(2)} is due ${when}. Cancel now if you no longer need it.`,
          data: { subscriptionId: sub.id, type: 'renewal' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
      });
      scheduled += 1;
    }
  }
}
