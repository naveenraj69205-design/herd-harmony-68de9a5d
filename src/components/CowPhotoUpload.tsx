import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface CowPhotoUploadProps {
  cowId: string;
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
}

export function CowPhotoUpload({ cowId, currentImageUrl, onUploadComplete }: CowPhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${cowId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cow-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cow-photos')
        .getPublicUrl(filePath);

      // Update cow record with image URL
      const { error: updateError } = await supabase
        .from('cows')
        .update({ image_url: publicUrl })
        .eq('id', cowId);

      if (updateError) {
        throw updateError;
      }

      onUploadComplete(publicUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    try {
      // Remove from storage
      const filePath = `${user.id}/${cowId}`;
      await supabase.storage.from('cow-photos').remove([`${filePath}.jpg`, `${filePath}.png`, `${filePath}.jpeg`, `${filePath}.webp`]);

      // Update cow record
      await supabase
        .from('cows')
        .update({ image_url: null })
        .eq('id', cowId);

      setPreview(null);
      onUploadComplete('');
      toast.success('Photo removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove photo');
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Cow"
            className="w-full h-40 object-cover rounded-lg"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemovePhoto}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed flex flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-sm">Upload Photo</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
