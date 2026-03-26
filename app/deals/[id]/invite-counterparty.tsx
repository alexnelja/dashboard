'use client';

import { useState } from 'react';

interface InviteCounterpartyProps {
  dealId: string;
  counterpartyName: string;
}

export function InviteCounterparty({ dealId, counterpartyName }: InviteCounterpartyProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/deals/${dealId}`;

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch {
      setError('Failed to send invite');
    }
    setSending(false);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Invite Counterparty</h3>

      {/* Copy link */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Share this deal link:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteLink}
            className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none"
          />
          <button
            onClick={copyLink}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Email invite */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-500 mb-2">Or send an email invite:</p>
        {sent ? (
          <p className="text-xs text-emerald-400">Invite sent successfully!</p>
        ) : (
          <form onSubmit={sendInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="counterparty@company.com"
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {sending ? 'Sending...' : 'Invite'}
            </button>
          </form>
        )}
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}
