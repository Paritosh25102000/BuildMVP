'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Profile, EstimateStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  FileText,
  Receipt,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { sendEstimateAction } from '@/app/actions/send-estimate';

interface EstimateDetailProps {
  estimate: {
    id: string;
    estimate_number: string;
    title: string;
    description: string | null;
    status: EstimateStatus;
    issue_date: string;
    valid_until: string | null;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    job_site_address: string | null;
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
  userId: string;
}

const statusConfig: Record<EstimateStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Sent', variant: 'default', icon: <Send className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  declined: { label: 'Failed Deal', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

export function EstimateDetail({ estimate, profile, userId }: EstimateDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isConverting, setIsConverting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archivedAt, setArchivedAt] = useState(estimate.archived_at);

  const handleSendToClient = async () => {
    if (!estimate.client?.email) {
      toast.error('Client does not have an email address');
      return;
    }
    setIsSending(true);
    try {
      const result = await sendEstimateAction({ estimateId: estimate.id });
      if (!result.success) {
        toast.error(result.error || 'Failed to send email');
        return;
      }
      toast.success('Estimate sent to client!');
      router.refresh();
    } catch (error) {
      console.error('Error sending estimate:', error);
      toast.error('Failed to send estimate');
    } finally {
      setIsSending(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStatusChange = async (newStatus: EstimateStatus) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ status: newStatus })
        .eq('id', estimate.id);

      if (error) throw error;
      toast.success(`Status updated to ${statusConfig[newStatus].label}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const newArchivedAt = archivedAt ? null : new Date().toISOString();
    try {
      const { error } = await supabase
        .from('estimates')
        .update({ archived_at: newArchivedAt })
        .eq('id', estimate.id);

      if (error) throw error;
      setArchivedAt(newArchivedAt);
      toast.success(newArchivedAt ? 'Estimate archived' : 'Estimate restored');
      if (newArchivedAt) router.push('/estimates');
    } catch (error) {
      console.error('Error archiving estimate:', error);
      toast.error('Failed to update estimate');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConvertToInvoice = async () => {
    setIsConverting(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: userId,
          client_id: estimate.client?.id || null,
          source_estimate_id: estimate.id,
          invoice_number: invoiceNumber,
          title: estimate.title,
          description: estimate.description,
          status: 'unpaid',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tax_rate: estimate.tax_rate,
          notes: estimate.notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = estimate.items.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        sort_order: index,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      toast.success('Invoice created successfully');
      router.push(`/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this estimate? This action cannot be undone.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimate.id);

      if (error) throw error;
      toast.success('Estimate deleted');
      router.push('/estimates');
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast.error('Failed to delete estimate');
    }
  };

  const lineItems: LineItem[] = estimate.items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
  }));

  const statusInfo = statusConfig[estimate.status];

  return (
    <div className="space-y-6">
      {/* Archived banner */}
      {archivedAt && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-700">
            <Archive className="h-4 w-4" />
            <span className="text-sm font-medium">This estimate is archived</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleArchive} disabled={isArchiving}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Restore
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/estimates"
          className="flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Estimates
        </Link>

        <div className="flex items-center gap-3">
          {estimate.status === 'draft' && estimate.client?.email && (
            <Button onClick={handleSendToClient} disabled={isSending}>
              {isSending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Send to Client</>
              )}
            </Button>
          )}

          {/* Owner can approve once estimate is sent */}
          {estimate.status === 'sent' && (
            <Button
              onClick={() => handleStatusChange('approved')}
              disabled={isUpdatingStatus}
              className="bg-green-600 hover:bg-green-700"
            >
              {isUpdatingStatus ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />Approve Estimate</>
              )}
            </Button>
          )}

          {estimate.status === 'approved' && (
            <Button onClick={handleConvertToInvoice} disabled={isConverting}>
              {isConverting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Converting...</>
              ) : (
                <><Receipt className="mr-2 h-4 w-4" />Convert to Invoice</>
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/estimates/${estimate.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusChange('draft')} disabled={isUpdatingStatus}>
                <FileText className="mr-2 h-4 w-4" />Mark as Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('sent')} disabled={isUpdatingStatus}>
                <Send className="mr-2 h-4 w-4" />Mark as Sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('approved')} disabled={isUpdatingStatus}>
                <CheckCircle className="mr-2 h-4 w-4" />Mark as Approved
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('declined')} disabled={isUpdatingStatus}>
                <XCircle className="mr-2 h-4 w-4" />Mark as Failed Deal
              </DropdownMenuItem>
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
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{estimate.title}</h1>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1">
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-slate-500 mt-1">Estimate #{estimate.estimate_number}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Amount</p>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(estimate.total)}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {estimate.description && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{estimate.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-lg">Line Items</CardTitle></CardHeader>
            <CardContent>
              <LineItems items={lineItems} onChange={() => {}} readOnly />
            </CardContent>
          </Card>

          {estimate.notes && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Notes & Terms</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{estimate.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(estimate.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax ({estimate.tax_rate}%)</span>
                <span className="font-medium">{formatCurrency(estimate.tax_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(estimate.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Issue Date</span>
                <span>{formatDate(estimate.issue_date)}</span>
              </div>
              {estimate.valid_until && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Valid Until</span>
                  <span>{formatDate(estimate.valid_until)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {estimate.job_site_address && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Job Site</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span className="whitespace-pre-line">{estimate.job_site_address}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {estimate.client && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Client</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium text-slate-900">{estimate.client.name}</p>
                {estimate.client.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${estimate.client.email}`} className="hover:text-blue-600">
                      {estimate.client.email}
                    </a>
                  </div>
                )}
                {estimate.client.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <a href={`tel:${estimate.client.phone}`} className="hover:text-blue-600">
                      {estimate.client.phone}
                    </a>
                  </div>
                )}
                {estimate.client.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                    <span className="whitespace-pre-line">{estimate.client.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {profile && (
            <Card>
              <CardHeader><CardTitle className="text-lg">From</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {profile.business_name || 'Your Business'}
                  </span>
                </div>
                {profile.license_number && (
                  <p className="text-sm text-slate-500">License: {profile.license_number}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
