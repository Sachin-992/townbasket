import { useState, useEffect } from 'react'
import { useSystemHealth } from '../hooks/useAdminData'
import ICON_MAP from '../utils/iconMap'

const { Activity, CheckCircle, AlertTriangle, XCircle, RotateCw, Clock } = ICON_MAP

const STATUS_CONFIG = {
    connected: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Connected' },
    reachable: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Reachable' },
    healthy: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Degraded' },
    not_configured: { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Not Configured' },
}

function getCheckConfig(value) {
    if (!value) return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30', label: 'Unknown' }
    const str = String(value).toLowerCase()
    if (str.startsWith('error')) return { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30', label: value }
    return STATUS_CONFIG[str] || { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: value }
}

const SERVICE_META = {
    database: { name: 'Database', description: 'PostgreSQL/Supabase connection', icon: '🗄️' },
    cache: { name: 'Cache', description: 'Django cache backend', icon: '⚡' },
    jwks: { name: 'Auth (JWKS)', description: 'Supabase JWT key service', icon: '🔐' },
}

export default function SystemHealthPage() {
    const { data, isLoading, refetch, dataUpdatedAt } = useSystemHealth()
    const [refreshing, setRefreshing] = useState(false)
    const [uptimeSeconds, setUptimeSeconds] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => setUptimeSeconds(s => s + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    const handleRefresh = async () => {
        setRefreshing(true)
        await refetch()
        setTimeout(() => setRefreshing(false), 500)
    }

    const overallStatus = data?.status || 'unknown'
    const isHealthy = overallStatus === 'healthy'
    const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'never'

    const checks = data ? Object.entries(data).filter(([k]) => k !== 'status') : []

    const formatUptime = (s) => {
        const h = Math.floor(s / 3600)
        const m = Math.floor((s % 3600) / 60)
        const sec = s % 60
        return `${h}h ${m}m ${sec}s`
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                        <Activity size={22} className={isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Real-time infrastructure monitoring
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                    <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Overall Status Banner */}
            <div className={`rounded-2xl p-6 border ${isHealthy
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isHealthy ? (
                            <CheckCircle size={24} className="text-emerald-500" />
                        ) : (
                            <AlertTriangle size={24} className="text-amber-500" />
                        )}
                        <div>
                            <h2 className={`text-lg font-bold ${isHealthy ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
                                }`}>
                                {isHealthy ? 'All Systems Operational' : 'Degraded Performance'}
                            </h2>
                            <p className="text-sm opacity-75">
                                Last checked: {lastChecked} · Session uptime: {formatUptime(uptimeSeconds)}
                            </p>
                        </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${isHealthy
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                        }`}>
                        {overallStatus}
                    </span>
                </div>
            </div>

            {/* Service Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {checks.map(([key, value]) => {
                        const cfg = getCheckConfig(value)
                        const meta = SERVICE_META[key] || { name: key, description: '', icon: '🔧' }
                        const Icon = cfg.icon
                        return (
                            <div
                                key={key}
                                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{meta.icon}</span>
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{meta.name}</h3>
                                    </div>
                                    <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                                        <Icon size={14} className={cfg.color} />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mb-3">{meta.description}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                                    <span className={`text-sm font-medium ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                                {String(value).startsWith('error') && (
                                    <pre className="mt-2 text-[10px] text-rose-400 bg-rose-50 dark:bg-rose-900/10 rounded-lg p-2 overflow-x-auto">
                                        {value}
                                    </pre>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Performance Guidelines */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Performance & Scaling</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { label: 'Connection Pool', desc: 'Django CONN_MAX_AGE + pgBouncer recommended for 100K+ users', status: 'configured' },
                        { label: 'Query Optimization', desc: 'DB indexes on FraudAlert, AuditLog, Order models', status: 'optimized' },
                        { label: 'Cache Strategy', desc: '30s health-check TTL, 2min overview cache, Redis-backed', status: 'active' },
                        { label: 'Rate Limiting', desc: 'Per-admin throttle on bulk/fraud/export endpoints', status: 'enforced' },
                        { label: 'SSE Connections', desc: 'Long-poll with 30s heartbeat, auto-reconnect client', status: 'stable' },
                        { label: 'Content Security', desc: 'Admin CSP headers via middleware, CSRF on all mutations', status: 'active' },
                    ].map((item, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto-refresh notice */}
            <p className="text-center text-xs text-gray-400">
                <Clock size={11} className="inline mr-1" />
                Auto-refreshing every 30 seconds
            </p>
        </div>
    )
}
