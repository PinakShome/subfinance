import { Platform } from 'react-native';
import { Subscription } from '../types/database';
import { totalMonthlySpend, formatCurrency, daysUntilRenewal } from './subscriptionUtils';

const APP_GROUP = 'group.com.subfinance.app';

/**
 * Push a small summary (monthly total + next renewal) to the iOS home-screen
 * widget via the shared app group, then ask WidgetKit to reload.
 *
 * Fully optional: a no-op on Android, and guarded so it does nothing when the
 * @bacons/apple-targets native module / widget target isn't in the build (e.g.
 * Expo Go or before `expo prebuild`). Never throws.
 */
export function updateWidget(subscriptions: Subscription[], currency: string): void {
  if (Platform.OS !== 'ios') return;

  let ExtensionStorage: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch {
    return; // native target not present in this build
  }
  if (!ExtensionStorage) return;

  try {
    const total = totalMonthlySpend(subscriptions, currency);
    const next = subscriptions
      .filter((s) => s.is_active && s.next_renewal)
      .map((s) => ({ s, d: daysUntilRenewal(s.next_renewal) }))
      .filter((x) => x.d >= 0)
      .sort((a, b) => a.d - b.d)[0];

    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('monthlyTotal', formatCurrency(total, currency, 0));
    if (next) {
      storage.set('nextName', next.s.name);
      storage.set('nextWhen', next.d === 0 ? 'Today' : `in ${next.d}d`);
    } else {
      storage.set('nextName', 'No upcoming renewals');
      storage.set('nextWhen', '');
    }
    ExtensionStorage.reloadWidget();
  } catch {
    /* no-op */
  }
}
