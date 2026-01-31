import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Receipt,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${
            trend.isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            <TrendingUp className={`h-3 w-3 ${!trend.isPositive && 'rotate-180'}`} />
            <span>{trend.value}% from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch counts from database
  const [
    { count: estimatesCount },
    { count: invoicesCount },
    { count: clientsCount },
    { data: estimates },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('estimates').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('estimates').select('status, total'),
    supabase.from('invoices').select('status, total'),
  ]);

  // Calculate totals
  const pendingEstimates = estimates?.filter(e => e.status === 'sent').length || 0;
  const approvedEstimates = estimates?.filter(e => e.status === 'approved').length || 0;
  const totalEstimatesValue = estimates?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;

  const unpaidInvoices = invoices?.filter(i => i.status === 'unpaid').length || 0;
  const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
  const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0) || 0;
  const outstandingAmount = invoices?.filter(i => i.status === 'unpaid').reduce((sum, i) => sum + (i.total || 0), 0) || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Welcome back! Here&apos;s an overview of your business.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Estimates"
          value={estimatesCount || 0}
          description={`${pendingEstimates} pending, ${approvedEstimates} approved`}
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          title="Total Invoices"
          value={invoicesCount || 0}
          description={`${unpaidInvoices} unpaid, ${paidInvoices} paid`}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          title="Total Clients"
          value={clientsCount || 0}
          description="Active customers"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          description="From paid invoices"
          icon={<DollarSign className="h-5 w-5" />}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Outstanding Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(outstandingAmount)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              From {unpaidInvoices} unpaid invoice{unpaidInvoices !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Estimates Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalEstimatesValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total value of all estimates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {pendingEstimates}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Estimates awaiting client response
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a
              href="/estimates/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">New Estimate</p>
                <p className="text-sm text-slate-500">Create a quote</p>
              </div>
            </a>

            <a
              href="/invoices/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">New Invoice</p>
                <p className="text-sm text-slate-500">Bill a client</p>
              </div>
            </a>

            <a
              href="/clients/new"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Add Client</p>
                <p className="text-sm text-slate-500">New customer</p>
              </div>
            </a>

            <a
              href="/settings"
              className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Settings</p>
                <p className="text-sm text-slate-500">Business profile</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
