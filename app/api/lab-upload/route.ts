import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const admin = createAdminSupabaseClient();
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const dealRef = formData.get('deal_ref') as string;
  const inspectorName = formData.get('inspector_name') as string;
  const company = formData.get('company') as string;
  const reportType = formData.get('report_type') as string;

  if (!file || !dealRef || !inspectorName || !company) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  // Find the deal by reference code prefix
  const { data: deals } = await admin
    .from('deals')
    .select('id, buyer_id, seller_id')
    .ilike('id', `${dealRef}%`)
    .limit(1);

  if (!deals || deals.length === 0) {
    return NextResponse.json({ error: 'Deal not found. Check the reference code.' }, { status: 404 });
  }

  const deal = deals[0];

  // Upload file to storage
  const filePath = `deals/${deal.id}/lab-${Date.now()}-${file.name}`;
  const { error: uploadError } = await admin.storage.from('deal-documents').upload(filePath, file);
  if (uploadError) {
    return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
  }

  // Create document record
  const { error: docError } = await admin.from('deal_documents').insert({
    deal_id: deal.id,
    doc_type: reportType,
    file_url: filePath,
    uploaded_by: deal.seller_id,
    verified: false,
  });

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // Update verification request if one exists
  await admin.from('verification_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString(), inspector_company: company })
    .eq('deal_id', deal.id)
    .eq('status', 'pending');

  return NextResponse.json({ success: true });
}
