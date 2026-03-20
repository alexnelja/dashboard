'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { COMMODITY_CONFIG } from '@/lib/types';
import type { CommodityType, CurrencyType } from '@/lib/types';

const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP'] as const;
const CURRENCIES: CurrencyType[] = ['USD', 'ZAR', 'EUR'];

export default function NewRequirementPage() {
  const router = useRouter();
  const [commodity, setCommodity] = useState<CommodityType | null>(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [volume, setVolume] = useState('');
  const [deliveryPort, setDeliveryPort] = useState('');
  const [currency, setCurrency] = useState<CurrencyType>('USD');
  const [incoterm, setIncoterm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!commodity) {
      setError('Please select a commodity type.');
      return;
    }
    if (!targetPrice || !volume) {
      setError('Target price and volume are required.');
      return;
    }
    if (!deliveryPort.trim()) {
      setError('Delivery port is required.');
      return;
    }
    if (!incoterm) {
      setError('Please select an incoterm.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setError('You must be logged in to post a requirement.');
        return;
      }

      const { error: insertError } = await supabase.from('requirements').insert({
        buyer_id: authUser.id,
        commodity_type: commodity,
        target_spec_range: {},
        volume_needed: parseFloat(volume),
        target_price: parseFloat(targetPrice),
        currency,
        delivery_port: deliveryPort.trim(),
        incoterm,
        status: 'active',
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push('/marketplace?tab=requirements');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Requirement</h1>
        <p className="text-gray-400 text-sm mt-1">Post what commodity you&apos;re looking to buy.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Commodity selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Commodity</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(COMMODITY_CONFIG) as [CommodityType, { label: string; color: string }][]).map(
              ([type, cfg]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCommodity(type)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    commodity === type
                      ? 'border-white text-white bg-gray-800'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  {cfg.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Target price + Volume */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Target price per tonne</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 175.00"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Volume needed (tonnes)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="e.g. 3000"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
        </div>

        {/* Delivery port */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Delivery Port</label>
          <input
            type="text"
            value={deliveryPort}
            onChange={(e) => setDeliveryPort(e.target.value)}
            placeholder="e.g. Port of Durban"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />
        </div>

        {/* Currency selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
          <div className="flex gap-2">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  currency === c
                    ? 'border-white text-white bg-gray-800'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Incoterm single-select */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Incoterm</label>
          <div className="flex flex-wrap gap-2">
            {INCOTERMS.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setIncoterm(term)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  incoterm === term
                    ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                }`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Posting…' : 'Post Requirement'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
