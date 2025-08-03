
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { User, Transaction } from '../../../server/src/schema';

interface UserDashboardProps {
  user: User;
  recentTransactions: Transaction[];
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}

export function UserDashboard({ user, recentTransactions, formatCurrency, getStatusColor }: UserDashboardProps) {
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

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(user.balance)}</div>
            <p className="text-sm opacity-75 mt-1">Available for transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(user.account_status) + ' text-lg px-3 py-1'}>
              {user.account_status}
            </Badge>
            <p className="text-sm text-slate-500 mt-2">Account is in good standing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{recentTransactions.length}</div>
            <p className="text-sm text-slate-500 mt-1">Transactions this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">👤 Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Full Name</label>
              <p className="text-slate-900 font-medium">{user.full_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Username</label>
              <p className="text-slate-900 font-medium">@{user.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <p className="text-slate-900 font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Phone Number</label>
              <p className="text-slate-900 font-medium">{user.phone_number}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Member Since</label>
              <p className="text-slate-900 font-medium">{user.created_at.toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Last Updated</label>
              <p className="text-slate-900 font-medium">{user.updated_at.toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Recent Transactions</CardTitle>
          <CardDescription>Your latest transaction activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No recent transactions</p>
              <p className="text-sm">Start by making a top-up or payment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {transaction.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-slate-500">
                        {transaction.created_at.toLocaleDateString('id-ID')} • {transaction.payment_method}
                      </p>
                      {transaction.description && (
                        <p className="text-sm text-slate-600">{transaction.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'TOP_UP' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                    <Badge className={getStatusColor(transaction.status) + ' text-xs'}>
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
