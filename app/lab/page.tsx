import { LabUploadClient } from './lab-upload-client';

export default function LabPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-black text-lg font-bold">M</span>
          </div>
          <h1 className="text-xl font-bold text-white">Lab Report Upload</h1>
          <p className="text-gray-400 text-sm mt-1">Upload inspection results for a MineMarket deal.</p>
        </div>
        <LabUploadClient />
      </div>
    </div>
  );
}
