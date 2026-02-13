import { useState, useMemo, useCallback } from 'react'
import { useAllOrders } from '../hooks/useAdminData'
import { adminOrdersApi } from '../api/adminApi'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatCurrencyFull, formatCurrency, formatDateTime, formatNumber } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { Package, TrendingUp, XCircle, Truck, CheckCircle, Clock } = ICON_MAP

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']

const INVOICE_STATUS_MAP = {
    pending: { label: 'Generating', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    generated: { label: 'Ready', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    sent: { label: 'Sent', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

function InvoiceBadge({ status }) {
    if (!status) return <span className="text-xs text-gray-400">—</span>
    const s = INVOICE_STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${s.color}`}>
            {s.label}
        </span>
    )
}

export default function OrdersPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [actionLoading, setActionLoading] = useState(null)
    const { data: orders, isLoading } = useAllOrders()

    const filtered = useMemo(() => {
        if (statusFilter === 'all') return orders || []
        return (orders || []).filter(o => o.status === statusFilter)
    }, [orders, statusFilter])

    // ── Computed stats ──────────────────────────
    const stats = useMemo(() => {
        const all = orders || []
        const delivered = all.filter(o => o.status === 'delivered')
        const cancelled = all.filter(o => o.status === 'cancelled')
        const pending = all.filter(o => o.status === 'pending')
        const inProgress = all.filter(o => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status))
        const totalRev = delivered.reduce((s, o) => s + Number(o.total || 0), 0)
        const avgOrderValue = delivered.length > 0 ? totalRev / delivered.length : 0
        return {
            total: all.length,
            delivered: delivered.length,
            cancelled: cancelled.length,
            pending: pending.length,
            inProgress: inProgress.length,
            revenue: totalRev,
            avgOrderValue,
        }
    }, [orders])

    // ── Status count for pills ──────────────────
    const statusCounts = useMemo(() => {
        const all = orders || []
        const counts = { all: all.length }
        STATUS_FILTERS.forEach(s => {
            if (s !== 'all') counts[s] = all.filter(o => o.status === s).length
        })
        return counts
    }, [orders])

    const handleDownloadInvoice = useCallback(async (orderId) => {
        setActionLoading(`dl-${orderId}`)
        try {
            const res = await adminOrdersApi.downloadInvoice(orderId)
            if (res.download_url) window.open(res.download_url, '_blank')
        } catch (err) {
            alert(err.message || 'Failed to download invoice')
        } finally { setActionLoading(null) }
    }, [])

    const handleResendInvoice = useCallback(async (orderId) => {
        setActionLoading(`resend-${orderId}`)
        try {
            await adminOrdersApi.resendInvoice(orderId)
            alert('Invoice email resent successfully!')
        } catch (err) {
            alert(err.message || 'Failed to resend invoice')
        } finally { setActionLoading(null) }
    }, [])

    const columns = useMemo(() => [
        { key: 'order_number', label: 'Order #', render: (v) => <span className="font-mono text-xs font-semibold">{v}</span> },
        { key: 'customer_name', label: 'Customer' },
        { key: 'shop_name', label: 'Shop', render: (v, row) => v || row.shop?.name || '—' },
        { key: 'total', label: 'Total', render: (v) => formatCurrencyFull(v) },
        { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        { key: 'payment_method', label: 'Payment', render: (v) => (v || 'cod').toUpperCase() },
        {
            key: 'invoice_status', label: 'Invoice',
            render: (v, row) => {
                const invStatus = row.invoice?.status || (row.status === 'delivered' ? 'pending' : null)
                return <InvoiceBadge status={invStatus} />
            }
        },
        { key: 'created_at', label: 'Date', render: (v) => formatDateTime(v) },
        {
            key: 'actions', label: '', render: (_, row) => {
                if (row.status !== 'delivered') return null
                const invStatus = row.invoice?.status
                return (
                    <div className="flex gap-1.5">
                        {(invStatus === 'generated' || invStatus === 'sent') && (
                            <button onClick={() => handleDownloadInvoice(row.id)} disabled={actionLoading === `dl-${row.id}`}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50">
                                {actionLoading === `dl-${row.id}` ? '...' : '↓ PDF'}
                            </button>
                        )}
                        {(invStatus === 'generated' || invStatus === 'sent' || invStatus === 'failed') && (
                            <button onClick={() => handleResendInvoice(row.id)} disabled={actionLoading === `resend-${row.id}`}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50">
                                {actionLoading === `resend-${row.id}` ? '...' : '✉ Resend'}
                            </button>
                        )}
                    </div>
                )
            }
        },
    ], [actionLoading, handleDownloadInvoice, handleResendInvoice])

    const STAT_CARDS = [
        { label: 'Total Orders', value: formatNumber(stats.total), icon: Package, color: 'indigo' },
        { label: 'Revenue', value: formatCurrency(stats.revenue), icon: TrendingUp, color: 'emerald' },
        { label: 'Delivered', value: formatNumber(stats.delivered), icon: CheckCircle, color: 'blue' },
        { label: 'In Progress', value: formatNumber(stats.inProgress), icon: Truck, color: 'amber' },
        { label: 'Cancelled', value: formatNumber(stats.cancelled), icon: XCircle, color: 'rose' },
        { label: 'Avg Order', value: formatCurrency(stats.avgOrderValue), icon: Clock, color: 'violet' },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <Package size={22} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {stats.total} total · {stats.delivered} delivered · {formatCurrency(stats.revenue)} revenue
                    </p>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                            <Icon size={14} className={`text-${color}-500`} />
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{isLoading ? '—' : value}</p>
                    </div>
                ))}
            </div>

            {/* Status filter pills with counts */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors flex items-center gap-1.5 ${statusFilter === s
                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                        <span className="text-[10px] opacity-60">{statusCounts[s] || 0}</span>
                    </button>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={filtered}
                loading={isLoading}
                exportable
                exportFilename="orders"
                pageSize={15}
                emptyMessage="No orders match the filter"
            />
        </div>
    )
}
