import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-700 mb-4">404</p>
        <h1 className="text-xl font-semibold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 text-sm mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/deals" className="text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors">
            Go to Deals
          </Link>
          <Link href="/simulator" className="text-sm border border-gray-700 text-gray-300 hover:border-gray-500 px-4 py-2 rounded-lg transition-colors">
            Deal Simulator
          </Link>
        </div>
      </div>
    </div>
  );
}
