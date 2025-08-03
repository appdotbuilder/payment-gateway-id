
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { Transaction, TransactionType, TransactionStatus } from '../../../server/src/schema';

export function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');

  const loadTransactions = useCallback(async () => {
    try {
      const result = await trpc.getTransactions.query({
        type: typeFilter === 'ALL' ? undefined : typeFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        limit: 100
      });
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const handleUpdateStatus = async (transactionId: number, newStatus: TransactionStatus) => {
    try {
      await trpc.updateTransactionStatus.mutate({
        id: transactionId,
        status: newStatus
      });
      
      setTransactions((prev: Transaction[]) => 
        prev.map((transaction: Transaction) => 
          transaction.id === transactionId ? { ...transaction, status: newStatus } : transaction
        )
      );
      
      alert('Transaction status updated successfully');
    } catch (error) {
      console.error('Failed to update transaction status:', error);
      alert('Failed to update transaction status');
    }
  };

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesSearch = searchTerm === '' || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.user_id.toString().includes(searchTerm);
    
    return matchesSearch;
  });

  const getAmountPrefix = (type: string) => {
    return type === 'TOP_UP' ? '+' : '-';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading transactions...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">💱 Transaction Management</CardTitle>
        <CardDescription>Monitor and manage all transactions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          <Select value={typeFilter} onValueChange={(value: TransactionType | 'ALL') => setTypeFilter(value)}>
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
          <Select value={statusFilter} onValueChange={(value: TransactionStatus | 'ALL') => setStatusFilter(value)}>
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
          <Button variant="outline" onClick={loadTransactions}>
            🔄 Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Total Transactions</p>
                <p className="text-2xl font-bold text-slate-900">{filteredTransactions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-600">Success</p>
                <p className="text-2xl font-bold text-green-800">
                  {filteredTransactions.filter(t => t.status === 'SUCCESS').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {filteredTransactions.filter(t => t.status === 'PENDING').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-blue-600">Total Volume</p>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">💱</div>
            <p className="text-lg">No transactions found</p>
            <p className="text-sm">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction: Transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {transaction.type.replace('_', ' ')} - User ID: {transaction.user_id}
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
                <div className="text-right space-y-2">
                  <p className={`text-lg font-bold ${getTransactionColor(transaction.type)}`}>
                    {getAmountPrefix(transaction.type)}{formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(transaction.status) + ' text-xs'}>
                      {transaction.status}
                    </Badge>
                    {transaction.status === 'PENDING' && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1"
                          onClick={() => handleUpdateStatus(transaction.id, 'SUCCESS')}
                        >
                          ✅ Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs px-2 py-1"
                          onClick={() => handleUpdateStatus(transaction.id, 'FAILED')}
                        >
                          ❌ Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
