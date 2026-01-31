import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InvoiceForm } from '@/components/invoices/invoice-form';
import { Client } from '@/types/database';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewInvoicePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className="flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invoices
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
        <p className="text-slate-500 mt-1">
          Create a new invoice for your client
        </p>
      </div>

      <InvoiceForm clients={(clients as Client[]) || []} userId={user.id} mode="create" />
    </div>
  );
}
