import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: dealId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: signatures } = await admin
    .from('deal_signatures')
    .select('*')
    .eq('deal_id', dealId);

  return NextResponse.json(signatures ?? []);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: dealId } = await context.params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get deal
  const { data: deal } = await supabase
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .single();

  if (!deal || (deal.buyer_id !== user.id && deal.seller_id !== user.id)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Only allow signing during negotiation or second_accept
  if (!['negotiation', 'second_accept'].includes(deal.status)) {
    return NextResponse.json({ error: 'Deal must be in negotiation to sign' }, { status: 400 });
  }

  // Check if already signed
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from('deal_signatures')
    .select('id')
    .eq('deal_id', dealId)
    .eq('signer_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: 'You have already signed this deal' }, { status: 409 });
  }

  // Get signer info
  const { data: profile } = await admin.from('users').select('company_name').eq('id', user.id).single();

  // Generate document hash from deal terms
  const dealTerms = JSON.stringify({
    deal_id: deal.id,
    commodity_type: deal.commodity_type,
    volume_tonnes: deal.volume_tonnes,
    agreed_price: deal.agreed_price,
    currency: deal.currency,
    incoterm: deal.incoterm,
    spec_tolerances: deal.spec_tolerances,
    price_adjustment_rules: deal.price_adjustment_rules,
  });
  const documentHash = crypto.createHash('sha256').update(dealTerms).digest('hex');

  const role = deal.buyer_id === user.id ? 'buyer' : 'seller';

  // Get IP and user agent from request headers
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const ua = request.headers.get('user-agent') || 'unknown';

  const { data: signature, error } = await admin
    .from('deal_signatures')
    .insert({
      deal_id: dealId,
      signer_id: user.id,
      signer_role: role,
      signer_name: user.email || 'Unknown',
      signer_company: profile?.company_name || 'Unknown',
      signed_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: ua.slice(0, 200),
      document_hash: documentHash,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(signature, { status: 201 });
}
