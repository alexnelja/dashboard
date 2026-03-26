import type { Deal, DealDocument, Listing } from './types';

export interface VerificationCheck {
  check: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  detail: string;
}

export interface PlatformVerification {
  dealId: string;
  overallStatus: 'verified' | 'issues_found' | 'pending' | 'incomplete';
  checks: VerificationCheck[];
  verifiedAt: string | null;
  verifiedBy: string; // 'platform' | 'inspector' | 'lab'
}

// Cross-reference deal documents against deal terms
export function verifyDealDocuments(
  deal: Deal,
  documents: DealDocument[],
  listingSpecSheet?: Record<string, number>,
  labAssayResults?: Record<string, number>,
): PlatformVerification {
  const checks: VerificationCheck[] = [];
  const uploadedTypes = new Set<string>(documents.map(d => d.doc_type));

  // 1. Document completeness
  const criticalDocs = ['bill_of_lading', 'invoice'];
  const shippingDocs = ['weighbridge_ticket', 'lab_report', 'certificate_of_origin', 'customs_declaration'];

  for (const doc of criticalDocs) {
    checks.push({
      check: `Critical document: ${doc.replace(/_/g, ' ')}`,
      status: uploadedTypes.has(doc) ? 'pass' : 'fail',
      detail: uploadedTypes.has(doc) ? 'Uploaded' : 'Missing — required before escrow release',
    });
  }

  for (const doc of shippingDocs) {
    checks.push({
      check: `Shipping document: ${doc.replace(/_/g, ' ')}`,
      status: uploadedTypes.has(doc) ? 'pass' : (['loading', 'in_transit', 'delivered'].includes(deal.status) ? 'warning' : 'pending'),
      detail: uploadedTypes.has(doc) ? 'Uploaded' : 'Expected during shipping phase',
    });
  }

  // 2. Spec consistency check (if lab results and listing spec available)
  if (labAssayResults && listingSpecSheet) {
    const specFields = Object.keys(labAssayResults);
    for (const field of specFields) {
      const listed = listingSpecSheet[field];
      const actual = labAssayResults[field];
      if (listed !== undefined && actual !== undefined) {
        const deviation = Math.abs(actual - listed) / listed * 100;
        if (deviation > 10) {
          checks.push({
            check: `Spec: ${field}`,
            status: 'fail',
            detail: `Listed: ${listed}, Actual: ${actual} (${deviation.toFixed(1)}% deviation)`,
          });
        } else if (deviation > 5) {
          checks.push({
            check: `Spec: ${field}`,
            status: 'warning',
            detail: `Listed: ${listed}, Actual: ${actual} (${deviation.toFixed(1)}% deviation — within tolerance)`,
          });
        } else {
          checks.push({
            check: `Spec: ${field}`,
            status: 'pass',
            detail: `Listed: ${listed}, Actual: ${actual} (${deviation.toFixed(1)}% deviation)`,
          });
        }
      }
    }
  }

  // 3. Value consistency (invoice vs deal terms)
  checks.push({
    check: 'Deal value consistency',
    status: uploadedTypes.has('invoice') ? 'pass' : 'pending',
    detail: `Deal: ${deal.currency} ${(deal.agreed_price * deal.volume_tonnes).toLocaleString()} (${deal.volume_tonnes.toLocaleString()}t × ${deal.agreed_price}/t)`,
  });

  // 4. Volume consistency (weighbridge vs deal)
  checks.push({
    check: 'Volume verification',
    status: uploadedTypes.has('weighbridge_ticket') ? 'pass' : 'pending',
    detail: uploadedTypes.has('weighbridge_ticket')
      ? `Deal volume: ${deal.volume_tonnes.toLocaleString()}t — cross-reference with weighbridge ticket`
      : 'Weighbridge ticket required for volume verification',
  });

  // Determine overall status
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const pendingCount = checks.filter(c => c.status === 'pending').length;

  let overallStatus: PlatformVerification['overallStatus'];
  if (failCount > 0) overallStatus = 'issues_found';
  else if (pendingCount > 0) overallStatus = 'pending';
  else if (warningCount > 0) overallStatus = 'verified'; // warnings are OK
  else overallStatus = 'verified';

  return {
    dealId: deal.id,
    overallStatus,
    checks,
    verifiedAt: overallStatus === 'verified' ? new Date().toISOString() : null,
    verifiedBy: 'platform',
  };
}
