import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  scheduleRenewalReminders,
  getNotificationsEnabled,
  cancelAllReminders,
} from '../lib/notifications';

/**
 * Keeps push registration and local renewal reminders in sync with the user's
 * notification preference. Everything here is gated on that preference, so a
 * user who opted out is never re-registered, re-prompted, or re-scheduled.
 * No-ops on web and on simulators (see notifications.ts guards).
 */
export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const userId = session?.user?.id;

  // Refresh this device's push token — only for users who opted in.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      if (!(await getNotificationsEnabled())) return;
      const token = await registerForPushNotificationsAsync();
      if (!cancelled && token) await savePushToken(token);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Re-schedule local renewal reminders whenever the subscription list changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const enabled = await getNotificationsEnabled();
      if (cancelled) return;
      if (!enabled) {
        await cancelAllReminders();
        return;
      }
      await scheduleRenewalReminders(subscriptions);
    })();
    return () => { cancelled = true; };
  }, [userId, subscriptions]);
}
