
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { TransactionHistory } from '@/components/TransactionHistory';
import { TopUpForm } from '@/components/TopUpForm';
import { PaymentForm } from '@/components/PaymentForm';
import { WithdrawalForm } from '@/components/WithdrawalForm';
import type { User, Transaction, CreateTransactionInput } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load current user from the first user in the system
  const loadCurrentUser = useCallback(async () => {
    try {
      const users = await trpc.getUsers.query();
      if (users.length > 0) {
        // Use the first user as the current logged-in user
        setCurrentUser(users[0]);
      } else {
        // Create a default user if none exists
        const newUser = await trpc.createUser.mutate({
          username: 'john_doe',
          email: 'john@example.com',
          full_name: 'John Doe',
          phone_number: '081234567890',
          role: 'USER'
        });
        setCurrentUser(newUser);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadUserTransactions = useCallback(async (userId: number) => {
    try {
      const result = await trpc.getUserTransactions.query({
        user_id: userId,
        limit: 20
      });
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserTransactions(currentUser.id);
    }
  }, [currentUser, loadUserTransactions]);

  const handleTransactionCreate = async (transactionData: CreateTransactionInput) => {
    try {
      const newTransaction = await trpc.createTransaction.mutate(transactionData);
      setTransactions((prev: Transaction[]) => [newTransaction, ...prev]);
      
      // Update user balance based on transaction type
      if (currentUser) {
        let newBalance = currentUser.balance;
        if (transactionData.type === 'TOP_UP') {
          newBalance += transactionData.amount;
        } else if (transactionData.type === 'PAYMENT' || transactionData.type === 'WITHDRAWAL') {
          newBalance -= transactionData.amount;
        }
        
        setCurrentUser((prev: User | null) => prev ? { ...prev, balance: newBalance } : null);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Payment Gateway...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-blue-900">💳 Payment Gateway</CardTitle>
            <CardDescription>Please log in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-900">💳 Payment Gateway</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-600">Welcome, {currentUser.full_name}</p>
              <p className="text-lg font-semibold text-blue-900">
                {formatCurrency(currentUser.balance)}
              </p>
            </div>
            <Badge className={getAccountStatusColor(currentUser.account_status)}>
              {currentUser.account_status}
            </Badge>
            {currentUser.role === 'ADMIN' && (
              <Badge className="bg-purple-100 text-purple-800">
                👑 ADMIN
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {currentUser.role === 'ADMIN' ? (
          <AdminDashboard />
        ) : (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white border border-slate-200">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                📊 Dashboard
              </TabsTrigger>
              <TabsTrigger value="topup" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                💰 Top Up
              </TabsTrigger>
              <TabsTrigger value="payment" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                💳 Payment
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                🏦 Withdrawal
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                📋 History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <UserDashboard 
                user={currentUser} 
                recentTransactions={transactions.slice(0, 5)}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="topup">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-900">💰 Top Up Saldo</CardTitle>
                  <CardDescription>
                    Tambahkan saldo ke akun Anda menggunakan DANA atau metode pembayaran lainnya
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TopUpForm 
                    userId={currentUser.id}
                    onSubmit={handleTransactionCreate}
                    formatCurrency={formatCurrency}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-900">💳 Pembayaran</CardTitle>
                  <CardDescription>
                    Lakukan pembayaran menggunakan saldo Anda
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentForm 
                    userId={currentUser.id}
                    currentBalance={currentUser.balance}
                    onSubmit={handleTransactionCreate}
                    formatCurrency={formatCurrency}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawal">
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-900">🏦 Penarikan Dana</CardTitle>
                  <CardDescription>
                    Tarik saldo Anda ke rekening bank
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WithdrawalForm 
                    userId={currentUser.id}
                    currentBalance={currentUser.balance}
                    onSubmit={handleTransactionCreate}
                    formatCurrency={formatCurrency}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <TransactionHistory 
                transactions={transactions}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

export default App;
