/**
 * Full-screen page loader shown during React.lazy code-split loading.
 */
export default function PageLoader() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--color-bg, #F8FAFC)',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div className="page-loader-spinner" />
                <p style={{
                    marginTop: '1rem',
                    color: 'var(--color-text-secondary, #64748B)',
                    fontSize: '0.875rem',
                }}>
                    Loading...
                </p>
            </div>
            <style>{`
        .page-loader-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--color-border, #E2E8F0);
          border-top-color: var(--color-primary, #10B981);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
