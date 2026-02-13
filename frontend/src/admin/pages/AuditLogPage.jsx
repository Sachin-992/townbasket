import { useState, useMemo, useCallback } from 'react'
import { useAuditLogs, useAuditAdmins } from '../hooks/useAdminData'
import { systemApi } from '../api/adminApi'
import DataTable from '../components/DataTable'
import { formatDateTime, formatRelative } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const {
    ScrollText, Filter, Clock, ShieldAlert, Eye, AlertTriangle,
    CheckCircle, Download, ChevronDown, Users,
} = ICON_MAP

/* ──────────── Maps & Styles ──────────── */

const ACTION_LABELS = {
    shop_approve: 'Shop Approved',
    shop_reject: 'Shop Rejected',
    shop_toggle: 'Shop Toggled',
    user_toggle: 'User Toggled',
    settings_update: 'Settings Updated',
    complaint_resolve: 'Complaint Resolved',
    order_override: 'Order Override',
    fraud_alert_dismiss: 'Fraud Alert Dismissed',
    fraud_alert_investigate: 'Fraud Alert Investigated',
    fraud_alert_confirm: 'Fraud Alert Confirmed',
    fraud_user_ban: 'User Banned (Fraud)',
    bulk_shop_approve: 'Bulk Shop Approve',
    bulk_shop_reject: 'Bulk Shop Reject',
    bulk_user_toggle: 'Bulk User Toggle',
    audit_export: 'Audit Exported',
    orders_export: 'Orders Exported',
    admin_login: 'Admin Login',
    permission_change: 'Permission Changed',
    refund_approve: 'Refund Approved',
    invoice_resend: 'Invoice Resent',
}

const ACTION_GROUPS = {
    'Order Actions': ['order_override', 'refund_approve', 'invoice_resend', 'orders_export'],
    'Shop Actions': ['shop_approve', 'shop_reject', 'shop_toggle', 'bulk_shop_approve', 'bulk_shop_reject'],
    'User Actions': ['user_toggle', 'bulk_user_toggle', 'admin_login', 'permission_change'],
    'Fraud Actions': ['fraud_alert_dismiss', 'fraud_alert_investigate', 'fraud_alert_confirm', 'fraud_user_ban'],
    'System': ['settings_update', 'complaint_resolve', 'audit_export'],
}

const RISK_STYLES = {
    low: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    critical: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
}

const RISK_DOT_COLORS = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-orange-500',
    critical: 'bg-rose-500',
}

const ACTION_ICONS = {
    shop_approve: CheckCircle,
    shop_reject: AlertTriangle,
    fraud_alert_dismiss: ShieldAlert,
    fraud_alert_investigate: Eye,
    fraud_user_ban: ShieldAlert,
    order_override: Clock,
    invoice_resend: Download,
    admin_login: Users,
}

/* ──────────── Component ──────────── */

export default function AuditLogPage() {
    const [page, setPage] = useState(1)
    const [riskFilter, setRiskFilter] = useState('')
    const [actionFilter, setActionFilter] = useState('')
    const [adminFilter, setAdminFilter] = useState('')
    const [viewMode, setViewMode] = useState('timeline')
    const [showActionDropdown, setShowActionDropdown] = useState(false)
    const [exporting, setExporting] = useState(false)

    const filters = useMemo(() => {
        const f = {}
        if (riskFilter) f.risk_level = riskFilter
        if (actionFilter) f.action = actionFilter
        if (adminFilter) f.admin_uid = adminFilter
        return f
    }, [riskFilter, actionFilter, adminFilter])

    const { data, isLoading } = useAuditLogs(page, filters)
    const { data: adminsData } = useAuditAdmins()
    const logs = data?.results || data || []
    const totalPages = data?.pages || 1
    const totalRecords = data?.total || 0
    const adminList = adminsData?.admins || []

    // Reset page when filters change
    const updateFilter = useCallback((setter) => (val) => {
        setter(val)
        setPage(1)
    }, [])

    const handleExport = useCallback(async () => {
        setExporting(true)
        try {
            await systemApi.exportAuditCSV(filters)
        } catch {
            // silent fail — the export_audit_csv logs the attempt anyway
        }
        setExporting(false)
    }, [filters])

    const columns = useMemo(() => [
        { key: 'created_at', label: 'Time', render: (v) => formatDateTime(v) },
        { key: 'admin_name', label: 'Admin' },
        {
            key: 'action', label: 'Action', render: (v) => (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium">
                    {ACTION_LABELS[v] || v}
                </span>
            )
        },
        {
            key: 'risk_level', label: 'Risk', render: (v) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${RISK_STYLES[v] || RISK_STYLES.low}`}>
                    {v || 'low'}
                </span>
            )
        },
        { key: 'target_type', label: 'Target', render: (v) => <span className="capitalize">{v}</span> },
        { key: 'target_id', label: 'ID' },
        { key: 'ip_address', label: 'IP', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
                        <ScrollText size={22} className="text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {totalRecords.toLocaleString()} records
                            {Object.keys(filters).length > 0 && ' (filtered)'}
                        </p>
                    </div>
                </div>

                {/* Export CSV */}
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <Download size={14} />
                    {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-col lg:flex-row gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shrink-0">
                    {['timeline', 'table'].map(v => (
                        <button
                            key={v}
                            onClick={() => setViewMode(v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${viewMode === v
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* Risk filter */}
                <div className="flex items-center gap-1 flex-wrap">
                    <Filter size={14} className="text-gray-400 shrink-0" />
                    {['', 'low', 'medium', 'high', 'critical'].map(r => (
                        <button
                            key={r}
                            onClick={() => updateFilter(setRiskFilter)(r)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${riskFilter === r
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            {r || 'All Risk'}
                        </button>
                    ))}
                </div>

                {/* Action type dropdown */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setShowActionDropdown(v => !v)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${actionFilter
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        {actionFilter ? (ACTION_LABELS[actionFilter] || actionFilter) : 'All Actions'}
                        <ChevronDown size={12} />
                    </button>
                    {showActionDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl z-50 max-h-80 overflow-y-auto">
                            <button
                                onClick={() => { updateFilter(setActionFilter)(''); setShowActionDropdown(false) }}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!actionFilter ? 'font-bold text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                All Actions
                            </button>
                            {Object.entries(ACTION_GROUPS).map(([group, actions]) => (
                                <div key={group}>
                                    <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold bg-gray-50 dark:bg-gray-900/50">
                                        {group}
                                    </div>
                                    {actions.map(a => (
                                        <button
                                            key={a}
                                            onClick={() => { updateFilter(setActionFilter)(a); setShowActionDropdown(false) }}
                                            className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${actionFilter === a ? 'font-bold text-indigo-600' : 'text-gray-600 dark:text-gray-400'}`}
                                        >
                                            {ACTION_LABELS[a] || a}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Admin user dropdown */}
                <div className="shrink-0">
                    <select
                        value={adminFilter}
                        onChange={e => updateFilter(setAdminFilter)(e.target.value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-[140px]"
                    >
                        <option value="">All Admins</option>
                        {adminList.map(a => (
                            <option key={a.uid} value={a.uid}>{a.name}</option>
                        ))}
                    </select>
                </div>

                {/* Active filter chips */}
                {Object.keys(filters).length > 0 && (
                    <button
                        onClick={() => { setRiskFilter(''); setActionFilter(''); setAdminFilter(''); setPage(1) }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* ── Timeline View ── */}
            {viewMode === 'timeline' ? (
                <div className="relative">
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="animate-pulse flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700 mt-1.5 shrink-0" />
                                    <div className="flex-1 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16">
                            <CheckCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-gray-400 font-medium">No audit records found</p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {logs.map((log, idx) => {
                                const ActionIcon = ACTION_ICONS[log.action] || Clock
                                const risk = log.risk_level || 'low'
                                return (
                                    <div key={log.id || idx} className="flex gap-4 group">
                                        {/* Timeline line + dot */}
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className={`w-3 h-3 rounded-full ${RISK_DOT_COLORS[risk] || RISK_DOT_COLORS.low} ring-4 ring-white dark:ring-gray-950 z-10`} />
                                            {idx < logs.length - 1 && (
                                                <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 min-h-[2rem]" />
                                            )}
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 pb-6 min-w-0">
                                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 group-hover:shadow-md transition-shadow">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <ActionIcon size={14} className="text-gray-400 shrink-0" />
                                                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {ACTION_LABELS[log.action] || log.action}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${RISK_STYLES[risk]}`}>
                                                            {risk}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                                                        <Clock size={11} />
                                                        {formatRelative(log.created_at)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>Admin: <span className="font-medium text-gray-700 dark:text-gray-300">{log.admin_name || 'System'}</span></span>
                                                    <span>Target: <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{log.target_type}</span> #{log.target_id}</span>
                                                    {log.ip_address && <span>IP: <span className="font-mono">{log.ip_address}</span></span>}
                                                    {log.session_id && <span>Session: <span className="font-mono">{log.session_id.slice(0, 8)}…</span></span>}
                                                </div>
                                                {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                                                    <pre className="mt-2 text-[10px] text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 overflow-x-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* Table View */
                <DataTable
                    columns={columns}
                    data={logs}
                    loading={isLoading}
                    exportable
                    exportFilename="audit-log"
                    pageSize={20}
                    emptyMessage="No audit records yet"
                />
            )}

            {/* Pagination */}
            {logs.length > 0 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                    >
                        ← Previous
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-900 dark:text-white">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    )
}
