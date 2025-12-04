"use client";

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
import { toast } from 'sonner';

function FinanceTrackerContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currency, setCurrency } = useCurrency();

  // Fetch all data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch transactions
        const transactionsRes = await fetch('/api/transactions');
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json();
          setTransactions(transactionsData);
        }

        // Fetch budgets
        const budgetsRes = await fetch('/api/budgets');
        if (budgetsRes.ok) {
          const budgetsData = await budgetsRes.json();
          setBudgets(budgetsData);
        }

        // Fetch recurring transactions
        const recurringRes = await fetch('/api/recurring');
        if (recurringRes.ok) {
          const recurringData = await recurringRes.json();
          setRecurringTransactions(recurringData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process recurring transactions and generate due transactions
  useEffect(() => {
    const processRecurringTransactions = async () => {
      if (isLoading || recurringTransactions.length === 0) return;

      const activeRecurring = recurringTransactions.filter((r) => r.isActive);
      if (activeRecurring.length === 0) return;

      let hasNewTransactions = false;

      for (const recurring of activeRecurring) {
        // Generate due transactions for this recurring transaction
        const dueTransactions = generateDueTransactions(recurring, new Date());

        if (dueTransactions.length > 0) {
          // Save each generated transaction
          for (const transaction of dueTransactions) {
            try {
              const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...transaction,
                  recurringId: recurring.id
                })
              });

              if (response.ok) {
                const newTransaction = await response.json();
                setTransactions((prev) => [...prev, newTransaction]);
                hasNewTransactions = true;
              }
            } catch (error) {
              console.error('Error creating transaction from recurring:', error);
            }
          }

          // Update lastGenerated date for the recurring transaction
          try {
            const response = await fetch(`/api/recurring?id=${recurring.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lastGenerated: new Date().toISOString()
              })
            });

            if (response.ok) {
              const updated = await response.json();
              setRecurringTransactions((prev) =>
              prev.map((r) => r.id === recurring.id ? updated : r)
              );
            }
          } catch (error) {
            console.error('Error updating recurring transaction:', error);
          }
        }
      }

      if (hasNewTransactions) {
        toast.success('New recurring transactions have been added automatically');
      }
    };

    processRecurringTransactions();
  }, [recurringTransactions, isLoading]);

  const handleAddTransaction = async (data: Omit<Transaction, 'id'>) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to add transaction');
        return;
      }

      const newTransaction = await response.json();
      setTransactions((prev) => [...prev, newTransaction]);
      toast.success('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete transaction');
        return;
      }

      setTransactions((prev) => prev.filter((t) => t.id.toString() !== id));
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const handleAddBudget = async (budget: Budget) => {
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget)
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to save budget');
        return;
      }

      const savedBudget = await response.json();
      setBudgets((prev) => {
        const existing = prev.find((b) => b.category === savedBudget.category);
        if (existing) {
          return prev.map((b) => b.category === savedBudget.category ? savedBudget : b);
        }
        return [...prev, savedBudget];
      });
      toast.success('Budget saved successfully');
    } catch (error) {
      console.error('Error saving budget:', error);
      toast.error('Failed to save budget');
    }
  };

  const handleDeleteBudget = async (category: string) => {
    try {
      const response = await fetch(`/api/budgets?category=${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete budget');
        return;
      }

      setBudgets((prev) => prev.filter((b) => b.category !== category));
      toast.success('Budget deleted successfully');
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  const handleAddRecurring = async (data: Omit<RecurringTransaction, 'id' | 'lastGenerated'>) => {
    try {
      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to add recurring transaction');
        return;
      }

      const newRecurring = await response.json();
      setRecurringTransactions((prev) => [...prev, newRecurring]);
      toast.success('Recurring transaction added successfully');
    } catch (error) {
      console.error('Error adding recurring transaction:', error);
      toast.error('Failed to add recurring transaction');
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      const response = await fetch(`/api/recurring?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete recurring transaction');
        return;
      }

      setRecurringTransactions((prev) => prev.filter((r) => r.id.toString() !== id));
      setTransactions((prev) => prev.filter((t) => t.recurringId?.toString() !== id));
      toast.success('Recurring transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Failed to delete recurring transaction');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const recurring = recurringTransactions.find((r) => r.id.toString() === id);
      if (!recurring) return;

      const response = await fetch(`/api/recurring?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !recurring.isActive })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to toggle status');
        return;
      }

      const updated = await response.json();
      setRecurringTransactions((prev) =>
      prev.map((r) => r.id.toString() === id ? updated : r)
      );
      toast.success(`Recurring transaction ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling recurring transaction:', error);
      toast.error('Failed to toggle status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background metallic-dark-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>);

  }

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
                {Object.values(currencies).map((curr) =>
                <SelectItem key={curr.code} value={curr.code} className="cursor-pointer text-white">
                    {curr.symbol} {curr.code} - {curr.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:w-auto lg:inline-grid platinum-luxury border-2 border-white/40 p-1 !w-full !h-10">
            <TabsTrigger
              value="dashboard"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold data-[state=active]:border-2 data-[state=active]:border-white transition-all !w-[24.9%] !h-[30px]">

              Dashboard
            </TabsTrigger>
            <TabsTrigger
              value="add"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold data-[state=active]:border-2 data-[state=active]:border-white transition-all">

              Add Transaction
            </TabsTrigger>
            <TabsTrigger
              value="budgets"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold data-[state=active]:border-2 data-[state=active]:border-white transition-all">

              Budgets
            </TabsTrigger>
            <TabsTrigger
              value="recurring"
              className="text-white data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:font-semibold data-[state=active]:border-2 data-[state=active]:border-white transition-all">

              Recurring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <FinanceDashboard
              transactions={transactions}
              onDeleteTransaction={handleDeleteTransaction} />

          </TabsContent>

          <TabsContent value="budgets" className="space-y-6">
            <BudgetManager
              budgets={budgets}
              transactions={transactions}
              onAddBudget={handleAddBudget}
              onDeleteBudget={handleDeleteBudget} />

          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6 platinum-luxury">
                <h2 className="text-2xl font-bold mb-6 tracking-tight text-white">Create Recurring Transaction</h2>
                <RecurringTransactionForm onAddRecurring={handleAddRecurring} />
              </Card>
              <div>
                <RecurringTransactionManager
                  recurringTransactions={recurringTransactions}
                  onDeleteRecurring={handleDeleteRecurring}
                  onToggleActive={handleToggleActive} />

              </div>
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-6">
            <Card className="p-6 max-w-2xl mx-auto platinum-luxury">
              <h2 className="text-2xl font-bold mb-6 tracking-tight text-white">Add New Transaction</h2>
              <TransactionForm onAddTransaction={handleAddTransaction} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>);

}

export function FinanceTracker() {
  return (
    <CurrencyProvider>
      <FinanceTrackerContent />
    </CurrencyProvider>);

}