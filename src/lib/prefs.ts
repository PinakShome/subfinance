import AsyncStorage from '@react-native-async-storage/async-storage';

/** Currencies offered in the picker and used to format amounts. */
export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
];

const DEFAULT_CURRENCY_KEY = 'pref.defaultCurrency';

/** The currency pre-selected when adding a new subscription. Falls back to USD. */
export async function getDefaultCurrency(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(DEFAULT_CURRENCY_KEY);
    return v ?? 'USD';
  } catch {
    return 'USD';
  }
}

export async function setDefaultCurrency(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DEFAULT_CURRENCY_KEY, code);
  } catch {
    /* non-fatal: the picker UI already reflects the choice */
  }
}
