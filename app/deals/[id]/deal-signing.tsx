'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Signature {
  id: string;
  signer_role: string;
  signer_name: string;
  signer_company: string;
  signed_at: string;
  document_hash: string;
}

interface DealSigningProps {
  dealId: string;
  isBuyer: boolean;
  dealStatus: string;
  commodity: string;
  price: number;
  volume: number;
  currency: string;
  incoterm: string;
  counterpartyName: string;
}

export function DealSigning({
  dealId, isBuyer, dealStatus, commodity, price, volume, currency, incoterm, counterpartyName,
}: DealSigningProps) {
  const router = useRouter();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    fetch(`/api/deals/${dealId}/sign`).then(r => r.json()).then(setSignatures).catch(() => {});
  }, [dealId]);

  const mySignature = signatures.find(s => s.signer_role === (isBuyer ? 'buyer' : 'seller'));
  const counterpartySignature = signatures.find(s => s.signer_role === (isBuyer ? 'seller' : 'buyer'));
  const bothSigned = signatures.length >= 2;
  const canSign = ['negotiation', 'second_accept'].includes(dealStatus) && !mySignature;

  async function handleSign() {
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}/sign`, { method: 'POST' });
      if (res.ok) {
        const sig = await res.json();
        setSignatures(prev => [...prev, sig]);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Signing failed');
      }
    } catch {
      setError('Signing failed');
    }
    setSigning(false);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Signatures</h3>
        {bothSigned && (
          <span className="text-xs px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            Both parties signed
          </span>
        )}
      </div>

      {/* Deal terms summary */}
      <div className="bg-gray-950 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500">Deal Terms</p>
          <button onClick={() => setShowTerms(!showTerms)} className="text-[10px] text-gray-500 hover:text-gray-300">
            {showTerms ? 'Hide' : 'Show details'}
          </button>
        </div>
        <p className="text-sm text-white">
          {commodity} · {volume.toLocaleString()}t · {currency} {price}/t · {incoterm}
        </p>
        <p className="text-xs text-gray-500">Total: {currency} {(price * volume).toLocaleString()}</p>
        {showTerms && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400 space-y-1">
            <p>By signing, both parties agree to the above terms including spec tolerances and price adjustment rules as configured in this deal.</p>
            <p>Signatures are timestamped with IP address and a SHA-256 hash of the deal terms for audit purposes.</p>
          </div>
        )}
      </div>

      {/* Signature status */}
      <div className="space-y-3">
        {/* Buyer signature */}
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${
            (isBuyer ? mySignature : counterpartySignature)
              ? 'bg-emerald-500 border-emerald-500 text-black'
              : 'border-gray-600 text-gray-600'
          }`}>
            {(isBuyer ? mySignature : counterpartySignature) ? '\u2713' : ''}
          </span>
          <div className="flex-1">
            <p className={`text-sm ${(isBuyer ? mySignature : counterpartySignature) ? 'text-white' : 'text-gray-500'}`}>
              Buyer {isBuyer ? '(you)' : `(${counterpartyName})`}
            </p>
            {(isBuyer ? mySignature : counterpartySignature) && (
              <p className="text-[10px] text-gray-500">
                Signed {new Date((isBuyer ? mySignature : counterpartySignature)!.signed_at).toLocaleString()}
                {' \u00b7 '}{(isBuyer ? mySignature : counterpartySignature)!.signer_company}
              </p>
            )}
          </div>
        </div>

        {/* Seller signature */}
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] ${
            (!isBuyer ? mySignature : counterpartySignature)
              ? 'bg-emerald-500 border-emerald-500 text-black'
              : 'border-gray-600 text-gray-600'
          }`}>
            {(!isBuyer ? mySignature : counterpartySignature) ? '\u2713' : ''}
          </span>
          <div className="flex-1">
            <p className={`text-sm ${(!isBuyer ? mySignature : counterpartySignature) ? 'text-white' : 'text-gray-500'}`}>
              Seller {!isBuyer ? '(you)' : `(${counterpartyName})`}
            </p>
            {(!isBuyer ? mySignature : counterpartySignature) && (
              <p className="text-[10px] text-gray-500">
                Signed {new Date((!isBuyer ? mySignature : counterpartySignature)!.signed_at).toLocaleString()}
                {' \u00b7 '}{(!isBuyer ? mySignature : counterpartySignature)!.signer_company}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sign button */}
      {canSign && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-3">
            By clicking &quot;Accept &amp; Sign&quot;, you confirm agreement to the deal terms above. This action is recorded with your identity, timestamp, and IP address.
          </p>
          <button
            onClick={handleSign}
            disabled={signing}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {signing ? 'Signing...' : 'Accept & Sign Deal Terms'}
          </button>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      )}

      {!canSign && !bothSigned && mySignature && (
        <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-800">
          Waiting for {isBuyer ? 'seller' : 'buyer'} to sign...
        </p>
      )}

      {/* Audit trail */}
      {signatures.length > 0 && (
        <details className="mt-4 pt-4 border-t border-gray-800">
          <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">
            Audit trail
          </summary>
          <div className="mt-2 space-y-1 text-[10px] text-gray-600 font-mono">
            {signatures.map(sig => (
              <div key={sig.id}>
                {sig.signer_role}: {sig.signer_company} ({sig.signer_name})
                <br />Signed: {new Date(sig.signed_at).toISOString()}
                <br />Hash: {sig.document_hash.slice(0, 16)}...
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
