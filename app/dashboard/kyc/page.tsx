import { requireAuth } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { KycUpload } from './kyc-upload';

const KYC_DOC_TYPES = [
  { key: 'company_registration', label: 'Company Registration', required: true },
  { key: 'tax_clearance', label: 'Tax Clearance Certificate', required: true },
  { key: 'bee_certificate', label: 'B-BBEE Certificate', required: false },
  { key: 'mining_license', label: 'Mining License', required: false },
  { key: 'bank_confirmation', label: 'Bank Confirmation Letter', required: true },
  { key: 'directors_id', label: 'Directors ID / Passport', required: true },
  { key: 'proof_of_address', label: 'Proof of Address', required: true },
  { key: 'export_license', label: 'Export License', required: false },
];

export default async function KycPage() {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  const { data: docs } = await supabase
    .from('kyc_documents')
    .select('*')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false });

  const uploadedTypes = new Set((docs ?? []).map(d => d.doc_type));
  const requiredCount = KYC_DOC_TYPES.filter(t => t.required).length;
  const completedRequired = KYC_DOC_TYPES.filter(t => t.required && uploadedTypes.has(t.key)).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Documents</h1>
        <p className="text-gray-400 text-sm mt-1">Upload your company documents once. Share with counterparties per deal.</p>
      </div>

      {/* Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white font-medium">Verification Progress</span>
          <span className="text-xs text-gray-500">{completedRequired}/{requiredCount} required</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full">
          <div
            className={`h-full rounded-full transition-all ${completedRequired === requiredCount ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${(completedRequired / requiredCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Document list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {KYC_DOC_TYPES.map(docType => {
          const uploaded = (docs ?? []).find(d => d.doc_type === docType.key);
          return (
            <div key={docType.key} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                  uploaded ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-gray-600 text-gray-600'
                }`}>
                  {uploaded ? '\u2713' : ''}
                </span>
                <div>
                  <p className={`text-sm ${uploaded ? 'text-white' : 'text-gray-400'}`}>{docType.label}</p>
                  {docType.required && !uploaded && <p className="text-[10px] text-amber-400">Required</p>}
                  {uploaded && <p className="text-[10px] text-gray-500">{new Date(uploaded.uploaded_at).toLocaleDateString()}</p>}
                </div>
              </div>
              <KycUpload docType={docType.key} existingDoc={uploaded} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
