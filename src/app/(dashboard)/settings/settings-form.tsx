'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogoUpload } from '@/components/settings/logo-upload';
import { toast } from 'sonner';
import { Loader2, Save, Building2, Mail, Phone, MapPin, FileText, AlignLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SettingsFormProps {
  profile: Profile | null;
  userId: string;
}

export function SettingsForm({ profile, userId }: SettingsFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    business_name: profile?.business_name || '',
    business_address: profile?.business_address || '',
    business_phone: profile?.business_phone || '',
    business_email: profile?.business_email || '',
    license_number: profile?.license_number || '',
    logo_url: profile?.logo_url || '',
    default_payment_terms: profile?.default_payment_terms || '',
    business_intro: profile?.business_intro || '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (url: string) => {
    setFormData((prev) => ({ ...prev, logo_url: url }));
  };

  const handleLogoRemove = () => {
    setFormData((prev) => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.business_name || null,
          business_address: formData.business_address || null,
          business_phone: formData.business_phone || null,
          business_email: formData.business_email || null,
          license_number: formData.license_number || null,
          logo_url: formData.logo_url || null,
          default_payment_terms: formData.default_payment_terms || null,
          business_intro: formData.business_intro || null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Settings saved successfully');
      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Branding Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Business Branding
          </CardTitle>
          <CardDescription>
            Your logo and business name will appear on all estimates, invoices, and PDF documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LogoUpload
            currentLogoUrl={formData.logo_url || null}
            userId={userId}
            businessName={formData.business_name}
            onUploadComplete={handleLogoUpload}
            onRemove={handleLogoRemove}
          />

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                name="business_name"
                value={formData.business_name}
                onChange={handleChange}
                placeholder="Acme Construction LLC"
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="license_number">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  License Number
                </span>
              </Label>
              <Input
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                placeholder="CSLB #123456"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your contractor license number for legal compliance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Contact Information
          </CardTitle>
          <CardDescription>
            How clients can reach your business. This appears on documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="business_email">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  Email Address
                </span>
              </Label>
              <Input
                id="business_email"
                name="business_email"
                type="email"
                value={formData.business_email}
                onChange={handleChange}
                placeholder="contact@acmeconstruction.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="business_phone">
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  Phone Number
                </span>
              </Label>
              <Input
                id="business_phone"
                name="business_phone"
                type="tel"
                value={formData.business_phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                className="mt-1.5"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="business_address">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Business Address
                </span>
              </Label>
              <Textarea
                id="business_address"
                name="business_address"
                value={formData.business_address}
                onChange={handleChange}
                placeholder="123 Main Street&#10;Suite 100&#10;San Francisco, CA 94102"
                rows={3}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Defaults Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlignLeft className="h-5 w-5 text-blue-600" />
            Document Defaults
          </CardTitle>
          <CardDescription>
            These appear automatically on new estimates and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default_payment_terms">Default Payment Terms</Label>
            <Textarea
              id="default_payment_terms"
              name="default_payment_terms"
              value={formData.default_payment_terms}
              onChange={handleChange}
              placeholder={`Payment due within 30 days of invoice date.\nLate payments subject to 1.5% monthly interest.\nAccepted: check, ACH, Zelle.`}
              rows={4}
              className="mt-1.5"
            />
            <p className="text-xs text-slate-500 mt-1">
              Auto-fills the Notes & Terms field on every new estimate
            </p>
          </div>

          <div>
            <Label htmlFor="business_intro">Business Introduction</Label>
            <Textarea
              id="business_intro"
              name="business_intro"
              value={formData.business_intro}
              onChange={handleChange}
              placeholder="Thank you for the opportunity to provide this estimate. We are committed to quality craftsmanship and clear communication throughout your project."
              rows={3}
              className="mt-1.5"
            />
            <p className="text-xs text-slate-500 mt-1">
              A brief introduction to your business for client-facing documents
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
