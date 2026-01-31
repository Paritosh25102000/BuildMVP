import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { Client } from '@/types/database';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch invoice with items
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  // Transform invoice data for the form
  const initialData = {
    id: invoice.id,
    client_id: invoice.client_id,
    invoice_number: invoice.invoice_number,
    title: invoice.title,
    description: invoice.description || '',
    status: invoice.status,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    tax_rate: invoice.tax_rate,
    notes: invoice.notes || '',
    items: invoice.items.map((item: { id: string; description: string; quantity: number; unit: string; unit_price: number }) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/invoices/${id}`}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invoice
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Invoice</h1>
        <p className="text-slate-500 mt-1">
          Update invoice details and line items
        </p>
      </div>

      <InvoiceForm
        clients={(clients as Client[]) || []}
        userId={user.id}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}
