import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EstimateForm } from '@/components/estimates/estimate-form';
import { Client } from '@/types/database';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewEstimatePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: clients }, { data: profile }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('profiles').select('default_payment_terms').eq('id', user.id).single(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/estimates"
          className="flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Estimates
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Estimate</h1>
        <p className="text-slate-500 mt-1">
          Create a new estimate for your client
        </p>
      </div>

      <EstimateForm
        clients={(clients as Client[]) || []}
        userId={user.id}
        mode="create"
        defaultPaymentTerms={profile?.default_payment_terms || ''}
      />
    </div>
  );
}
