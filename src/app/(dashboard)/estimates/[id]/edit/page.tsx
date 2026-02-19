import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { EstimateForm } from '@/components/estimates/estimate-form';
import { Client } from '@/types/database';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface EditEstimatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEstimatePage({ params }: EditEstimatePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch estimate with items
  const { data: estimate, error } = await supabase
    .from('estimates')
    .select(`
      *,
      items:estimate_items(*)
    `)
    .eq('id', id)
    .single();

  if (error || !estimate) {
    notFound();
  }

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('name');

  // Transform estimate data for the form
  const initialData = {
    id: estimate.id,
    client_id: estimate.client_id,
    estimate_number: estimate.estimate_number,
    title: estimate.title,
    description: estimate.description || '',
    status: estimate.status,
    issue_date: estimate.issue_date,
    valid_until: estimate.valid_until,
    tax_rate: estimate.tax_rate,
    notes: estimate.notes || '',
    job_site_address: estimate.job_site_address || '',
    items: estimate.items.map((item: { id: string; description: string; quantity: number; unit: string; unit_price: number }) => ({
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
          href={`/estimates/${id}`}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Estimate
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Estimate</h1>
        <p className="text-slate-500 mt-1">
          Update estimate details and line items
        </p>
      </div>

      <EstimateForm
        clients={(clients as Client[]) || []}
        userId={user.id}
        initialData={initialData}
        mode="edit"
      />
    </div>
  );
}
