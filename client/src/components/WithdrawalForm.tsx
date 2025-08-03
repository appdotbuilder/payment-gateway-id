
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CreateTransactionInput, PaymentMethod } from '../../../server/src/schema';

interface WithdrawalFormProps {
  userId: number;
  currentBalance: number;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  formatCurrency: (amount: number) => string;
}

export function WithdrawalForm({ userId, currentBalance, onSubmit, formatCurrency }: WithdrawalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: userId,
    type: 'WITHDRAWAL',
    amount: 0,
    payment_method: 'BANK_TRANSFER',
    description: null,
    reference_id: null
  });
  const [bankAccount, setBankAccount] = useState('');

  const withdrawalFee = Math.min(formData.amount * 0.005, 10000); // 0.5% fee, max 10k
  const totalDeduction = formData.amount + withdrawalFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (totalDeduction > currentBalance) {
      alert('Insufficient balance including withdrawal fee.');
      return;
    }

    if (!bankAccount.trim()) {
      alert('Please enter your bank account number');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        description: `Withdrawal to bank account: ${bankAccount}. ${formData.description || ''}`.trim(),
        reference_id: `WD_${Date.now()}_${userId}`
      });
      // Reset form
      setFormData((prev: CreateTransactionInput) => ({
        ...prev,
        amount: 0,
        description: null
      }));
      setBankAccount('');
      alert('Withdrawal request submitted successfully! It will be processed within 1-3 business days.');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      alert('Withdrawal request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const remainingBalance = currentBalance - totalDeduction;
  const isInsufficientBalance = totalDeduction > currentBalance;

  return (
    <div className="space-y-6">
      {/* Balance Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Available Balance:</span>
            <span className="text-2xl font-bold text-blue-600">{formatCurrency(currentBalance)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertDescription className="text-yellow-800">
          ℹ️ Withdrawal processing time: 1-3 business days. A small processing fee applies.
        </AlertDescription>
      </Alert>

      {/* Withdrawal Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter withdrawal amount"
              value={formData.amount || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev: CreateTransactionInput) => ({ 
                  ...prev, 
                  amount: parseInt(e.target.value) || 0 
                }))
              }
              min="50000"
              max={currentBalance - 10000} // Reserve for potential fees
              step="1000"
              required
            />
            <p className="text-sm text-slate-500">
              Minimum: {formatCurrency(50000)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Withdrawal Method</Label>
            <Select 
              value={formData.payment_method || 'BANK_TRANSFER'} 
              onValueChange={(value: PaymentMethod) => 
                setFormData((prev: CreateTransactionInput) => ({ ...prev, payment_method: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                <SelectItem value="DANA">💳 DANA</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bank_account">
            {formData.payment_method === 'DANA' ? 'DANA Phone Number' : 'Bank Account Number'}
          </Label>
          <Input
            id="bank_account"
            type={formData.payment_method === 'DANA' ? 'tel' : 'text'}
            placeholder={formData.payment_method === 'DANA' ? '081234567890' : 'Enter your bank account number'}
            value={bankAccount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankAccount(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Additional Notes (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Any additional information..."
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

        {/* Withdrawal Summary */}
        {formData.amount > 0 && (
          <Card className={isInsufficientBalance ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Withdrawal Amount:</span>
                  <span className="font-semibold">{formatCurrency(formData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Processing Fee (0.5%):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(withdrawalFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Current Balance:</span>
                  <span className="font-medium">{formatCurrency(currentBalance)}</span>
                </div>
                <hr className={isInsufficientBalance ? "border-red-200" : "border-slate-200"} />
                <div className="flex justify-between">
                  <span className="font-semibold">Total Deduction:</span>
                  <span className="font-bold text-red-600">-{formatCurrency(totalDeduction)}</span>
                </div>
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
              ⚠️ Insufficient balance including processing fee. You need {formatCurrency(totalDeduction - currentBalance)} more.
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className={`w-full py-3 text-lg ${
            isInsufficientBalance 
              ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          disabled={isLoading || formData.amount <= 0 || isInsufficientBalance || !bankAccount.trim()}
        >
          {isLoading ? 'Processing Withdrawal...' : `🏦 Withdraw ${formData.amount > 0 ? formatCurrency(formData.amount) : ''}`}
        </Button>
      </form>
    </div>
  );
}
