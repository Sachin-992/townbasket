import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

/**
 * Hook to show toast notifications.
 * 
 * Usage:
 *   const toast = useToast()
 *   toast.success('Order placed!')
 *   toast.error('Something went wrong')
 *   toast.info('Processing...')
 */
export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
    return ctx
}

const TOAST_DURATION = 4000

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const idCounter = useRef(0)

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const addToast = useCallback((message, type = 'info') => {
        const id = ++idCounter.current
        setToasts(prev => [...prev, { id, message, type }])
        setTimeout(() => removeToast(id), TOAST_DURATION)
        return id
    }, [removeToast])

    const value = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        info: (msg) => addToast(msg, 'info'),
        warning: (msg) => addToast(msg, 'warning'),
        remove: removeToast,
    }

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toast-container" role="alert" aria-live="polite">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        onClick={() => removeToast(toast.id)}
                    >
                        <span className="toast-icon">
                            {toast.type === 'success' && '✓'}
                            {toast.type === 'error' && '✕'}
                            {toast.type === 'warning' && '⚠'}
                            {toast.type === 'info' && 'ℹ'}
                        </span>
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>

            <style>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 380px;
          pointer-events: none;
        }

        .toast {
          pointer-events: auto;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          border-radius: 12px;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 500;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          animation: toast-slide-in 0.3s ease-out;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .toast-success { background: #059669; }
        .toast-error { background: #DC2626; }
        .toast-warning { background: #D97706; }
        .toast-info { background: #2563EB; }

        .toast-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
          line-height: 1.4;
        }

        @keyframes toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .toast-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>
        </ToastContext.Provider>
    )
}
