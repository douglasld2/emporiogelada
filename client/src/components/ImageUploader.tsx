import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Upload, X, Crop, RotateCw, ZoomIn, ZoomOut, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  aspectRatio?: number;
  label?: string;
  previewClassName?: string;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0,
  brightness: number = 100,
  contrast: number = 100,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.translate(-pixelCrop.x, -pixelCrop.y);
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.92);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', error => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export function ImageUploader({ value, onChange, aspectRatio = 3 / 4, label = 'Imagem', previewClassName }: ImageUploaderProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadCropped = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, brightness, contrast);

      const fileName = `image_${Date.now()}.jpg`;
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fileName,
          size: croppedBlob.size,
          contentType: 'image/jpeg',
        }),
      });

      if (!res.ok) throw new Error('Erro ao solicitar URL de upload');

      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: croppedBlob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!uploadRes.ok) throw new Error('Erro ao fazer upload da imagem');

      onChange(objectPath);
      setIsEditorOpen(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadOriginal = async () => {
    if (!imageSrc) return;

    setIsUploading(true);
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();

      const fileName = `image_${Date.now()}.jpg`;
      const res = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fileName,
          size: blob.size,
          contentType: blob.type || 'image/jpeg',
        }),
      });

      if (!res.ok) throw new Error('Erro ao solicitar URL de upload');

      const { uploadURL, objectPath } = await res.json();

      const uploadRes = await fetch(uploadURL, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
      });

      if (!uploadRes.ok) throw new Error('Erro ao fazer upload da imagem');

      onChange(objectPath);
      setIsEditorOpen(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="flex items-start gap-3">
        {value && (
          <div className={`relative group ${previewClassName || 'w-20 h-24'} bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0`}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid="button-remove-preview"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
            data-testid="button-upload-trigger"
          >
            <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
            <span className="text-sm text-gray-500">
              {value ? 'Trocar imagem' : 'Enviar imagem'}
            </span>
            <span className="block text-xs text-gray-400 mt-1">
              JPG, PNG ou WebP
            </span>
          </button>
        </div>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={(open) => { if (!isUploading) setIsEditorOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" />
              Editar Imagem
            </DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-[400px] bg-gray-900">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                style={{
                  containerStyle: {
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  },
                }}
              />
            )}
          </div>

          <div className="p-4 space-y-4 bg-white border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <ZoomOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="flex-1 accent-black"
                  data-testid="slider-zoom"
                />
                <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
              </div>

              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                title="Girar 90°"
                data-testid="button-rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Brilho</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="flex-1 accent-black"
                  data-testid="slider-brightness"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{brightness}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16">Contraste</span>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="flex-1 accent-black"
                  data-testid="slider-contrast"
                />
                <span className="text-xs text-gray-500 w-10 text-right">{contrast}%</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => { setIsEditorOpen(false); setImageSrc(null); }}
                disabled={isUploading}
                className="flex-1 bg-gray-200 text-gray-900 hover:bg-gray-300 rounded-lg"
                data-testid="button-cancel-crop"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleUploadOriginal}
                disabled={isUploading}
                className="flex-1 bg-gray-700 text-white hover:bg-gray-800 rounded-lg"
                data-testid="button-upload-original"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Usar Original
              </Button>
              <Button
                type="button"
                onClick={handleUploadCropped}
                disabled={isUploading}
                className="flex-1 bg-black text-white hover:bg-gray-900 rounded-lg gap-2"
                data-testid="button-upload-cropped"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Recortar e Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MultiImageUploaderProps {
  values: string[];
  onChange: (urls: string[]) => void;
  aspectRatio?: number;
  label?: string;
}

export function MultiImageUploader({ values, onChange, aspectRatio = 3 / 4, label = 'Imagens Adicionais' }: MultiImageUploaderProps) {
  const handleAdd = (url: string) => {
    if (url) {
      onChange([...values, url]);
    }
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((img, index) => (
            <div key={index} className="relative group">
              <div className="w-16 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img src={img} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-remove-image-${index}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ImageUploader
        onChange={handleAdd}
        aspectRatio={aspectRatio}
        label=""
      />
    </div>
  );
}
