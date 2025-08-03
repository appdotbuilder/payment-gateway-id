
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CreateTransactionInput } from '../../../server/src/schema';

interface PaymentFormProps {
  userId: number;
  currentBalance: number;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function PaymentForm({ userId, currentBalance, onSubmit, formatCurrency }: PaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: userId,
    type: 'PAYMENT',
    amount: 0,
    payment_method: 'DANA',
    description: null,
    reference_id: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (formData.amount > currentBalance) {
      alert('Insufficient balance. Please top up first.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        reference_id: `PAY_${Date.now()}_${userId}`
      });
      // Reset form
      setFormData((prev: CreateTransactionInput) => ({
        ...prev,
        amount: 0,
        description: null
      }));
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const remainingBalance = currentBalance - formData.amount;
  const isInsufficientBalance = formData.amount > currentBalance;

  return (
    <div className="space-y-6">
      {/* Balance Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Current Balance:</span>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(currentBalance)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Payment Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter payment amount"
            value={formData.amount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateTransactionInput) => ({ 
                ...prev, 
                amount: parseInt(e.target.value) || 0 
              }))
            }
            min="1000"
            max={currentBalance}
            step="1000"
            required
          />
          <p className="text-sm text-slate-500">
            Minimum: {formatCurrency(1000)}, Available: {formatCurrency(currentBalance)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Payment Description</Label>
          <Textarea
            id="description"
            placeholder="What is this payment for? (e.g., Online purchase, Bill payment, etc.)"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateTransactionInput) => ({ 
                ...prev, 
                description: e.target.value || null 
              }))
            }
            rows={3}
            required
          />
        </div>

        {/* Payment Summary */}
        {formData.amount > 0 && (
          <Card className={isInsufficientBalance ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Payment Amount:</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Current Balance:</span>
                  <span className="font-medium">{formatCurrency(currentBalance)}</span>
                </div>
                <hr className={isInsufficientBalance ? "border-red-200" : "border-slate-200"} />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Remaining Balance:</span>
                  <span className={`font-bold ${isInsufficientBalance ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insufficient Balance Warning */}
        {isInsufficientBalance && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ⚠️ Insufficient balance. You need {formatCurrency(formData.amount - currentBalance)} more.
              Please top up your account first.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className={`w-full py-3 text-lg ${
            isInsufficientBalance 
              ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700'
          } text-white`}
          disabled={isLoading || formData.amount <= 0 || isInsufficientBalance}
        >
          {isLoading ? 'Processing Payment...' : `💳 Pay ${formData.amount > 0 ? formatCurrency(formData.amount) : ''}`}
        </Button>
      </form>
    </div>
  );
}
