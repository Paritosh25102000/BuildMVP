'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEstimateEmail } from '@/lib/email';

interface SendEstimateActionParams {
  estimateId: string;
}

export async function sendEstimateAction({ estimateId }: SendEstimateActionParams) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Fetch estimate with client info
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', estimateId)
    .single();

  if (estimateError || !estimate) {
    return { success: false, error: 'Estimate not found' };
  }

  // Check if client has email
  if (!estimate.client?.email) {
    return { success: false, error: 'Client does not have an email address' };
  }

  // Fetch business profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const businessName = profile?.business_name || 'Your Business';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const viewUrl = `${baseUrl}/estimates/${estimateId}`;

  try {
    await sendEstimateEmail({
      to: estimate.client.email,
      clientName: estimate.client.name,
      estimateNumber: estimate.estimate_number,
      estimateTitle: estimate.title,
      total: estimate.total,
      validUntil: estimate.valid_until,
      viewUrl,
      businessName,
    });

    // Update estimate status to 'sent'
    await supabase
      .from('estimates')
      .update({ status: 'sent' })
      .eq('id', estimateId);

    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to send estimate email:', error);

    // Check for Resend domain verification error
    const resendError = error as { statusCode?: number; message?: string };
    if (resendError?.statusCode === 403 && resendError?.message?.includes('verify a domain')) {
      return {
        success: false,
        error: 'For testing, use your own email as the client email. Verify a domain at resend.com for production.'
      };
    }

    return { success: false, error: 'Failed to send email. Please check your email configuration.' };
  }
}
