
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import { UserManagement } from '@/components/UserManagement';
import { TransactionManagement } from '@/components/TransactionManagement';
import type { ReportData, ReportPeriod } from '../../../server/src/schema';

export function AdminDashboard() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('MONTHLY');
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadReport = useCallback(async (period: ReportPeriod) => {
    setIsLoadingReport(true);
    try {
      const result = await trpc.getDashboardReport.query({ period });
      setReportData(result);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    loadReport(reportPeriod);
  }, [reportPeriod, loadReport]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-blue-900">👑 Admin Dashboard</h2>
          <p className="text-slate-600">Monitor and manage your payment gateway</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={reportPeriod} onValueChange={(value: ReportPeriod) => setReportPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={() => loadReport(reportPeriod)}
            disabled={isLoadingReport}
          >
            {isLoadingReport ? 'Loading...' : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Report Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">💰 Total Top-Up</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.total_top_up)}</div>
              <p className="text-sm opacity-75">Revenue from top-ups</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">💳 Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.total_payments)}</div>
              <p className="text-sm opacity-75">Processed payments</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">🏦 Total Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.total_withdrawals)}</div>
              <p className="text-sm opacity-75">Money withdrawn</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">📊 Net Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(reportData.net_revenue)}</div>
              <p className="text-sm opacity-75">Total profit</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{formatNumber(reportData.transaction_count)}</div>
              <p className="text-sm text-slate-500">All transaction types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{formatNumber(reportData.active_users_count)}</div>
              <p className="text-sm text-slate-500">Users with transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Report Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-slate-900">{reportData.period}</div>
              <p className="text-sm text-slate-500">
                {reportData.start_date.toLocaleDateString('id-ID')} - {reportData.end_date.toLocaleDateString('id-ID')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Management Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200">
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            👥 User Management
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            💱 Transaction Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
