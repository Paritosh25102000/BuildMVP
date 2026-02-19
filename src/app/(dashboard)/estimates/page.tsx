import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EstimatesList } from './estimates-list';

export default async function EstimatesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: estimates } = await supabase
    .from('estimates')
    .select('*, client:clients(*)')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  return <EstimatesList estimates={estimates || []} />;
}
