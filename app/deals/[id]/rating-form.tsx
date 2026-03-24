'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const DIMENSIONS = [
  { key: 'spec_accuracy', label: 'Spec Accuracy', description: 'Material matched agreed specifications' },
  { key: 'timeliness', label: 'Timeliness', description: 'Delivered on schedule' },
  { key: 'communication', label: 'Communication', description: 'Responsive and clear communication' },
  { key: 'documentation', label: 'Documentation', description: 'Complete and accurate paperwork' },
];

interface RatingFormProps {
  dealId: string;
}

export function RatingForm({ dealId }: RatingFormProps) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({
    spec_accuracy: 0,
    timeliness: 0,
    communication: 0,
    documentation: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setRating(key: string, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all ratings filled
    for (const dim of DIMENSIONS) {
      if (!ratings[dim.key] || ratings[dim.key] === 0) {
        setError(`Please rate ${dim.label}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/deals/${dealId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ratings, comment: comment || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit rating');
        return;
      }

      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Rate this Deal</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {DIMENSIONS.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-white">{dim.label}</label>
              <span className="text-xs text-gray-500">{dim.description}</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(dim.key, value)}
                  className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${
                    ratings[dim.key] >= value
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-gray-950 text-gray-600 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <label className="text-sm text-white block mb-1">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Any additional feedback…"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Rating'}
        </button>
      </form>
    </div>
  );
}
