import { useState, useCallback, createContext, useContext } from 'react'

const ConfirmContext = createContext(null)

/**
 * Hook to show a confirm modal (replaces window.confirm).
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm('Delete this product?', 'This action cannot be undone.')
 *   if (ok) { ... }
 */
export function useConfirm() {
    const ctx = useContext(ConfirmContext)
    if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>')
    return ctx.confirm
}

export function ConfirmProvider({ children }) {
    const [state, setState] = useState({
        open: false,
        title: '',
        message: '',
        resolve: null,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        variant: 'danger',
    })

    const confirm = useCallback((title, message = '', options = {}) => {
        return new Promise(resolve => {
            setState({
                open: true,
                title,
                message,
                resolve,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                variant: options.variant || 'danger',
            })
        })
    }, [])

    const handleConfirm = () => {
        state.resolve?.(true)
        setState(s => ({ ...s, open: false }))
    }

    const handleCancel = () => {
        state.resolve?.(false)
        setState(s => ({ ...s, open: false }))
    }

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state.open && (
                <div className="confirm-overlay" onClick={handleCancel}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title">{state.title}</h3>
                        {state.message && <p className="confirm-message">{state.message}</p>}
                        <div className="confirm-actions">
                            <button
                                className="confirm-btn confirm-btn-cancel"
                                onClick={handleCancel}
                            >
                                {state.cancelText}
                            </button>
                            <button
                                className={`confirm-btn confirm-btn-${state.variant}`}
                                onClick={handleConfirm}
                                autoFocus
                            >
                                {state.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: confirm-fade-in 0.2s ease-out;
        }

        .confirm-modal {
          background: #fff;
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: confirm-scale-in 0.2s ease-out;
        }

        .confirm-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1E293B;
          margin: 0 0 0.5rem 0;
        }

        .confirm-message {
          font-size: 0.875rem;
          color: #64748B;
          margin: 0 0 1.25rem 0;
          line-height: 1.5;
        }

        .confirm-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .confirm-btn {
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }

        .confirm-btn-cancel {
          background: #F1F5F9;
          color: #475569;
        }
        .confirm-btn-cancel:hover {
          background: #E2E8F0;
        }

        .confirm-btn-danger {
          background: #EF4444;
          color: #fff;
        }
        .confirm-btn-danger:hover {
          background: #DC2626;
        }

        .confirm-btn-primary {
          background: #10B981;
          color: #fff;
        }
        .confirm-btn-primary:hover {
          background: #059669;
        }

        @keyframes confirm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes confirm-scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </ConfirmContext.Provider>
    )
}
