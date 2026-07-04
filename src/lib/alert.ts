import { Alert, Platform } from 'react-native';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert.
 *
 * On iOS/Android this delegates to React Native's Alert. On web, RN Web's
 * Alert.alert ignores the buttons array and never fires their onPress
 * callbacks — which silently breaks confirmations (sign out, remove
 * subscription) and hides error/validation messages. So on web we fall back
 * to the browser's window.alert / window.confirm and invoke the matching
 * button's onPress ourselves.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // Simple message (0-1 buttons): show it, then run the single action if any.
  if (!buttons || buttons.length <= 1) {
    if (typeof window !== 'undefined') window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Confirmation (2+ buttons): the non-cancel button is the confirm action.
  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const ok = typeof window !== 'undefined' ? window.confirm(text) : true;
  if (ok) confirmBtn?.onPress?.();
  else cancelBtn?.onPress?.();
}
