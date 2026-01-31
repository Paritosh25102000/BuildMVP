'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  currentLogoUrl: string | null;
  userId: string;
  businessName: string | null;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
}

export function LogoUpload({
  currentLogoUrl,
  userId,
  businessName,
  onUploadComplete,
  onRemove,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const initials = (businessName || 'My Business')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setError('Image size must be less than 2MB');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Create local preview
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (currentLogoUrl) {
        const oldPath = currentLogoUrl.split('/logos/')[1];
        if (oldPath) {
          await supabase.storage.from('logos').remove([oldPath]);
        }
      }

      // Upload new logo to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(data.path);

      // Notify parent component
      onUploadComplete(publicUrl);

      // Clean up local preview
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload logo. Please try again.');
      setPreviewUrl(currentLogoUrl);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentLogoUrl) return;

    setIsUploading(true);
    try {
      // Extract path from URL
      const path = currentLogoUrl.split('/logos/')[1];
      if (path) {
        await supabase.storage.from('logos').remove([path]);
      }
      setPreviewUrl(null);
      onRemove();
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        {/* Logo Preview */}
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-dashed border-slate-300">
            <AvatarImage src={previewUrl || undefined} className="object-cover" />
            <AvatarFallback className="bg-slate-100 text-slate-500 text-2xl">
              {previewUrl ? (
                <ImageIcon className="h-8 w-8" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-slate-900">Business Logo</h4>
            <p className="text-sm text-slate-500">
              This logo will appear on your estimates, invoices, and PDFs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? 'Change Logo' : 'Upload Logo'}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Recommended: Square image, at least 200x200px. Max 2MB.
          </p>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
