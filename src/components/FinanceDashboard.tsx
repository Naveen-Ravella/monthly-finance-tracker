"use client"

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

interface FinanceDashboardProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

const COLORS = ['#A8A8B0', '#8C8C98', '#707080', '#5C5C68', '#888890', '#9C9CA8', '#B0B0B8', '#7C7C88', '#6C6C78'];

type PeriodType = 'year' | 'month' | 'overall';
type TransactionTypeFilter = 'all' | 'income' | 'expense';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function FinanceDashboard({ transactions, onDeleteTransaction }: FinanceDashboardProps) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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
      const inRange = dateRange 
        ? isWithinInterval(date, dateRange)
        : true;

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
      const inRange = dateRange 
        ? isWithinInterval(date, dateRange)
        : true;

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
        const inRange = dateRange 
          ? isWithinInterval(date, dateRange)
          : true;

        // Apply type filter (only expense for breakdown)
        const matchesType = typeFilter === 'all' || typeFilter === 'expense';
        
        // Apply category filter
        const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;

        if (inRange && matchesType && matchesCategory) {
          categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
        }
      }
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, periodType, selectedMonth, selectedYear, typeFilter, categoryFilter]);

  // Calculate overall stats (Total Net Worth - all time)
  const overallStats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netWorth = totalIncome - totalExpense;

    return {
      netWorth,
      savingsRate: periodStats.income > 0 ? ((periodStats.income - periodStats.expense) / periodStats.income) * 100 : 0
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
      {/* Total Net Worth All Time - Prominent Card with Platinum Styling */}
      <Card className="p-8 platinum-shine backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Net Worth</h3>
          <Wallet className="h-7 w-7 text-foreground/70" />
        </div>
        <p className={`text-5xl font-bold tracking-tight ${overallStats.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${overallStats.netWorth.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground mt-2 font-light">Lifetime balance</p>
      </Card>

      {/* All Filters in Single Line */}
      <Card className="p-5 silver-border backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Period Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            
            {/* Year Dropdown */}
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(value) => {
                setSelectedYear(Number(value));
                setPeriodType('year');
              }}
            >
              <SelectTrigger className={cn(
                "w-[110px] h-9 bg-background/50 border-border/50",
                periodType === 'year' && "bg-primary text-primary-foreground font-medium"
              )}>
                <SelectValue>{selectedYear}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableYears.length === 0 ? (
                  <SelectItem value="0" disabled>No data</SelectItem>
                ) : (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))
                )}
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
              }}
            >
              <SelectTrigger className={cn(
                "w-[130px] h-9 bg-background/50 border-border/50",
                periodType === 'month' && "bg-primary text-primary-foreground font-medium"
              )}>
                <SelectValue>
                  {periodType === 'month' ? MONTHS[selectedMonth] : 'All Months'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Overall Button */}
            <button
              onClick={() => setPeriodType('overall')}
              className={cn(
                "h-9 px-4 rounded-md text-sm font-medium transition-all",
                periodType === 'overall' 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background/50 hover:bg-accent hover:text-accent-foreground border border-border/50"
              )}
            >
              Overall
            </button>
          </div>

          {/* Divider */}
          <div className="hidden lg:block h-8 w-px bg-border/50" />

          {/* Type and Category Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger className="w-[120px] h-9 bg-background/50 border-border/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9 bg-background/50 border-border/50">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Label */}
          <div className="ml-auto">
            <span className="text-sm font-medium text-foreground/80 px-3 py-1.5 rounded-md bg-muted/50">
              {getPeriodLabel()}
            </span>
          </div>
        </div>
      </Card>

      {/* Overview Stats with Metallic Styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 silver-border backdrop-blur-sm hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Net Worth</h3>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className={`text-3xl font-bold ${periodStats.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${periodStats.netWorth.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-light">{getPeriodLabel()}</p>
        </Card>

        <Card className="p-6 silver-border backdrop-blur-sm hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Income</h3>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            ${periodStats.income.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-light">{getPeriodLabel()}</p>
        </Card>

        <Card className="p-6 silver-border backdrop-blur-sm hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Expenses</h3>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            ${periodStats.expense.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-light">
            Savings rate: {overallStats.savingsRate.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Expense Breakdown and Top Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 silver-border backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight">Expense Breakdown</h3>
            <p className="text-sm text-muted-foreground font-light">{getPeriodLabel()}</p>
          </div>
          
          {expenseBreakdown.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No expense data for {getPeriodLabel().toLowerCase()}
            </div>
          ) : (
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
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top Categories */}
        <Card className="p-6 silver-border backdrop-blur-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight">Top Spending Categories</h3>
            <p className="text-sm text-muted-foreground font-light">{getPeriodLabel()}</p>
          </div>
          {expenseBreakdown.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No expenses recorded</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {expenseBreakdown.map((category, index) => {
                const total = expenseBreakdown.reduce((sum, cat) => sum + cat.value, 0);
                const percentage = (category.value / total) * 100;

                return (
                  <div key={category.name} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${category.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground font-light">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Transactions List */}
      <Card className="p-6 silver-border backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold tracking-tight">Recent Transactions</h3>
          <p className="text-sm text-muted-foreground font-light">
            {getPeriodLabel()} • {filteredTransactionsForDisplay.length} transaction{filteredTransactionsForDisplay.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {filteredTransactionsForDisplay.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found for the selected filters
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {filteredTransactionsForDisplay.map((transaction) => {
              const transactionDate = typeof transaction.date === 'string' ? parseISO(transaction.date) : transaction.date;
              
              return (
                <Card key={transaction.id} className="p-4 hover:shadow-md transition-all border-border/50 bg-card/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{transaction.description}</h4>
                          <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(transactionDate, 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteTransaction(transaction.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}