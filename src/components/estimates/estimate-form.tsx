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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LineItems, LineItem } from './line-items';
import { toast } from 'sonner';
import { Loader2, Send, FileText, Plus, UserPlus } from 'lucide-react';
import { sendEstimateAction } from '@/app/actions/send-estimate';

interface EstimateFormProps {
  clients: Client[];
  userId: string;
  defaultPaymentTerms?: string;
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
    job_site_address: string;
    items: LineItem[];
  };
  mode: 'create' | 'edit';
}

export function EstimateForm({ clients: initialClients, userId, defaultPaymentTerms, initialData, mode }: EstimateFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);

  // Local clients list so inline creation can extend it
  const [clientsList, setClientsList] = useState<Client[]>(initialClients);

  // Form state
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [estimateNumber, setEstimateNumber] = useState(initialData?.estimate_number || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<EstimateStatus>(initialData?.status || 'draft');
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(initialData?.valid_until || '');
  const [taxRate, setTaxRate] = useState(initialData?.tax_rate || 0);
  const [notes, setNotes] = useState(
    initialData?.notes !== undefined
      ? initialData.notes
      : (mode === 'create' ? defaultPaymentTerms || '' : '')
  );
  const [jobSiteAddress, setJobSiteAddress] = useState(initialData?.job_site_address || '');
  const [items, setItems] = useState<LineItem[]>(initialData?.items || []);

  // Inline client creation state
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

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

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    setIsCreatingClient(true);
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          user_id: userId,
          name: newClientName.trim(),
          email: newClientEmail.trim() || null,
          phone: newClientPhone.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      const created = newClient as Client;
      setClientsList(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setClientId(created.id);
      setShowNewClientDialog(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      toast.success(`${created.name} added`);
    } catch {
      toast.error('Failed to create client');
    } finally {
      setIsCreatingClient(false);
    }
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

    if (sendEmail) {
      if (!clientId) {
        toast.error('Please select a client to send the estimate');
        return;
      }
      const selectedClient = clientsList.find(c => c.id === clientId);
      if (!selectedClient?.email) {
        toast.error('Selected client does not have an email address');
        return;
      }
    }

    setIsSaving(true);

    try {
      let estimateId: string;

      if (mode === 'create') {
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
            job_site_address: jobSiteAddress || null,
          })
          .select()
          .single();

        if (estimateError) throw estimateError;
        estimateId = estimate.id;

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
            job_site_address: jobSiteAddress || null,
          })
          .eq('id', initialData!.id);

        if (estimateError) throw estimateError;

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

      if (sendEmail) {
        const result = await sendEstimateAction({ estimateId });
        if (!result.success) {
          toast.error(result.error || 'Failed to send email');
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
      {/* Client — Full Width at Top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select
                value={clientId || 'none'}
                onValueChange={(v) => setClientId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client selected</SelectItem>
                  {clientsList.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewClientDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </div>

          <div>
            <Label htmlFor="job_site_address">Job Site Address</Label>
            <Textarea
              id="job_site_address"
              value={jobSiteAddress}
              onChange={(e) => setJobSiteAddress(e.target.value)}
              placeholder={'123 Work Site Drive\nCity, ST 12345'}
              rows={2}
              className="mt-1.5"
            />
            <p className="text-xs text-slate-500 mt-1">
              Where the work will be performed (separate from client billing address)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Estimate Details & Dates */}
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
                    <SelectItem value="declined">Failed Deal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Project Title</Label>
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
            <CardTitle className="text-lg">Dates & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

      {/* Notes & Summary */}
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

      {/* New Client Dialog */}
      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new_client_name">Name *</Label>
              <Input
                id="new_client_name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="John Smith"
                className="mt-1.5"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateClient()}
              />
            </div>
            <div>
              <Label htmlFor="new_client_email">Email</Label>
              <Input
                id="new_client_email"
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="new_client_phone">Phone</Label>
              <Input
                id="new_client_phone"
                type="tel"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewClientDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateClient} disabled={isCreatingClient}>
              {isCreatingClient ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Client
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
