import { Sidebar } from './sidebar';
import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/database';

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar profile={profile} userEmail={user?.email || null} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
