import { Subscription } from '../types/database';

// Notifications require a development build — stubbed out for Expo Go.
export async function registerForPushNotificationsAsync(): Promise<string | null> { return null; }
export async function savePushToken(_token: string): Promise<void> {}
export async function scheduleRenewalReminders(_subscriptions: Subscription[]): Promise<void> {}
