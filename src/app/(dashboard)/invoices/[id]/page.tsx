import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { InvoiceDetail } from './invoice-detail';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch invoice with client and items
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Fetch profile for business info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <InvoiceDetail invoice={invoice} profile={profile} />;
}
