
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { User, UpdateUserInput, AccountStatus } from '../../../server/src/schema';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);

  const loadUsers = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query();
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'SUSPENDED': return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateAccountStatus = async (userId: number, newStatus: AccountStatus) => {
    try {
      const updateData: UpdateUserInput = {
        id: userId,
        account_status: newStatus
      };
      await trpc.updateUser.mutate(updateData);
      setUsers((prev: User[]) => 
        prev.map((user: User) => 
          user.id === userId ? { ...user, account_status: newStatus } : user
        )
      );
      alert('Account status updated successfully');
    } catch (error) {
      console.error('Failed to update account status:', error);
      alert('Failed to update account status');
    }
  };

  const handleUpdateBalance = async () => {
    if (!selectedUser || balanceAmount === 0) return;

    try {
      await trpc.updateUserBalance.mutate({
        user_id: selectedUser.id,
        amount: balanceAmount
      });
      
      setUsers((prev: User[]) => 
        prev.map((user: User) => 
          user.id === selectedUser.id ? { ...user, balance: user.balance + balanceAmount } : user
        )
      );
      
      setIsDialogOpen(false);
      setBalanceAmount(0);
      setSelectedUser(null);
      alert('Balance updated successfully');
    } catch (error) {
      console.error('Failed to update balance:', error);
      alert('Failed to update balance');
    }
  };

  const filteredUsers = users.filter((user: User) => {
    const matchesSearch = searchTerm === '' || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || user.account_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading users...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">👥 User Management</CardTitle>
        <CardDescription>Manage user accounts and balances</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={(value: AccountStatus | 'ALL') => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">✅ Active</SelectItem>
              <SelectItem value="SUSPENDED">⏸️ Suspended</SelectItem>
              <SelectItem value="BLOCKED">🚫 Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadUsers}>
            🔄 Refresh
          </Button>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-lg">No users found</p>
            <p className="text-sm">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user: User) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user.full_name}</p>
                    <p className="text-sm text-slate-500">@{user.username} • {user.email}</p>
                    <p className="text-sm text-slate-500">{user.phone_number}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getAccountStatusColor(user.account_status) + ' text-xs'}>
                        {user.account_status}
                      </Badge>
                      {user.role === 'ADMIN' && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          ADMIN
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-lg font-bold text-blue-600">{formatCurrency(user.balance)}</p>
                  <div className="flex space-x-2">
                    <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          💰 Balance
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Balance - {user.full_name}</DialogTitle>
                          <DialogDescription>
                            Current balance: {formatCurrency(user.balance)}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="amount">Amount (use negative for deduction)</Label>
                            <Input
                              id="amount"
                              type="number"
                              value={balanceAmount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                setBalanceAmount(parseInt(e.target.value) || 0)
                              }
                              placeholder="Enter amount..."
                            />
                          </div>
                          <div className="text-sm text-slate-600">
                            New balance will be: {formatCurrency(user.balance + balanceAmount)}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleUpdateBalance} disabled={balanceAmount === 0}>
                            Update Balance
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    <Select
                      value={user.account_status}
                      onValueChange={(value: AccountStatus) => handleUpdateAccountStatus(user.id, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">✅ Active</SelectItem>
                        <SelectItem value="SUSPENDED">⏸️ Suspend</SelectItem>
                        <SelectItem value="BLOCKED">🚫 Block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{filteredUsers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-600">Active Users</p>
                <p className="text-2xl font-bold text-green-800">
                  {filteredUsers.filter(u => u.account_status === 'ACTIVE').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-yellow-600">Suspended</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {filteredUsers.filter(u => u.account_status === 'SUSPENDED').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-blue-600">Total Balance</p>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(filteredUsers.reduce((sum, user) => sum + user.balance, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
