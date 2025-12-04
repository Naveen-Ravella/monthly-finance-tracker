"use client"

import { createContext, useContext, useState, ReactNode } from 'react';
import { CurrencyCode, currencies } from '@/types/currency';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatAmount: (amount: number) => string;
  getSymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>('INR');

  const formatAmount = (amount: number) => {
    const curr = currencies[currency];
    const convertedAmount = amount * curr.exchangeRate;
    return `${curr.symbol}${convertedAmount.toFixed(2)}`;
  };

  const getSymbol = () => currencies[currency].symbol;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, getSymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}
