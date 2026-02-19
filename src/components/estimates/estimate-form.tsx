'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Client, EstimateStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LineItems, LineItem } from './line-items';
import { toast } from 'sonner';
import { Loader2, Save, Send, FileText } from 'lucide-react';
import { sendEstimateAction } from '@/app/actions/send-estimate';

interface EstimateFormProps {
  clients: Client[];
  userId: string;
  initialData?: {
    id?: string;
    client_id: string | null;
    estimate_number: string;
    title: string;
    description: string;
    status: EstimateStatus;
    issue_date: string;
    valid_until: string | null;
    tax_rate: number;
    notes: string;
    items: LineItem[];
  };
  mode: 'create' | 'edit';
}

export function EstimateForm({ clients, userId, initialData, mode }: EstimateFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [estimateNumber, setEstimateNumber] = useState(initialData?.estimate_number || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<EstimateStatus>(initialData?.status || 'draft');
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(initialData?.valid_until || '');
  const [taxRate, setTaxRate] = useState(initialData?.tax_rate || 0);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [items, setItems] = useState<LineItem[]>(initialData?.items || []);

  // Generate estimate number on mount for new estimates
  useEffect(() => {
    if (mode === 'create' && !estimateNumber) {
      const prefix = 'EST';
      const timestamp = Date.now().toString().slice(-6);
      setEstimateNumber(`${prefix}-${timestamp}`);
    }
  }, [mode, estimateNumber]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSubmit = async (saveStatus: EstimateStatus = status, sendEmail: boolean = false) => {
    if (!title.trim()) {
      toast.error('Please enter an estimate title');
      return;
    }

    if (!estimateNumber.trim()) {
      toast.error('Please enter an estimate number');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    // If sending email, require a client with email
    if (sendEmail) {
      if (!clientId) {
        toast.error('Please select a client to send the estimate');
        return;
      }
      const selectedClient = clients.find(c => c.id === clientId);
      if (!selectedClient?.email) {
        toast.error('Selected client does not have an email address');
        return;
      }
    }

    setIsSaving(true);

    try {
      let estimateId: string;

      if (mode === 'create') {
        // Create new estimate (save as draft first if sending)
        const { data: estimate, error: estimateError } = await supabase
          .from('estimates')
          .insert({
            user_id: userId,
            client_id: clientId || null,
            estimate_number: estimateNumber,
            title,
            description: description || null,
            status: sendEmail ? 'draft' : saveStatus,
            issue_date: issueDate,
            valid_until: validUntil || null,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: notes || null,
          })
          .select()
          .single();

        if (estimateError) throw estimateError;
        estimateId = estimate.id;

        // Create line items
        const itemsToInsert = items.map((item, index) => ({
          estimate_id: estimate.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('estimate_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      } else {
        estimateId = initialData!.id!;

        // Update existing estimate
        const { error: estimateError } = await supabase
          .from('estimates')
          .update({
            client_id: clientId || null,
            estimate_number: estimateNumber,
            title,
            description: description || null,
            status: sendEmail ? initialData!.status : saveStatus,
            issue_date: issueDate,
            valid_until: validUntil || null,
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: notes || null,
          })
          .eq('id', initialData!.id);

        if (estimateError) throw estimateError;

        // Delete existing items and re-create
        await supabase
          .from('estimate_items')
          .delete()
          .eq('estimate_id', initialData!.id);

        const itemsToInsert = items.map((item, index) => ({
          estimate_id: initialData!.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          sort_order: index,
        }));

        if (itemsToInsert.length > 0) {
          const { error: itemsError } = await supabase
            .from('estimate_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // Send email if requested
      if (sendEmail) {
        const result = await sendEstimateAction({ estimateId });
        if (!result.success) {
          toast.error(result.error || 'Failed to send email');
          // Still redirect to the estimate page even if email fails
          router.push(`/estimates/${estimateId}`);
          router.refresh();
          return;
        }
        toast.success('Estimate sent successfully!');
      } else {
        toast.success(mode === 'create' ? 'Estimate created successfully' : 'Estimate updated successfully');
      }

      router.push(`/estimates/${estimateId}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving estimate:', error);
      toast.error('Failed to save estimate. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estimate Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="estimate_number">Estimate #</Label>
                <Input
                  id="estimate_number"
                  value={estimateNumber}
                  onChange={(e) => setEstimateNumber(e.target.value)}
                  placeholder="EST-001"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as EstimateStatus)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kitchen Renovation Project"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the project scope..."
                rows={2}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Client & Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={clientId || 'none'}
                onValueChange={(v) => setClientId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client selected</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tax_rate">Tax Rate (%)</Label>
              <Input
                id="tax_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="8.25"
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItems items={items} onChange={setItems} />
        </CardContent>
      </Card>

      {/* Totals & Notes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, conditions, or additional notes..."
              rows={4}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Tax ({taxRate}%)</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-blue-600">{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleSubmit('draft')}
          disabled={isSaving}
        >
          <FileText className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('sent', true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Save & Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
