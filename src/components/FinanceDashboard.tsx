"use client";

import { useMemo, useState } from 'react';
import { Transaction } from '@/types/finance';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval, startOfYear, endOfYear, subYears, parseISO, isSameMonth, isSameYear } from 'date-fns';
import { TrendingUp, TrendingDown, Wallet, Calendar, Filter, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { expenseCategories, incomeCategories } from '@/types/finance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';

interface FinanceDashboardProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

const COLORS = ['#C0C0C8', '#A0A0AF', '#8C8CA0', '#B4B4C2', '#9696AA', '#ACACBA', '#8080A0', '#B8B8C8', '#9090A8'];

type PeriodType = 'year' | 'month' | 'overall';
type TransactionTypeFilter = 'all' | 'income' | 'expense';

const MONTHS = [
'January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];


export function FinanceDashboard({ transactions, onDeleteTransaction }: FinanceDashboardProps) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { formatAmount } = useCurrency();

  // Get all unique years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach((t) => {
      const date = typeof t.date === 'string' ? parseISO(t.date) : t.date;
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Get date range based on selected period
  const getDateRange = () => {
    if (periodType === 'overall') {
      return null;
    }

    if (periodType === 'month') {
      const date = new Date(selectedYear, selectedMonth, 1);
      return {
        start: startOfMonth(date),
        end: endOfMonth(date)
      };
    }

    if (periodType === 'year') {
      const yearDate = new Date(selectedYear, 0, 1);
      return {
        start: startOfYear(yearDate),
        end: endOfYear(yearDate)
      };
    }

    return null;
  };

  // Get available categories based on type filter
  const availableCategories = useMemo(() => {
    if (typeFilter === 'income') return incomeCategories;
    if (typeFilter === 'expense') return expenseCategories;
    // For 'all', combine both
    return [...new Set([...incomeCategories, ...expenseCategories])].sort();
  }, [typeFilter]);

  // Reset category filter when type changes
  const handleTypeFilterChange = (value: TransactionTypeFilter) => {
    setTypeFilter(value);
    setCategoryFilter('all');
  };

  // Filtered transactions for display
  const filteredTransactionsForDisplay = useMemo(() => {
    const dateRange = getDateRange();

    return transactions.filter((transaction) => {
      const date = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;
      const inRange = dateRange ?
      isWithinInterval(date, dateRange) :
      true;

      // Apply type filter
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      // Apply category filter
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;

      return inRange && matchesType && matchesCategory;
    }).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? parseISO(a.date) : a.date;
      const dateB = typeof b.date === 'string' ? parseISO(b.date) : b.date;
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions, periodType, selectedMonth, selectedYear, typeFilter, categoryFilter]);

  // Calculate income and expense for selected period with filters
  const periodStats = useMemo(() => {
    const dateRange = getDateRange();

    let income = 0;
    let expense = 0;

    transactions.forEach((transaction) => {
      const date = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;
      const inRange = dateRange ?
      isWithinInterval(date, dateRange) :
      true;

      // Apply type filter
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      // Apply category filter
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;

      if (inRange && matchesType && matchesCategory) {
        if (transaction.type === 'income') {
          income += transaction.amount;
        } else if (transaction.type === 'expense') {
          expense += transaction.amount;
        }
      }
    });

    const netWorth = income - expense;

    return { income, expense, netWorth };
  }, [transactions, periodType, selectedMonth, selectedYear, typeFilter, categoryFilter]);

  // Calculate expense breakdown by category for selected period with filters
  const expenseBreakdown = useMemo(() => {
    const dateRange = getDateRange();
    const categoryTotals: Record<string, number> = {};

    transactions.forEach((transaction) => {
      if (transaction.type === 'expense') {
        const date = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;
        const inRange = dateRange ?
        isWithinInterval(date, dateRange) :
        true;

        // Apply type filter (only expense for breakdown)
        const matchesType = typeFilter === 'all' || typeFilter === 'expense';

        // Apply category filter
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;

        if (inRange && matchesType && matchesCategory) {
          categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
        }
      }
    });

    return Object.entries(categoryTotals).
    map(([name, value]) => ({ name, value })).
    sort((a, b) => b.value - a.value);
  }, [transactions, periodType, selectedMonth, selectedYear, typeFilter, categoryFilter]);

  // Calculate overall stats (Total Net Worth - all time)
  const overallStats = useMemo(() => {
    const totalIncome = transactions.
    filter((t) => t.type === 'income').
    reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions.
    filter((t) => t.type === 'expense').
    reduce((sum, t) => sum + t.amount, 0);

    const netWorth = totalIncome - totalExpense;

    return {
      netWorth,
      savingsRate: periodStats.income > 0 ? (periodStats.income - periodStats.expense) / periodStats.income * 100 : 0
    };
  }, [transactions, periodStats]);

  const getPeriodLabel = () => {
    if (periodType === 'overall') {
      return 'All Time';
    }
    if (periodType === 'month') {
      return `${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    if (periodType === 'year') {
      return selectedYear.toString();
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Total Net Worth - Luxurious Platinum Card */}
      <Card className="p-8 platinum-luxury border-white/40 !border-transparent">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white uppercase tracking-[0.15em] letter-spacing-wide">Total Net Worth</h3>
          <Wallet className="h-7 w-7 text-white" />
        </div>
        <p className={`text-5xl font-bold tracking-tight ${overallStats.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatAmount(overallStats.netWorth)}
        </p>
        <p className="text-sm text-white/70 mt-2 font-light tracking-wide">Lifetime balance</p>
      </Card>

      {/* Filters - Platinum */}
      <Card className="p-5 platinum-luxury border-white/40">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Period Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-5 w-5 text-white flex-shrink-0" />
            
            {/* Year Dropdown */}
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => {
                setSelectedYear(Number(value));
                setPeriodType('year');
              }}>

              <SelectTrigger className={cn(
                "w-[110px] h-9 bg-background/30 border-2 border-white transition-all text-white",
                periodType === 'year' && "platinum-select font-semibold"
              )}>
                <SelectValue>{selectedYear}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-white text-white">
                {availableYears.length === 0 ?
                <SelectItem value="0" disabled className="text-white">No data</SelectItem> :

                availableYears.map((year) =>
                <SelectItem
                  key={year}
                  value={year.toString()}
                  className={cn(
                    "cursor-pointer transition-colors text-white",
                    year === selectedYear && periodType === 'year' && "platinum-select font-semibold"
                  )}>

                      {year}
                    </SelectItem>
                )
                }
              </SelectContent>
            </Select>

            {/* Month Dropdown */}
            <Select
              value={periodType === 'month' ? selectedMonth.toString() : 'all'}
              onValueChange={(value) => {
                if (value === 'all') {
                  setPeriodType('year');
                } else {
                  setSelectedMonth(Number(value));
                  setPeriodType('month');
                }
              }}>

              <SelectTrigger className={cn(
                "w-[130px] h-9 bg-background/30 border-2 border-white transition-all text-white",
                periodType === 'month' && "platinum-select font-semibold"
              )}>
                <SelectValue>
                  {periodType === 'month' ? MONTHS[selectedMonth] : 'All Months'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-white text-white">
                <SelectItem value="all" className="cursor-pointer text-white">All Months</SelectItem>
                {MONTHS.map((month, index) =>
                <SelectItem
                  key={month}
                  value={index.toString()}
                  className={cn(
                    "cursor-pointer transition-colors text-white",
                    periodType === 'month' && index === selectedMonth && "platinum-select font-semibold"
                  )}>

                    {month}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Overall Button */}
            <button
              onClick={() => setPeriodType('overall')}
              className={cn(
                "h-9 px-4 rounded-md text-sm font-medium transition-all border-2",
                periodType === 'overall' ?
                "platinum-select font-semibold" :
                "bg-background/30 hover:bg-primary/20 border-white text-white"
              )}>

              Overall
            </button>
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-white/30" />

          {/* Type and Category Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-5 w-5 text-white flex-shrink-0" />
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-[120px] h-9 bg-background/30 border-2 border-white text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-white text-white">
                <SelectItem value="all" className="cursor-pointer text-white">All Types</SelectItem>
                <SelectItem value="income" className="cursor-pointer text-white">Income</SelectItem>
                <SelectItem value="expense" className="cursor-pointer text-white">Expenses</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9 bg-background/30 border-2 border-white text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-2 border-white text-white">
                <SelectItem value="all" className="cursor-pointer text-white">All Categories</SelectItem>
                {availableCategories.map((category) =>
                <SelectItem key={category} value={category} className="cursor-pointer text-white">
                    {category}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Period Label */}
          <div className="ml-auto">
            <span className="text-sm font-medium text-white px-3 py-1.5 rounded-md bg-primary/15 border-2 border-white/30">
              {getPeriodLabel()}
            </span>
          </div>
        </div>
      </Card>

      {/* Overview Stats - Platinum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 platinum-luxury border-white/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white uppercase tracking-[0.12em]">Net Worth</h3>
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <p className={`text-3xl font-bold ${periodStats.netWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatAmount(periodStats.netWorth)}
          </p>
          <p className="text-xs text-white/60 mt-1 font-light tracking-wide">{getPeriodLabel()}</p>
        </Card>

        <Card className="p-6 platinum-luxury border-white/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white uppercase tracking-[0.12em]">Income</h3>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">
            {formatAmount(periodStats.income)}
          </p>
          <p className="text-xs text-white/60 mt-1 font-light tracking-wide">{getPeriodLabel()}</p>
        </Card>

        <Card className="p-6 platinum-luxury border-white/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white uppercase tracking-[0.12em]">Expenses</h3>
            <TrendingDown className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400">
            {formatAmount(periodStats.expense)}
          </p>
          <p className="text-xs text-white/60 mt-1 font-light tracking-wide">
            Savings rate: {overallStats.savingsRate.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Charts - Platinum */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 platinum-luxury border-white/40">
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-white">Expense Breakdown</h3>
            <p className="text-sm text-white/60 font-light tracking-wide">{getPeriodLabel()}</p>
          </div>
          
          {expenseBreakdown.length === 0 ?
          <div className="h-[300px] flex items-center justify-center text-white/50">
              No expense data for {getPeriodLabel().toLowerCase()}
            </div> :

          <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value">

                  {expenseBreakdown.map((entry, index) =>
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                )}
                </Pie>
                <Tooltip formatter={(value: number) => formatAmount(value)} />
              </PieChart>
            </ResponsiveContainer>
          }
        </Card>

        <Card className="p-6 platinum-luxury border-white/40">
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-white">Top Spending Categories</h3>
            <p className="text-sm text-white/60 font-light tracking-wide">{getPeriodLabel()}</p>
          </div>
          {expenseBreakdown.length === 0 ?
          <p className="text-center text-white/50 py-4">No expenses recorded</p> :

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {expenseBreakdown.map((category, index) => {
              const total = expenseBreakdown.reduce((sum, cat) => sum + cat.value, 0);
              const percentage = category.value / total * 100;

              return (
                <div key={category.name} className="flex items-center gap-4 p-2 rounded-md hover:bg-primary/10 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                      className="w-4 h-4 rounded shadow-sm border border-primary/20"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} />

                      <span className="font-medium text-white">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatAmount(category.value)}</p>
                      <p className="text-xs text-white/60 font-light">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>);

            })}
            </div>
          }
        </Card>
      </div>

      {/* Transactions List - Platinum */}
      <Card className="p-6 platinum-luxury border-white/40">
        <div className="mb-4">
          <h3 className="text-lg font-semibold tracking-tight text-white">Recent Transactions</h3>
          <p className="text-sm text-white/60 font-light tracking-wide">
            {getPeriodLabel()} • {filteredTransactionsForDisplay.length} transaction{filteredTransactionsForDisplay.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {filteredTransactionsForDisplay.length === 0 ?
        <div className="text-center py-8 text-white/50">
            No transactions found for the selected filters
          </div> :

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {filteredTransactionsForDisplay.map((transaction) => {
            const transactionDate = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;

            return (
              <Card key={transaction.id} className="p-4 hover:shadow-lg hover:shadow-primary/5 transition-all bg-background/40 !border-transparent !border-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {transaction.type === 'income' ?
                    <ArrowUpCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" /> :

                    <ArrowDownCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white">{transaction.description}</h4>
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-white border-2 border-white/30">{transaction.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-white/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-white" />
                            {format(transactionDate, 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </span>
                      <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className="text-white hover:text-white hover:bg-destructive/20">

                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>);

          })}
          </div>
        }
      </Card>
    </div>);

}