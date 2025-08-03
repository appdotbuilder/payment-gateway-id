
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Transaction, TransactionType, TransactionStatus } from '../../../server/src/schema';

interface TransactionHistoryProps {
  transactions: Transaction[];
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}

export function TransactionHistory({ transactions, formatCurrency, getStatusColor }: TransactionHistoryProps) {
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TOP_UP': return '💰';
      case 'PAYMENT': return '💳';
      case 'WITHDRAWAL': return '🏦';
      default: return '💱';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'TOP_UP': return 'text-green-600';
      case 'PAYMENT': return 'text-red-600';
      case 'WITHDRAWAL': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getAmountPrefix = (type: string) => {
    return type === 'TOP_UP' ? '+' : '-';
  };

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesType = filterType === 'ALL' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || transaction.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  const totalAmount = filteredTransactions.reduce((sum, transaction) => {
    if (transaction.type === 'TOP_UP') {
      return sum + transaction.amount;
    } else {
      return sum - transaction.amount;
    }
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">📋 Transaction History</CardTitle>
        <CardDescription>View and filter your transaction history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filterType} onValueChange={(value: TransactionType | 'ALL') => setFilterType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="TOP_UP">💰 Top Up</SelectItem>
              <SelectItem value="PAYMENT">💳 Payment</SelectItem>
              <SelectItem value="WITHDRAWAL">🏦 Withdrawal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(value: TransactionStatus | 'ALL') => setFilterStatus(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="SUCCESS">✅ Success</SelectItem>
              <SelectItem value="PENDING">⏳ Pending</SelectItem>
              <SelectItem value="FAILED">❌ Failed</SelectItem>
              <SelectItem value="CANCELLED">🚫 Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />

          <Button 
            variant="outline" 
            onClick={() => {
              setFilterType('ALL');
              setFilterStatus('ALL');
              setSearchTerm('');
            }}
          >
            🔄 Clear Filters
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Total Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{filteredTransactions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Net Amount</p>
                <p className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalAmount >= 0 ? '+' : ''}{formatCurrency(totalAmount)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredTransactions.length > 0 
                    ? Math.round((filteredTransactions.filter(t => t.status === 'SUCCESS').length / filteredTransactions.length) * 100)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or make your first transaction</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction: Transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {transaction.type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {transaction.created_at.toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {transaction.payment_method}
                    </p>
                    {transaction.description && (
                      <p className="text-sm text-slate-600 max-w-md truncate">{transaction.description}</p>
                    )}
                    {transaction.reference_id && (
                      <p className="text-xs text-slate-400 font-mono">{transaction.reference_id}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                    {getAmountPrefix(transaction.type)}{formatCurrency(transaction.amount)}
                  </p>
                  <Badge className={getStatusColor(transaction.status) + ' text-xs mt-1'}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
