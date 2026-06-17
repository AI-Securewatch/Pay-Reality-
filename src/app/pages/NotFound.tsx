import { Link } from "react-router";
import { AlertTriangle } from "lucide-react";

export function NotFound() {
  return (
    <div 
      className="flex items-center justify-center min-h-screen p-8" 
      style={{ backgroundColor: 'var(--pr-bg-primary)' }}
    >
      <div className="text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <AlertTriangle className="w-12 h-12" style={{ color: 'var(--pr-warning-amber)' }} />
        </div>
        <h1 className="mb-4" style={{ color: 'var(--pr-text-primary)' }}>Page Not Found</h1>
        <p className="mb-6" style={{ color: 'var(--pr-text-muted)' }}>The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-block px-6 py-3 rounded-lg transition-all"
          style={{ 
            backgroundColor: 'var(--pr-authority-blue)',
            color: 'var(--pr-text-primary)',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
