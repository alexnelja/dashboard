// app/api/verifications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can submit verifications
  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { listing_id, lab_report_url, assay_results, badge_level } = body;

  // Validate required fields
  if (!listing_id || typeof listing_id !== 'string') {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }
  if (!lab_report_url || typeof lab_report_url !== 'string') {
    return NextResponse.json({ error: 'lab_report_url is required' }, { status: 400 });
  }
  if (assay_results && typeof assay_results !== 'object') {
    return NextResponse.json({ error: 'assay_results must be a JSON object' }, { status: 400 });
  }
  if (badge_level && !['standard', 'premium'].includes(badge_level)) {
    return NextResponse.json({ error: 'badge_level must be "standard" or "premium"' }, { status: 400 });
  }

  // Verify the listing exists
  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listing_id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  // Insert verification record
  const { data: verification, error: insertError } = await supabase
    .from('verifications')
    .insert({
      listing_id,
      lab_report_url,
      assay_results: assay_results ?? {},
      badge_level: badge_level ?? 'standard',
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update the listing's is_verified flag
  const { error: updateError } = await supabase
    .from('listings')
    .update({ is_verified: true })
    .eq('id', listing_id);

  if (updateError) {
    // Non-fatal: verification was saved but listing flag wasn't updated
    console.error('Failed to update listing is_verified:', updateError.message);
  }

  return NextResponse.json(verification, { status: 201 });
}
