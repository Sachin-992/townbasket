import { useState, useRef, useEffect, memo } from 'react'
import ICON_MAP from '../utils/iconMap'

const { Bell, X, ShieldAlert, AlertTriangle, MessageSquareWarning, Check } = ICON_MAP

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-l-red-500',
        icon: 'text-red-600 dark:text-red-400',
        badge: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-l-amber-500',
        icon: 'text-amber-600 dark:text-amber-400',
        badge: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-l-blue-500',
        icon: 'text-blue-600 dark:text-blue-400',
        badge: 'bg-blue-500',
    },
}

const TYPE_ICONS = {
    fraud: ShieldAlert,
    anomaly: AlertTriangle,
    complaint: MessageSquareWarning,
}

function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
}

/**
 * AlertCenter — dropdown bell icon panel showing all real-time alerts.
 *
 * @param {{ alerts: Array, unreadCount: number, onMarkRead: Function, onDismiss: Function, onClearAll: Function }} props
 */
function AlertCenter({ alerts = [], unreadCount = 0, onMarkRead, onDismiss, onClearAll }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    return (
        <div className="relative" ref={ref}>
            {/* Bell trigger */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                title="Alert Center"
            >
                <Bell size={18} className="text-gray-500 dark:text-gray-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full px-1 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Bell size={14} className="text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Alerts</h3>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {alerts.length > 0 && (
                            <button
                                onClick={() => { onClearAll?.(); setOpen(false) }}
                                className="text-[10px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-wider"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Alert list */}
                    <div className="max-h-[360px] overflow-y-auto overscroll-contain">
                        {alerts.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                <p className="text-xs text-gray-400 dark:text-gray-500">No alerts</p>
                            </div>
                        ) : (
                            alerts.map((alert) => {
                                const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info
                                const TypeIcon = TYPE_ICONS[alert.type] || AlertTriangle

                                return (
                                    <div
                                        key={alert.id}
                                        className={`px-4 py-3 border-l-[3px] ${sev.border} ${!alert.read ? sev.bg : 'bg-transparent'} border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <TypeIcon size={14} className={`${sev.icon} mt-0.5 flex-shrink-0`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-xs font-semibold ${!alert.read ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {alert.title}
                                                    </p>
                                                    {!alert.read && <span className={`w-1.5 h-1.5 rounded-full ${sev.badge}`} />}
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                    {alert.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                                    {timeAgo(alert.timestamp)}
                                                </p>
                                            </div>
                                            {/* Actions */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!alert.read && (
                                                    <button
                                                        onClick={() => onMarkRead?.(alert.id)}
                                                        className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-600/50"
                                                        title="Mark read"
                                                    >
                                                        <Check size={12} className="text-gray-400" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDismiss?.(alert.id)}
                                                    className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-600/50"
                                                    title="Dismiss"
                                                >
                                                    <X size={12} className="text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default memo(AlertCenter)
