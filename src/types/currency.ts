export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate relative to INR
}

export const currencies: Record<CurrencyCode, Currency> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchangeRate: 1 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 0.012 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 0.011 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 0.0095 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', exchangeRate: 1.78 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', exchangeRate: 0.019 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', exchangeRate: 0.017 }
};

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const currency = currencies[currencyCode];
  const convertedAmount = amount * currency.exchangeRate;
  return `${currency.symbol}${convertedAmount.toFixed(2)}`;
}

export function convertCurrency(amount: number, fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number {
  // Convert to INR first, then to target currency
  const amountInINR = amount / currencies[fromCurrency].exchangeRate;
  return amountInINR * currencies[toCurrency].exchangeRate;
}
