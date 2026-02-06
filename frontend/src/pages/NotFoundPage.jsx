/**
 * 404 Not Found Page
 * 
 * SEO-compliant 404 page with proper messaging and navigation.
 * This page should return HTTP 404 status (handled by server config).
 */
import { Link, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle } from 'lucide-react';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-emerald-200 select-none">404</div>
          <div className="text-2xl font-semibold text-gray-800 -mt-4">Page Not Found</div>
        </div>

        {/* Message */}
        <p className="text-gray-600 mb-2">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <p className="text-sm text-gray-400 mb-8 font-mono">
          {location.pathname}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            <Home size={20} />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>

        {/* Help Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Need help?</p>
          <div className="flex justify-center gap-6">
            <Link
              to="/customer/help"
              className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
            >
              <HelpCircle size={16} />
              Help Center
            </Link>
            <Link
              to="/customer/contact"
              className="text-emerald-600 hover:text-emerald-700 text-sm flex items-center gap-1"
            >
              <Search size={16} />
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
