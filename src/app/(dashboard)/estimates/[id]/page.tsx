import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { EstimateDetail } from './estimate-detail';

interface EstimatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EstimatePage({ params }: EstimatePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch estimate with client and items
  const { data: estimate, error } = await supabase
    .from('estimates')
    .select(`
      *,
      client:clients(*),
      items:estimate_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !estimate) {
    notFound();
  }

  // Fetch profile for business info (for PDF generation later)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return <EstimateDetail estimate={estimate} profile={profile} userId={user.id} />;
}
