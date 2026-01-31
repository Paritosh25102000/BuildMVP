'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { InvoiceStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Plus,
  Receipt,
  List,
  LayoutGrid,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  title: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  paid_date: string | null;
  total: number;
  client: {
    id: string;
    name: string;
  } | null;
}

interface InvoicesListProps {
  invoices: Invoice[];
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; color: string }> = {
  unpaid: { label: 'Unpaid', variant: 'destructive', icon: <Clock className="h-3 w-3" />, color: 'bg-orange-50 border-orange-200' },
  paid: { label: 'Paid', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-green-50 border-green-200' },
};

export function InvoicesList({ invoices: initialInvoices }: InvoicesListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleTogglePaid = async (invoice: Invoice) => {
    setUpdatingId(invoice.id);
    const newStatus: InvoiceStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    const paidDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          paid_date: paidDate,
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? { ...inv, status: newStatus, paid_date: paidDate }
            : inv
        )
      );

      toast.success(newStatus === 'paid' ? 'Invoice marked as paid' : 'Invoice marked as unpaid');
      router.refresh();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group invoices by status for Kanban view
  const groupedInvoices = {
    unpaid: invoices.filter((i) => i.status === 'unpaid'),
    paid: invoices.filter((i) => i.status === 'paid'),
  };

  // Calculate totals
  const totalUnpaid = groupedInvoices.unpaid.reduce((sum, i) => sum + i.total, 0);
  const totalPaid = groupedInvoices.paid.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">
            Manage invoices and track payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'kanban')}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalUnpaid)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-orange-600 mt-2">
              {groupedInvoices.unpaid.length} unpaid invoice{groupedInvoices.unpaid.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Collected</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2">
              {groupedInvoices.paid.length} paid invoice{groupedInvoices.paid.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No invoices yet</h3>
            <p className="text-slate-500 text-center mt-1 max-w-sm">
              Create your first invoice or convert an approved estimate.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/invoices/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : view === 'list' ? (
        /* List View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusInfo = statusConfig[invoice.status];
                const isOverdue = invoice.status === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date();

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="hover:text-blue-600"
                      >
                        {invoice.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {invoice.client?.name || '—'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(invoice.issue_date)}
                    </TableCell>
                    <TableCell className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}>
                      {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                      {isOverdue && ' (Overdue)'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={invoice.status === 'paid'}
                        onCheckedChange={() => handleTogglePaid(invoice)}
                        disabled={updatingId === invoice.id}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['unpaid', 'paid'] as InvoiceStatus[]).map((status) => {
            const statusInfo = statusConfig[status];
            const statusInvoices = groupedInvoices[status];
            const totalValue = statusInvoices.reduce((sum, i) => sum + i.total, 0);

            return (
              <div key={status} className="space-y-3">
                <div className={`p-3 rounded-lg border ${statusInfo.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                      <span className="text-sm text-slate-500">
                        ({statusInvoices.length})
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {statusInvoices.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-sm text-slate-400">
                        No {statusInfo.label.toLowerCase()} invoices
                      </CardContent>
                    </Card>
                  ) : (
                    statusInvoices.map((invoice) => {
                      const isOverdue = invoice.status === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date();

                      return (
                        <Card
                          key={invoice.id}
                          className="hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="text-xs font-medium text-blue-600 hover:underline"
                              >
                                {invoice.invoice_number}
                              </Link>
                              <span className="text-sm font-semibold">
                                {formatCurrency(invoice.total)}
                              </span>
                            </div>
                            <Link href={`/invoices/${invoice.id}`}>
                              <h4 className="font-medium text-slate-900 text-sm line-clamp-1 hover:text-blue-600">
                                {invoice.title}
                              </h4>
                            </Link>
                            {invoice.client && (
                              <p className="text-xs text-slate-500 mt-1">
                                {invoice.client.name}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <p className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                                {invoice.due_date ? `Due: ${formatDate(invoice.due_date)}` : formatDate(invoice.issue_date)}
                                {isOverdue && ' (Overdue)'}
                              </p>
                              <Switch
                                checked={invoice.status === 'paid'}
                                onCheckedChange={() => handleTogglePaid(invoice)}
                                disabled={updatingId === invoice.id}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
