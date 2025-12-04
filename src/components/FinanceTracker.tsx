"use client"

import { useState, useEffect, useRef } from 'react';
import { Transaction, Budget, RecurringTransaction } from '@/types/finance';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionList } from '@/components/TransactionList';
import { BudgetManager } from '@/components/BudgetManager';
import { FinanceDashboard } from '@/components/FinanceDashboard';
import { RecurringTransactionForm } from '@/components/RecurringTransactionForm';
import { RecurringTransactionManager } from '@/components/RecurringTransactionManager';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { generateDueTransactions } from '@/lib/recurring-utils';
import { CurrencyProvider, useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { currencies, CurrencyCode } from '@/types/currency';
import { DollarSign } from 'lucide-react';

function FinanceTrackerContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const { currency, setCurrency } = useCurrency();

  const handleAddTransaction = (data: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: Date.now().toString()
    };
    setTransactions((prev) => [...prev, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddBudget = (budget: Budget) => {
    setBudgets((prev) => {
      const existing = prev.find((b) => b.category === budget.category);
      if (existing) {
        return prev.map((b) => (b.category === budget.category ? budget : b));
      }
      return [...prev, budget];
    });
  };

  const handleDeleteBudget = (category: string) => {
    setBudgets((prev) => prev.filter((b) => b.category !== category));
  };

  const handleAddRecurring = (data: Omit<RecurringTransaction, 'id' | 'lastGenerated'>) => {
    const newRecurring: RecurringTransaction = {
      ...data,
      id: Date.now().toString(),
      lastGenerated: undefined
    };
    setRecurringTransactions((prev) => [...prev, newRecurring]);
  };

  const handleDeleteRecurring = (id: string) => {
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id));
    setTransactions((prev) => prev.filter((t) => t.recurringId !== id));
  };

  const handleToggleActive = (id: string) => {
    setRecurringTransactions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="min-h-screen bg-background metallic-dark-bg">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header - Platinum Styling */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Personal Finance Tracker
            </h1>
            <p className="text-white/70 tracking-wide">
              Track your income and expenses, manage budgets, and visualize your financial health
            </p>
          </div>
          
          {/* Currency Selector */}
          <div className="flex items-center gap-3 platinum-luxury px-4 py-2 rounded-lg border-2 border-white/40">
            <DollarSign className="h-5 w-5 text-white" />
            <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
              <SelectTrigger className="w-[160px] h-9 bg-background/30 border-2 border-white text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-white text-white">
                {Object.values(currencies).map((curr) => (
                  <SelectItem key={curr.code} value={curr.code} className="cursor-pointer text-white">
                    {curr.symbol} {curr.code} - {curr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid platinum-luxury border-2 border-white/40 p-1">
            <TabsTrigger 
              value="dashboard"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold transition-all"
            >
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="add"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold transition-all"
            >
              Add Transaction
            </TabsTrigger>
            <TabsTrigger 
              value="budgets"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold transition-all"
            >
              Budgets
            </TabsTrigger>
            <TabsTrigger 
              value="recurring"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold transition-all"
            >
              Recurring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <FinanceDashboard 
              transactions={transactions} 
              onDeleteTransaction={handleDeleteTransaction}
            />
          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetManager
              budgets={budgets}
              transactions={transactions}
              onAddBudget={handleAddBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 platinum-luxury border-primary/40">
                <h2 className="text-2xl font-bold mb-6 tracking-tight text-white">Create Recurring Transaction</h2>
                <RecurringTransactionForm onAddRecurring={handleAddRecurring} />
              </Card>
              <div>
                <RecurringTransactionManager
                  recurringTransactions={recurringTransactions}
                  onDeleteRecurring={handleDeleteRecurring}
                  onToggleActive={handleToggleActive}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-6">
            <Card className="p-6 max-w-2xl mx-auto platinum-luxury border-primary/40">
              <h2 className="text-2xl font-bold mb-6 tracking-tight text-white">Add New Transaction</h2>
              <TransactionForm onAddTransaction={handleAddTransaction} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export function FinanceTracker() {
  return (
    <CurrencyProvider>
      <FinanceTrackerContent />
    </CurrencyProvider>
  );
}