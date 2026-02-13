import { useState, useMemo, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import ICON_MAP from '../utils/iconMap'

const {
    Bell, ShieldAlert, AlertTriangle, MessageSquareWarning,
    Check, Trash2, Filter, Clock, CheckCircle, Eye,
} = ICON_MAP

/* ──────────── Maps & Styles ──────────── */

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        border: 'border-l-rose-500',
        badge: 'bg-rose-500 text-white',
        dot: 'bg-rose-500',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-l-amber-500',
        badge: 'bg-amber-500 text-white',
        dot: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-l-blue-500',
        badge: 'bg-blue-500 text-white',
        dot: 'bg-blue-500',
    },
}

const TYPE_ICONS = {
    fraud: ShieldAlert,
    anomaly: AlertTriangle,
    complaint: MessageSquareWarning,
}

const TYPE_LABELS = {
    fraud: 'Fraud',
    anomaly: 'Anomaly',
    complaint: 'Complaint',
}

function timeAgo(ts) {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

/* ──────────── Component ──────────── */

export default function NotificationsPage() {
    const { sse } = useOutletContext()
    const alerts = sse?.alerts || []
    const [typeFilter, setTypeFilter] = useState('')
    const [severityFilter, setSeverityFilter] = useState('')
    const [showRead, setShowRead] = useState(true)

    const filtered = useMemo(() => {
        let list = alerts
        if (typeFilter) list = list.filter(a => a.type === typeFilter)
        if (severityFilter) list = list.filter(a => a.severity === severityFilter)
        if (!showRead) list = list.filter(a => !a.read)
        return list
    }, [alerts, typeFilter, severityFilter, showRead])

    const unreadCount = alerts.filter(a => !a.read).length
    const stats = useMemo(() => ({
        total: alerts.length,
        unread: unreadCount,
        critical: alerts.filter(a => a.severity === 'critical').length,
        fraud: alerts.filter(a => a.type === 'fraud').length,
    }), [alerts, unreadCount])

    const handleMarkRead = useCallback((id) => {
        sse?.markAlertRead?.(id)
    }, [sse])

    const handleDismiss = useCallback((id) => {
        sse?.dismissAlert?.(id)
    }, [sse])

    const handleClearAll = useCallback(() => {
        sse?.clearAllAlerts?.()
    }, [sse])

    const handleMarkAllRead = useCallback(() => {
        alerts.forEach(a => {
            if (!a.read) sse?.markAlertRead?.(a.id)
        })
    }, [alerts, sse])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <Bell size={22} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Center</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Real-time alerts from SSE stream
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMarkAllRead}
                        disabled={unreadCount === 0}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
                    >
                        <Check size={13} />
                        Mark All Read
                    </button>
                    <button
                        onClick={handleClearAll}
                        disabled={alerts.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-30 transition-colors"
                    >
                        <Trash2 size={13} />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, icon: Bell, color: 'text-gray-600 dark:text-gray-400' },
                    { label: 'Unread', value: stats.unread, icon: Eye, color: 'text-indigo-600 dark:text-indigo-400' },
                    { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400' },
                    { label: 'Fraud', value: stats.fraud, icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400' },
                ].map(s => (
                    <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
                        <s.icon size={18} className={s.color} />
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                <Filter size={14} className="text-gray-400 shrink-0" />

                {/* Type filter */}
                <div className="flex items-center gap-1">
                    {['', 'fraud', 'anomaly', 'complaint'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${typeFilter === t
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            {t || 'All Types'}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

                {/* Severity filter */}
                <div className="flex items-center gap-1">
                    {['', 'critical', 'warning', 'info'].map(s => (
                        <button
                            key={s}
                            onClick={() => setSeverityFilter(s)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${severityFilter === s
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            {s || 'All Levels'}
                        </button>
                    ))}
                </div>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

                {/* Show read toggle */}
                <button
                    onClick={() => setShowRead(v => !v)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${!showRead
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        }`}
                >
                    {showRead ? 'Showing All' : 'Unread Only'}
                </button>

                {(typeFilter || severityFilter || !showRead) && (
                    <button
                        onClick={() => { setTypeFilter(''); setSeverityFilter(''); setShowRead(true) }}
                        className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Alert list */}
            {filtered.length === 0 ? (
                <div className="text-center py-20">
                    <CheckCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 font-medium">
                        {alerts.length === 0 ? 'No alerts yet — all clear!' : 'No alerts match your filters'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(alert => {
                        const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info
                        const TypeIcon = TYPE_ICONS[alert.type] || Bell
                        return (
                            <div
                                key={alert.id}
                                className={`${styles.bg} border-l-4 ${styles.border} rounded-xl p-4 flex items-start gap-3 group transition-all ${alert.read ? 'opacity-60' : ''}`}
                            >
                                <TypeIcon size={18} className="shrink-0 mt-0.5 text-gray-600 dark:text-gray-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                            {alert.title}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${styles.badge}`}>
                                            {alert.severity}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                            {TYPE_LABELS[alert.type] || alert.type}
                                        </span>
                                        {!alert.read && (
                                            <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                                        )}
                                    </div>
                                    {alert.message && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {alert.message}
                                        </p>
                                    )}
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock size={10} />
                                        {timeAgo(alert.timestamp)}
                                    </span>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {!alert.read && (
                                        <button
                                            onClick={() => handleMarkRead(alert.id)}
                                            className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDismiss(alert.id)}
                                        className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-400 hover:text-rose-500 transition-colors"
                                        title="Dismiss"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
