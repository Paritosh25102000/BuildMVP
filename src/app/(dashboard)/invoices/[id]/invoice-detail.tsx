'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, InvoiceStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LineItems, LineItem } from '@/components/estimates/line-items';
import { toast } from 'sonner';
import {
  ChevronLeft,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';

interface InvoiceDetailProps {
  invoice: {
    id: string;
    invoice_number: string;
    title: string;
    description: string | null;
    status: InvoiceStatus;
    issue_date: string;
    due_date: string | null;
    paid_date: string | null;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    source_estimate_id: string | null;
    archived_at: string | null;
    client: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
    } | null;
    items: {
      id: string;
      description: string;
      quantity: number;
      unit: string;
      unit_price: number;
      amount: number;
    }[];
  };
  profile: Profile | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  unpaid: { label: 'Unpaid', variant: 'destructive', icon: <Clock className="h-3 w-3" /> },
  paid: { label: 'Paid', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function InvoiceDetail({ invoice, profile }: InvoiceDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(invoice.status);
  const [paidDate, setPaidDate] = useState(invoice.paid_date);
  const [archivedAt, setArchivedAt] = useState(invoice.archived_at);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleTogglePaid = async () => {
    setIsUpdating(true);
    const newStatus: InvoiceStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const newPaidDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          paid_date: newPaidDate,
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setCurrentStatus(newStatus);
      setPaidDate(newPaidDate);
      toast.success(newStatus === 'paid' ? 'Invoice marked as paid' : 'Invoice marked as unpaid');
      router.refresh();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const newArchivedAt = archivedAt ? null : new Date().toISOString();
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ archived_at: newArchivedAt })
        .eq('id', invoice.id);

      if (error) throw error;
      setArchivedAt(newArchivedAt);
      toast.success(newArchivedAt ? 'Invoice archived' : 'Invoice restored');
      if (newArchivedAt) router.push('/invoices');
    } catch (error) {
      console.error('Error archiving invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success('Invoice deleted');
      router.push('/invoices');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const lineItems: LineItem[] = invoice.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
  }));

  const statusInfo = statusConfig[currentStatus];
  const isOverdue = currentStatus === 'unpaid' && invoice.due_date && new Date(invoice.due_date) < new Date();

  return (
    <div className="space-y-6">
      {/* Archived banner */}
      {archivedAt && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Archive className="h-4 w-4" />
            <span className="text-sm font-medium">This invoice is archived</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleArchive} disabled={isArchiving}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Restore
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/invoices"
            className="flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Invoices
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/invoices/${invoice.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {invoice.source_estimate_id && (
                <DropdownMenuItem asChild>
                  <Link href={`/estimates/${invoice.source_estimate_id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Source Estimate
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
                {archivedAt ? (
                  <><ArchiveRestore className="mr-2 h-4 w-4" />Unarchive</>
                ) : (
                  <><Archive className="mr-2 h-4 w-4" />Archive</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Invoice Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{invoice.title}</h1>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">Overdue</Badge>
            )}
          </div>
          <p className="text-slate-500 mt-1">
            Invoice #{invoice.invoice_number}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Amount</p>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(invoice.total)}</p>
        </div>
      </div>

      {/* Mark as Paid Toggle */}
      <Card className={currentStatus === 'paid' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStatus === 'paid' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className={`font-medium ${currentStatus === 'paid' ? 'text-green-700' : 'text-orange-700'}`}>
                  {currentStatus === 'paid' ? 'Payment Received' : 'Payment Pending'}
                </p>
                <p className={`text-sm ${currentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                  {currentStatus === 'paid' && paidDate
                    ? `Paid on ${formatDate(paidDate)}`
                    : invoice.due_date
                      ? `Due ${formatDate(invoice.due_date)}`
                      : 'No due date set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="paid-toggle" className="text-sm font-medium">
                Mark as Paid
              </Label>
              <Switch
                id="paid-toggle"
                checked={currentStatus === 'paid'}
                onCheckedChange={handleTogglePaid}
                disabled={isUpdating}
              />
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {invoice.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{invoice.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <LineItems items={lineItems} onChange={() => {}} readOnly />
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Summary & Client */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax ({invoice.tax_rate}%)</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(invoice.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Issue Date</span>
                <span>{formatDate(invoice.issue_date)}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Date</span>
                  <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
              )}
              {paidDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Paid Date</span>
                  <span className="text-green-600 font-medium">{formatDate(paidDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          {invoice.client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium text-slate-900">{invoice.client.name}</p>
                {invoice.client.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${invoice.client.email}`} className="hover:text-blue-600">
                      {invoice.client.email}
                    </a>
                  </div>
                )}
                {invoice.client.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${invoice.client.phone}`} className="hover:text-blue-600">
                      {invoice.client.phone}
                    </a>
                  </div>
                )}
                {invoice.client.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <span className="whitespace-pre-line">{invoice.client.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Business Info */}
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">From</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {profile.business_name || 'Your Business'}
                  </span>
                </div>
                {profile.license_number && (
                  <p className="text-sm text-slate-500">
                    License: {profile.license_number}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
