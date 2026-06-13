import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const expo = new Expo();

export async function sendTrialExpiryNotifications() {
  const today = new Date();
  const ALERT_DAYS = [7, 3, 1];

  for (const daysAhead of ALERT_DAYS) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().split('T')[0];

    // Get subscriptions with trial ending on this date
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, name, user_id, trial_ends_on')
      .eq('is_trial', true)
      .eq('is_active', true)
      .eq('trial_ends_on', dateStr);

    if (!subs?.length) continue;

    // For each sub, get the user's push token
    for (const sub of subs) {
      const { data: prefs } = await supabase
        .from('notification_prefs')
        .select('push_token, enabled')
        .eq('user_id', sub.user_id)
        .single();

      if (!prefs?.enabled || !prefs.push_token) continue;
      if (!Expo.isExpoPushToken(prefs.push_token)) continue;

      const urgency = daysAhead === 1 ? '⚠️ Tomorrow!' : `in ${daysAhead} days`;
      await expo.sendPushNotificationsAsync([{
        to: prefs.push_token,
        title: `🧪 ${sub.name} trial ends ${urgency}`,
        body: daysAhead === 1
          ? `Your free trial ends tomorrow. Cancel now to avoid being charged.`
          : `Your free trial ends in ${daysAhead} days. Review before it converts to paid.`,
        data: { subscriptionId: sub.id, type: 'trial_expiry' },
        priority: daysAhead === 1 ? 'high' : 'normal',
      }]);
    }
  }
  console.log('[TrialNotifications] Done');
}
