import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  scheduleRenewalReminders,
} from '../lib/notifications';

/**
 * Registers the device for push once the user is signed in and keeps local
 * renewal reminders in sync with their subscriptions. No-ops on web and on
 * simulators (see notifications.ts guards).
 */
export function useNotifications() {
  const session = useAuthStore((s) => s.session);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const userId = session?.user?.id;

  // Register for push + persist the token when a user logs in.
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) await savePushToken(token);
    })();
  }, [userId]);

  // Re-schedule local renewal reminders whenever the subscription list changes.
  useEffect(() => {
    if (!userId) return;
    scheduleRenewalReminders(subscriptions);
  }, [userId, subscriptions]);
}
