"use client";

import { RecurringTransaction } from '@/types/finance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';

interface RecurringTransactionManagerProps {
  recurringTransactions: RecurringTransaction[];
  onDeleteRecurring: (id: string) => void;
  onToggleActive: (id: string) => void;
}

export function RecurringTransactionManager({
  recurringTransactions,
  onDeleteRecurring,
  onToggleActive
}: RecurringTransactionManagerProps) {
  const { formatAmount } = useCurrency();

  const getFrequencyLabel = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-white">Recurring Transactions</h2>
        <p className="text-white/60">
          Manage your recurring income and expenses. Transactions will be automatically created based on the schedule.
        </p>
      </div>

      {recurringTransactions.length === 0 ?
      <Card className="p-8 text-center platinum-luxury border-primary/40">
          <p className="text-white/50">
            No recurring transactions yet. Create one to automatically track regular income or expenses.
          </p>
        </Card> :

      <div className="grid gap-4">
          {recurringTransactions.map((recurring) =>
        <Card key={recurring.id} className="p-4 platinum-luxury border-primary/40 !border-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Header with Type Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                  variant={recurring.type === 'income' ? 'default' : 'destructive'}
                  className={recurring.type === 'income' ? 'bg-green-500 hover:bg-green-600' : ''}>

                      {recurring.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                    <Badge variant="outline" className="text-white border-primary/30">{recurring.category}</Badge>
                    <Badge variant="secondary" className="bg-primary/20 text-white">{getFrequencyLabel(recurring.frequency)}</Badge>
                    {!recurring.isActive &&
                <Badge variant="outline" className="bg-muted text-white">Paused</Badge>
                }
                  </div>

                  {/* Amount and Description */}
                  <div>
                    <h3 className="font-semibold text-lg text-white">
                      {recurring.description}
                    </h3>
                    <p className={`text-2xl font-bold ${
                recurring.type === 'income' ? 'text-green-400' : 'text-red-400'}`
                }>
                      {formatAmount(recurring.amount)}
                    </p>
                  </div>

                  {/* Schedule Info */}
                  <div className="text-sm text-white/60 space-y-1">
                    <p>
                      <span className="font-medium text-white">Starts:</span> {format(new Date(recurring.startDate), 'MMM d, yyyy')}
                    </p>
                    {recurring.endDate &&
                <p>
                        <span className="font-medium text-white">Ends:</span> {format(new Date(recurring.endDate), 'MMM d, yyyy')}
                      </p>
                }
                    {recurring.lastGenerated &&
                <p>
                        <span className="font-medium text-white">Last generated:</span> {format(new Date(recurring.lastGenerated), 'MMM d, yyyy')}
                      </p>
                }
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(recurring.id)}
                className="gap-2 text-white border-primary/30">

                    {recurring.isActive ?
                <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </> :

                <>
                        <Play className="h-4 w-4" />
                        Resume
                      </>
                }
                  </Button>
                  <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteRecurring(recurring.id)}
                className="gap-2">

                    <Trash2 className="h-4 w-4 text-white" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
        )}
        </div>
      }
    </div>);

}