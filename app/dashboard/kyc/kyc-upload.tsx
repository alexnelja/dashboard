'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface KycUploadProps {
  docType: string;
  existingDoc: { id: string; file_url: string; file_name: string } | null | undefined;
}

export function KycUpload({ docType, existingDoc }: KycUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);

    const res = await fetch('/api/kyc', { method: 'POST', body: formData });
    if (res.ok) router.refresh();
    setUploading(false);
  }

  return (
    <label className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors cursor-pointer">
      {uploading ? 'Uploading...' : existingDoc ? 'Replace' : 'Upload'}
      <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
    </label>
  );
}
