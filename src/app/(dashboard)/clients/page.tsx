import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ClientList } from './client-list';

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">
            Manage your customers and their contact information
          </p>
        </div>
      </div>

      <ClientList clients={clients || []} userId={user.id} />
    </div>
  );
}
