import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InvoicesList } from './invoices-list';

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .order('created_at', { ascending: false });

  return <InvoicesList invoices={invoices || []} />;
}
