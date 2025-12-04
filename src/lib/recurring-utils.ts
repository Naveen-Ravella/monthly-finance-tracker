import { RecurringTransaction, Transaction } from '@/types/finance';
import { addDays, addWeeks, addMonths, addYears, isAfter, isBefore, startOfDay } from 'date-fns';

export function getNextOccurrence(recurring: RecurringTransaction, fromDate: Date): Date {
  const start = startOfDay(fromDate);
  
  switch (recurring.frequency) {
    case 'daily':
      return addDays(start, 1);
    case 'weekly':
      return addWeeks(start, 1);
    case 'monthly':
      return addMonths(start, 1);
    case 'yearly':
      return addYears(start, 1);
    default:
      return start;
  }
}

// Generate due transactions for a single recurring transaction
export function generateDueTransactions(
  recurring: RecurringTransaction,
  currentDate: Date
): Omit<Transaction, 'id'>[] {
  const now = startOfDay(currentDate);
  const newTransactions: Omit<Transaction, 'id'>[] = [];

  // Skip if not active
  if (!recurring.isActive) {
    return newTransactions;
  }

  // Skip if end date has passed
  if (recurring.endDate && isAfter(now, startOfDay(new Date(recurring.endDate)))) {
    return newTransactions;
  }

  // Determine the date to check from
  const checkFromDate = recurring.lastGenerated 
    ? startOfDay(new Date(recurring.lastGenerated))
    : startOfDay(new Date(recurring.startDate));

  // Check if we need to generate a new transaction
  let nextDue = checkFromDate;

  // Keep generating until we're caught up to today
  while (true) {
    nextDue = getNextOccurrence(recurring, nextDue);
    
    // If next occurrence is in the future, stop
    if (isAfter(nextDue, now)) {
      break;
    }

    // If next occurrence is before start date, skip
    if (isBefore(nextDue, startOfDay(new Date(recurring.startDate)))) {
      continue;
    }

    // If end date exists and next occurrence is after it, stop
    if (recurring.endDate && isAfter(nextDue, startOfDay(new Date(recurring.endDate)))) {
      break;
    }

    // Generate new transaction
    newTransactions.push({
      type: recurring.type,
      amount: recurring.amount,
      category: recurring.category,
      description: `${recurring.description} (Auto)`,
      date: nextDue.toISOString(),
      recurringId: recurring.id
    });
  }

  return newTransactions;
}