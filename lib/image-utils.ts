export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function resizeForAPI(b64: string, maxW = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.src = `data:image/jpeg;base64,${b64}`;
  });
}

export function getMediaType(f: File): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (f.type === 'image/png') return 'image/png';
  if (f.type === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}
