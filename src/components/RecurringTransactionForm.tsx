"use client"

import { useState } from 'react';
import { RecurringTransaction, TransactionType, RecurrenceFrequency, expenseCategories, incomeCategories } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface RecurringTransactionFormProps {
  onAddRecurring: (data: Omit<RecurringTransaction, 'id' | 'lastGenerated'>) => void;
}

export function RecurringTransactionForm({ onAddRecurring }: RecurringTransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category || !description) {
      return;
    }

    onAddRecurring({
      type,
      amount: parseFloat(amount),
      category,
      description,
      frequency,
      startDate,
      endDate: hasEndDate ? endDate : undefined,
      isActive: true
    });

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setFrequency('monthly');
    setStartDate(new Date());
    setHasEndDate(false);
    setEndDate(undefined);
  };

  const categories = type === 'expense' ? expenseCategories : incomeCategories;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type and Amount - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Transaction Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
            <SelectTrigger className="border-2 border-white text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-2 border-white text-white backdrop-blur-sm">
              <SelectItem value="income" className="cursor-pointer text-white">Income</SelectItem>
              <SelectItem value="expense" className="cursor-pointer text-white">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className="text-white">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="border-2 border-white text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {/* Category and Frequency - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Category</Label>
          <Select value={category} onValueChange={setCategory} required>
            <SelectTrigger className="border-2 border-white text-white">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-2 border-white text-white backdrop-blur-sm">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="cursor-pointer text-white">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-white">Repeat Frequency</Label>
          <Select value={frequency} onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}>
            <SelectTrigger className="border-2 border-white text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-2 border-white text-white backdrop-blur-sm">
              <SelectItem value="daily" className="cursor-pointer text-white">Daily</SelectItem>
              <SelectItem value="weekly" className="cursor-pointer text-white">Weekly</SelectItem>
              <SelectItem value="monthly" className="cursor-pointer text-white">Monthly</SelectItem>
              <SelectItem value="yearly" className="cursor-pointer text-white">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description - Full Width */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-white">Description</Label>
        <Input
          id="description"
          placeholder="e.g., Monthly Salary"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="border-2 border-white text-white placeholder:text-white/50"
        />
      </div>

      {/* Start Date and End Date - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal border-2 border-white text-white">
                <CalendarIcon className="mr-2 h-4 w-4 text-white" />
                {format(startDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover/95 backdrop-blur-sm border-2 border-white text-white">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                className="text-white [&_.rdp-day]:text-white [&_.rdp-day_button]:text-white [&_.rdp-caption]:text-white [&_.rdp-nav_button]:text-white [&_.rdp-head_cell]:text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="hasEndDate"
              checked={hasEndDate}
              onChange={(e) => setHasEndDate(e.target.checked)}
              className="h-4 w-4 rounded border-white"
            />
            <Label htmlFor="hasEndDate" className="cursor-pointer text-white">
              Set end date (optional)
            </Label>
          </div>
          {hasEndDate && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal border-2 border-white text-white">
                  <CalendarIcon className="mr-2 h-4 w-4 text-white" />
                  {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover/95 backdrop-blur-sm border-2 border-white text-white">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  disabled={(date) => date < startDate}
                  className="text-white [&_.rdp-day]:text-white [&_.rdp-day_button]:text-white [&_.rdp-caption]:text-white [&_.rdp-nav_button]:text-white [&_.rdp-head_cell]:text-white"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full platinum-button">
        Create Recurring Transaction
      </Button>
    </form>
  );
}