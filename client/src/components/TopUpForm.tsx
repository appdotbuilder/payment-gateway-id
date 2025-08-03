
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreateTransactionInput, PaymentMethod } from '../../../server/src/schema';

interface TopUpFormProps {
  userId: number;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function TopUpForm({ userId, onSubmit, formatCurrency }: TopUpFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: userId,
    type: 'TOP_UP',
    amount: 0,
    payment_method: 'DANA',
    description: null,
    reference_id: null
  });

  const predefinedAmounts = [50000, 100000, 250000, 500000, 1000000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        reference_id: `TOPUP_${Date.now()}_${userId}`
      });
      // Reset form
      setFormData((prev: CreateTransactionInput) => ({
        ...prev,
        amount: 0,
        description: null
      }));
      alert('Top-up request submitted successfully!');
    } catch (error) {
      console.error('Top-up failed:', error);
      alert('Failed to submit top-up request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Amount Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Amount Selection</CardTitle>
          <CardDescription>Choose from common top-up amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {predefinedAmounts.map((amount) => (
              <Button
                key={amount}
                variant={formData.amount === amount ? "default" : "outline"}
                className={formData.amount === amount ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => setFormData((prev: CreateTransactionInput) => ({ ...prev, amount }))}
              >
                {formatCurrency(amount)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top-Up Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTransactionInput) => ({ 
                  ...prev, 
                  amount: parseInt(e.target.value) || 0 
                }))
              }
              min="10000"
              max="10000000"
              step="1000"
              required
            />
            <p className="text-sm text-slate-500">
              Minimum: {formatCurrency(10000)}, Maximum: {formatCurrency(10000000)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select 
              value={formData.payment_method || 'DANA'} 
              onValueChange={(value: PaymentMethod) => 
                setFormData((prev: CreateTransactionInput) => ({ ...prev, payment_method: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DANA">💳 DANA</SelectItem>
                <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                <SelectItem value="CREDIT_CARD">💳 Credit Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Add a note for this top-up..."
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateTransactionInput) => ({ 
                ...prev, 
                description: e.target.value || null 
              }))
            }
            rows={3}
          />
        </div>

        {/* Summary */}
        {formData.amount > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Top-up Amount:</span>
                  <span className="font-semibold text-green-600">+{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Method:</span>
                  <span className="font-medium">{formData.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Processing Fee:</span>
                  <span className="font-medium text-green-600">Free</span>
                </div>
                <hr className="border-blue-200" />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-green-600">+{formatCurrency(formData.amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
          disabled={isLoading || formData.amount <= 0}
        >
          {isLoading ? 'Processing...' : `💰 Top Up ${formData.amount > 0 ? formatCurrency(formData.amount) : ''}`}
        </Button>
      </form>
    </div>
  );
}
