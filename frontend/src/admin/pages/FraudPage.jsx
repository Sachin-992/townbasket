import { useState, useMemo } from 'react'
import ICON_MAP from '../utils/iconMap'
import { useFraudAlerts, useHighRiskUsers, useDismissAlert, useInvestigateAlert, useConfirmAlert, useFraudScan, useFraudSummary } from '../hooks/useAdminData'
import { useAdminSSE } from '../hooks/useAdminSSE'
import { formatRelative } from '../utils/formatters'

const { ShieldAlert, AlertTriangle, Eye, XCircle, CheckCircle, RotateCw, Users, Clock, Zap, Filter, ShieldCheck, Activity, TrendingUp, ChevronDown, ChevronUp } = ICON_MAP

// ── Style Maps ──────────────────────────────────
const SEVERITY_STYLES = {
    info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    critical: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
}

const SEVERITY_BADGES = {
    info: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    critical: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
}

const STATUS_BADGES = {
    active: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    investigating: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    dismissed: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
    confirmed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

const RISK_COLORS = {
    critical: 'text-rose-600 dark:text-rose-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-amber-600 dark:text-amber-400',
}

const ALERT_TYPE_LABELS = {
    order_spike: 'Order Spike',
    high_cancel_rate: 'Cancel Rate',
    rapid_orders: 'Rapid Orders',
    high_complaint_ratio: 'Complaints',
    repeated_refunds: 'Refunds',
    rapid_account_creation: 'Account Surge',
    high_refund_rate: 'Refund Rate',
    suspicious_pattern: 'Suspicious',
}

// ── Risk Score Bar ──────────────────────────────
function RiskScoreBar({ score }) {
    const pct = Math.min(score, 100)
    const color =
        pct >= 61 ? 'bg-rose-500' :
            pct >= 31 ? 'bg-amber-500' :
                'bg-emerald-500'
    const textColor =
        pct >= 61 ? 'text-rose-600 dark:text-rose-400' :
            pct >= 31 ? 'text-amber-600 dark:text-amber-400' :
                'text-emerald-600 dark:text-emerald-400'

    return (
        <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={`text-xs font-bold tabular-nums ${textColor}`}>{pct}</span>
        </div>
    )
}

// ── Summary Card ────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, accent = 'indigo' }) {
    const accents = {
        indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
        amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    }
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${accents[accent]}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
            </div>
        </div>
    )
}

// ── Main Component ──────────────────────────────
export default function FraudPage() {
    const [statusFilter, setStatusFilter] = useState('active')
    const [typeFilter, setTypeFilter] = useState('all')
    const [tab, setTab] = useState('alerts')
    const [expandedId, setExpandedId] = useState(null)
    const [sortBy, setSortBy] = useState('created_at')
    const [sortDir, setSortDir] = useState('desc')

    // Data hooks
    const { data: alertsData, isLoading: loadingAlerts } = useFraudAlerts({ status: statusFilter, ...(typeFilter !== 'all' ? { type: typeFilter } : {}) })
    const { data: riskyUsers, isLoading: loadingUsers } = useHighRiskUsers()
    const { data: summary } = useFraudSummary()
    const { fraudAlerts: sseAlerts } = useAdminSSE()
    const dismissMutation = useDismissAlert()
    const investigateMutation = useInvestigateAlert()
    const confirmMutation = useConfirmAlert()
    const scanMutation = useFraudScan()

    const alerts = alertsData?.results || []
    const activeCount = alertsData?.active_count || 0
    const criticalCount = alertsData?.critical_count || 0
    const highRiskUsers = riskyUsers?.users || []

    // Client-side sort
    const sortedAlerts = useMemo(() => {
        const sorted = [...alerts]
        sorted.sort((a, b) => {
            let va, vb
            if (sortBy === 'risk_score') {
                va = a.risk_score || 0
                vb = b.risk_score || 0
            } else {
                va = new Date(a.created_at).getTime()
                vb = new Date(b.created_at).getTime()
            }
            return sortDir === 'desc' ? vb - va : va - vb
        })
        return sorted
    }, [alerts, sortBy, sortDir])

    const toggleSort = (col) => {
        if (sortBy === col) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc')
        } else {
            setSortBy(col)
            setSortDir('desc')
        }
    }

    const SortIcon = ({ col }) => {
        if (sortBy !== col) return null
        return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
                        <ShieldAlert size={22} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fraud Intelligence</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Real-time threat detection & risk analysis
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                    <RotateCw size={16} className={scanMutation.isPending ? 'animate-spin' : ''} />
                    {scanMutation.isPending ? 'Scanning...' : 'Run Scan'}
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={ShieldAlert}
                    label="Active Alerts"
                    value={summary?.total_active ?? activeCount}
                    sub={`${Object.keys(summary?.by_type || {}).length} detection types`}
                    accent="rose"
                />
                <SummaryCard
                    icon={AlertTriangle}
                    label="Critical"
                    value={summary?.critical_count ?? criticalCount}
                    sub="Requires immediate action"
                    accent="amber"
                />
                <SummaryCard
                    icon={Activity}
                    label="Avg Risk Score"
                    value={summary?.avg_risk_score ?? 0}
                    sub="Across active alerts"
                    accent="indigo"
                />
                <SummaryCard
                    icon={ShieldCheck}
                    label="Last Scan"
                    value={scanMutation.isSuccess ? `${scanMutation.data?.new_alerts || 0} found` : '—'}
                    sub={scanMutation.isSuccess ? 'Scan complete' : 'Run a scan to check'}
                    accent="emerald"
                />
            </div>

            {/* SSE Live Alerts Banner */}
            {sseAlerts.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-rose-500" />
                        <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                            Live Alert{sseAlerts.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {sseAlerts.slice(0, 3).map(a => (
                            <div key={a.id} className="flex items-center justify-between text-sm">
                                <span className="text-rose-700 dark:text-rose-300">{a.title}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BADGES[a.severity] || ''}`}>
                                    {a.severity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                {[
                    { key: 'alerts', label: 'Alerts', icon: AlertTriangle, count: activeCount },
                    { key: 'users', label: 'High-Risk Users', icon: Users, count: highRiskUsers.length },
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                    >
                        <t.icon size={15} />
                        {t.label}
                        {t.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300">
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Alerts Tab ─────────────────────────── */}
            {tab === 'alerts' && (
                <div className="space-y-4">
                    {/* Filters row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status filter */}
                        <div className="flex items-center gap-1.5">
                            <Filter size={14} className="text-gray-400" />
                            {['active', 'investigating', 'confirmed', 'dismissed', 'all'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                        {/* Type filter */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {['all', 'order_spike', 'high_cancel_rate', 'rapid_orders', 'high_complaint_ratio', 'repeated_refunds', 'rapid_account_creation'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${typeFilter === t
                                        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                        }`}
                                >
                                    {t === 'all' ? 'All Types' : ALERT_TYPE_LABELS[t] || t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Alert Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Severity</th>
                                        <th
                                            className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none w-28"
                                            onClick={() => toggleSort('risk_score')}
                                        >
                                            <span className="flex items-center gap-1">Risk <SortIcon col="risk_score" /></span>
                                        </th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Type</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Target</th>
                                        <th
                                            className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none w-28"
                                            onClick={() => toggleSort('created_at')}
                                        >
                                            <span className="flex items-center gap-1">Time <SortIcon col="created_at" /></span>
                                        </th>
                                        <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-36">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingAlerts ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={7} className="px-5 py-4"><div className="animate-pulse h-6 bg-gray-100 dark:bg-gray-700 rounded" /></td>
                                            </tr>
                                        ))
                                    ) : sortedAlerts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-16 text-center">
                                                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-3" />
                                                <p className="text-gray-500 dark:text-gray-400 font-medium">No fraud alerts found</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">All clear — run a scan to check again</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedAlerts.map(alert => (
                                            <>
                                                <tr
                                                    key={alert.id}
                                                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                                                >
                                                    {/* Severity */}
                                                    <td className="px-5 py-3.5">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${SEVERITY_BADGES[alert.severity] || ''}`}>
                                                            {alert.severity}
                                                        </span>
                                                    </td>

                                                    {/* Risk Score */}
                                                    <td className="px-4 py-3.5">
                                                        <RiskScoreBar score={alert.risk_score || 0} />
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                            {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                                                        </span>
                                                    </td>

                                                    {/* Title */}
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[280px]">{alert.title}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${STATUS_BADGES[alert.status] || ''}`}>
                                                                {alert.status}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Target */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {alert.target_name || alert.target_type}
                                                        </span>
                                                    </td>

                                                    {/* Timestamp */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatRelative(alert.created_at)}
                                                        </span>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {alert.status === 'active' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => investigateMutation.mutate({ id: alert.id, note: '' })}
                                                                        disabled={investigateMutation.isPending}
                                                                        className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 transition-colors"
                                                                        title="Investigate"
                                                                    >
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => confirmMutation.mutate({ id: alert.id, note: '' })}
                                                                        disabled={confirmMutation.isPending}
                                                                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                                                                        title="Confirm Fraud"
                                                                    >
                                                                        <ShieldCheck size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => dismissMutation.mutate({ id: alert.id, note: '' })}
                                                                        disabled={dismissMutation.isPending}
                                                                        className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                                                        title="Dismiss"
                                                                    >
                                                                        <XCircle size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {alert.status === 'investigating' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => confirmMutation.mutate({ id: alert.id, note: '' })}
                                                                        disabled={confirmMutation.isPending}
                                                                        className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                                                                        title="Confirm Fraud"
                                                                    >
                                                                        <ShieldCheck size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => dismissMutation.mutate({ id: alert.id, note: '' })}
                                                                        disabled={dismissMutation.isPending}
                                                                        className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                                                                        title="Dismiss"
                                                                    >
                                                                        <XCircle size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded detail row */}
                                                {expandedId === alert.id && (
                                                    <tr key={`${alert.id}-detail`} className="bg-gray-50/50 dark:bg-gray-700/20">
                                                        <td colSpan={7} className="px-5 py-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                                <div>
                                                                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</p>
                                                                    <p className="text-gray-500 dark:text-gray-400">{alert.description}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Metadata</p>
                                                                    <div className="space-y-1">
                                                                        {Object.entries(alert.metadata || {}).filter(([k]) => k !== 'risk_score').map(([k, v]) => (
                                                                            <div key={k} className="flex justify-between text-gray-500 dark:text-gray-400">
                                                                                <span className="font-medium">{k.replace(/_/g, ' ')}</span>
                                                                                <span>{typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : String(v)}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {alert.resolution_note && (
                                                                    <div className="md:col-span-2">
                                                                        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Resolution Note</p>
                                                                        <p className="text-gray-500 dark:text-gray-400">{alert.resolution_note}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── High-Risk Users Tab ────────────────── */}
            {tab === 'users' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orders</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancelled</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cancel Rate</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingUsers ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={6} className="px-5 py-4"><div className="animate-pulse h-6 bg-gray-100 dark:bg-gray-700 rounded" /></td>
                                        </tr>
                                    ))
                                ) : highRiskUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                                            <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                                            No high-risk users detected
                                        </td>
                                    </tr>
                                ) : (
                                    highRiskUsers.map(user => (
                                        <tr key={user.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-gray-400">{user.phone}</p>
                                            </td>
                                            <td className="text-center px-4 py-3.5 font-medium">{user.recent_orders}</td>
                                            <td className="text-center px-4 py-3.5 text-rose-600 dark:text-rose-400 font-medium">{user.cancelled}</td>
                                            <td className="text-center px-4 py-3.5">
                                                <span className="font-bold">{user.cancel_rate}%</span>
                                            </td>
                                            <td className="text-center px-4 py-3.5">
                                                <span className={`text-xs font-bold uppercase ${RISK_COLORS[user.risk_level] || ''}`}>
                                                    {user.risk_level}
                                                </span>
                                            </td>
                                            <td className="text-center px-4 py-3.5">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${user.is_active
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                    }`}>
                                                    {user.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Scan result toast */}
            {scanMutation.isSuccess && (
                <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in z-50">
                    ✓ Scan complete — {scanMutation.data?.new_alerts || 0} new alert{(scanMutation.data?.new_alerts || 0) !== 1 ? 's' : ''} found
                </div>
            )}
        </div>
    )
}
