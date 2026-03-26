'use client';

import { useState } from 'react';

export function LabUploadClient() {
  const [dealRef, setDealRef] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [company, setCompany] = useState('');
  const [reportType, setReportType] = useState('lab_report');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dealRef || !file || !inspectorName || !company) {
      setErrorMsg('All fields are required');
      return;
    }

    setStatus('uploading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('deal_ref', dealRef);
    formData.append('inspector_name', inspectorName);
    formData.append('company', company);
    formData.append('report_type', reportType);

    try {
      const res = await fetch('/api/lab-upload', { method: 'POST', body: formData });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Upload failed');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Upload failed. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center">
        <p className="text-emerald-400 text-lg font-semibold mb-2">Report uploaded successfully</p>
        <p className="text-gray-400 text-sm">Both parties on the deal have been notified.</p>
        <button onClick={() => { setStatus('idle'); setFile(null); setDealRef(''); }} className="mt-4 text-sm text-gray-400 hover:text-white underline">
          Upload another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Deal Reference Code</label>
        <input
          type="text"
          value={dealRef}
          onChange={e => setDealRef(e.target.value)}
          placeholder="e.g. c75f690b"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
        <p className="text-[10px] text-gray-500 mt-1">First 8 characters of the deal ID (from the inspection request email)</p>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Inspector Name</label>
        <input type="text" value={inspectorName} onChange={e => setInspectorName(e.target.value)} placeholder="John Smith"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500" />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Inspection Company</label>
        <select value={company} onChange={e => setCompany(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500">
          <option value="">Select company</option>
          <option value="SGS">SGS</option>
          <option value="Bureau Veritas">Bureau Veritas</option>
          <option value="Intertek">Intertek</option>
          <option value="Alfred H Knight">Alfred H Knight</option>
          <option value="Cotecna">Cotecna</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Report Type</label>
        <select value={reportType} onChange={e => setReportType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gray-500">
          <option value="lab_report">Lab Report / Certificate of Analysis</option>
          <option value="assay_certificate">Assay Certificate</option>
          <option value="draft_survey">Draft Survey</option>
          <option value="weighbridge_ticket">Weighbridge Ticket</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Report File</label>
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.jpeg,.png"
          className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-700 file:text-sm file:font-medium file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700" />
      </div>

      {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

      <button type="submit" disabled={status === 'uploading'}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors">
        {status === 'uploading' ? 'Uploading...' : 'Upload Report'}
      </button>
    </form>
  );
}
