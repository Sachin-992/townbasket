import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useComplaints } from '../hooks/useAdminData'
import { adminComplaintsApi } from '../api/adminApi'
import { useToast } from '../../context/ToastContext'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { CheckCircle, MessageSquareWarning, Clock, AlertTriangle } = ICON_MAP

const ISSUE_COLORS = {
    order_issue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delivery_issue: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    product_quality: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    payment_issue: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function ComplaintsPage() {
    const [statusFilter, setStatusFilter] = useState('pending')
    const { data: pendingData, isLoading: loadingPending } = useComplaints('pending')
    const { data: resolvedData, isLoading: loadingResolved } = useComplaints('resolved')
    const qc = useQueryClient()
    const toast = useToast()

    const complaints = statusFilter === 'pending' ? pendingData : resolvedData
    const isLoading = statusFilter === 'pending' ? loadingPending : loadingResolved

    // ── Computed stats ──────────────────────────
    const stats = useMemo(() => {
        const pending = (pendingData || []).length
        const resolved = (resolvedData || []).length
        const total = pending + resolved
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
        return { pending, resolved, total, resolutionRate }
    }, [pendingData, resolvedData])

    const handleResolve = async (complaint) => {
        try {
            await adminComplaintsApi.resolve(complaint.id, { admin_note: 'Resolved by admin' })
            toast.success('Complaint resolved')
            qc.invalidateQueries({ queryKey: ['admin', 'complaints'] })
        } catch (e) { toast.error(e.message) }
    }

    const columns = useMemo(() => [
        { key: 'user_name', label: 'User', render: (v) => v || '—' },
        { key: 'user_phone', label: 'Phone' },
        {
            key: 'issue_type', label: 'Type', render: (v) => {
                const color = ISSUE_COLORS[v] || ISSUE_COLORS.other
                return (
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${color}`}>
                        {(v || 'other').replace(/_/g, ' ')}
                    </span>
                )
            }
        },
        { key: 'description', label: 'Description', render: (v) => <span className="max-w-[250px] truncate block text-xs">{v}</span>, sortable: false },
        { key: 'order_id', label: 'Order', render: (v) => v || '—' },
        { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        { key: 'created_at', label: 'Filed', render: (v) => formatDateTime(v) },
        {
            key: '_actions', label: '', sortable: false, render: (_, row) => row.status === 'pending' ? (
                <button onClick={() => handleResolve(row)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Resolve">
                    <CheckCircle size={16} className="text-emerald-600" />
                </button>
            ) : null
        },
    ], [])

    const STAT_CARDS = [
        { label: 'Total', value: stats.total, icon: MessageSquareWarning, color: 'indigo' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: 'amber' },
        { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'emerald' },
        { label: 'Resolution Rate', value: `${stats.resolutionRate}%`, icon: AlertTriangle, color: 'violet' },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <MessageSquareWarning size={22} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review and resolve customer complaints</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {loadingPending && loadingResolved ? '—' : value}
                            </p>
                        </div>
                        <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/30`}>
                            <Icon size={18} className={`text-${color}-600 dark:text-${color}-400`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
                {['pending', 'resolved'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors flex items-center gap-1.5 ${statusFilter === s
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        {s}
                        <span className="text-[10px] opacity-60">
                            {s === 'pending' ? stats.pending : stats.resolved}
                        </span>
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={complaints || []}
                loading={isLoading}
                exportable
                exportFilename="complaints"
                emptyMessage={`No ${statusFilter} complaints`}
            />
        </div>
    )
}
