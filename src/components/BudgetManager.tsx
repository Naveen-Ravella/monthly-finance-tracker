"use client";

import { useState, useMemo } from 'react';
import { Transaction, Budget, expenseCategories } from '@/types/finance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface BudgetManagerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onAddBudget: (budget: Budget) => void;
  onDeleteBudget: (category: string) => void;
}

export function BudgetManager({ budgets, transactions, onAddBudget, onDeleteBudget }: BudgetManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const { formatAmount } = useCurrency();

  // Calculate current month spending by category
  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const spending: Record<string, number> = {};

    transactions.forEach((transaction) => {
      if (
      transaction.type === 'expense' &&
      isWithinInterval(transaction.date, { start: monthStart, end: monthEnd }))
      {
        spending[transaction.category] = (spending[transaction.category] || 0) + transaction.amount;
      }
    });

    return spending;
  }, [transactions]);

  const handleAddBudget = () => {
    if (selectedCategory && budgetAmount && Number(budgetAmount) > 0) {
      onAddBudget({
        category: selectedCategory,
        limit: Number(budgetAmount)
      });
      setSelectedCategory('');
      setBudgetAmount('');
    }
  };

  // Get available categories that don't have budgets yet
  const availableCategories = expenseCategories.filter(
    (category) => !budgets.find((b) => b.category === category)
  );

  // Calculate budget status for each budget
  const budgetStatuses = useMemo(() => {
    return budgets.map((budget) => {
      const spent = currentMonthSpending[budget.category] || 0;
      const percentage = spent / budget.limit * 100;
      const remaining = budget.limit - spent;

      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (percentage >= 100) {
        status = 'danger';
      } else if (percentage >= 80) {
        status = 'warning';
      }

      return {
        ...budget,
        spent,
        percentage: Math.min(percentage, 100),
        remaining,
        status
      };
    });
  }, [budgets, currentMonthSpending]);

  // Check for any budget alerts
  const hasAlerts = budgetStatuses.some((budget) => budget.status !== 'safe');

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {hasAlerts &&
      <Alert variant="destructive" className="border-destructive/50">
          <AlertCircle className="h-4 w-4 text-white" />
          <AlertDescription className="text-white">
            You have {budgetStatuses.filter((b) => b.status === 'danger').length} budget(s) exceeded and{' '}
            {budgetStatuses.filter((b) => b.status === 'warning').length} budget(s) near limit this month.
          </AlertDescription>
        </Alert>
      }

      {/* Add Budget Form - Platinum */}
      <Card className="p-4 platinum-luxury border-white/40 !border-transparent">
        <h3 className="text-lg font-semibold mb-4 text-white">Add Budget</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full border-2 border-white text-white">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-2 border-white text-white">
              {availableCategories.length === 0 ?
              <SelectItem value="none" disabled className="text-white">
                  All categories have budgets
                </SelectItem> :

              availableCategories.map((category) =>
              <SelectItem key={category} value={category} className="cursor-pointer text-white">
                    {category}
                  </SelectItem>
              )
              }
            </SelectContent>
          </Select>

          <Input
            type="number"
            step="0.01"
            placeholder="Budget limit"
            value={budgetAmount}
            onChange={(e) => setBudgetAmount(e.target.value)}
            className="border-2 border-white text-white placeholder:text-white/50" />


          <Button
            onClick={handleAddBudget}
            disabled={!selectedCategory || !budgetAmount}
            className="platinum-button text-black font-bold hover:text-black">

            <PlusCircle className="mr-2 h-4 w-4" />
            Add Budget
          </Button>
        </div>
      </Card>

      {/* Budget List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Current Month Budgets</h3>
        {budgetStatuses.length === 0 ?
        <Card className="p-8 text-center platinum-luxury border-white/40 !border-transparent">
            <p className="text-white/50">No budgets set. Add a budget to track your spending.</p>
          </Card> :

        <div className="space-y-3">
            {budgetStatuses.map((budget) =>
          <Card key={budget.category} className="p-4 platinum-luxury border-white/40 !border-transparent">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{budget.category}</h4>
                        {budget.status === 'danger' &&
                    <Badge variant="destructive">Over Budget</Badge>
                    }
                        {budget.status === 'warning' &&
                    <Badge className="bg-orange-500">Near Limit</Badge>
                    }
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-bold text-white">
                          {formatAmount(budget.spent)}
                        </span>
                        <span className="text-sm text-white/60">
                          / {formatAmount(budget.limit)}
                        </span>
                      </div>
                    </div>
                    <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteBudget(budget.category)}
                  className="text-white hover:text-white hover:bg-destructive/20">

                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Progress
                  value={budget.percentage}
                  className={
                  budget.status === 'danger' ?
                  '[&>div]:bg-destructive' :
                  budget.status === 'warning' ?
                  '[&>div]:bg-orange-500' :
                  ''
                  } />

                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">
                        {budget.percentage.toFixed(1)}% used
                      </span>
                      <span className={budget.remaining >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {budget.remaining >= 0 ? `${formatAmount(budget.remaining)} remaining` : `${formatAmount(Math.abs(budget.remaining))} over`}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
          )}
          </div>
        }
      </div>
    </div>);

}