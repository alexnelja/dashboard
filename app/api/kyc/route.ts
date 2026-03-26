import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const docType = formData.get('doc_type') as string | null;
  if (!file || !docType) return NextResponse.json({ error: 'file and doc_type required' }, { status: 400 });

  const filePath = `kyc/${user.id}/${docType}-${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(filePath, file);
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // Delete existing doc of same type
  await supabase.from('kyc_documents').delete().eq('user_id', user.id).eq('doc_type', docType);

  const { error: dbError } = await supabase.from('kyc_documents').insert({
    user_id: user.id,
    doc_type: docType,
    file_url: filePath,
    file_name: file.name,
  });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ uploaded: true }, { status: 201 });
}
