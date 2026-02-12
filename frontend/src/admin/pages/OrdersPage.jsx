import { useState, useMemo } from 'react'
import { useAllOrders } from '../hooks/useAdminData'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatCurrencyFull, formatDateTime } from '../utils/formatters'

const STATUS_FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']

export default function OrdersPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const { data: orders, isLoading } = useAllOrders()

    const filtered = useMemo(() => {
        if (statusFilter === 'all') return orders || []
        return (orders || []).filter(o => o.status === statusFilter)
    }, [orders, statusFilter])

    const columns = useMemo(() => [
        { key: 'order_number', label: 'Order #', render: (v) => <span className="font-mono text-xs font-semibold">{v}</span> },
        { key: 'customer_name', label: 'Customer' },
        { key: 'shop_name', label: 'Shop', render: (v, row) => v || row.shop?.name || '—' },
        { key: 'total', label: 'Total', render: (v) => formatCurrencyFull(v) },
        { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        { key: 'payment_method', label: 'Payment', render: (v) => (v || 'cod').toUpperCase() },
        { key: 'delivery_town', label: 'Town' },
        { key: 'created_at', label: 'Date', render: (v) => formatDateTime(v) },
    ], [])

    // Stats
    const stats = useMemo(() => {
        const all = orders || []
        const delivered = all.filter(o => o.status === 'delivered')
        const cancelled = all.filter(o => o.status === 'cancelled')
        const totalRev = delivered.reduce((s, o) => s + Number(o.total || 0), 0)
        return {
            total: all.length,
            delivered: delivered.length,
            cancelled: cancelled.length,
            revenue: totalRev,
        }
    }, [orders])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {stats.total} total · {stats.delivered} delivered · {formatCurrencyFull(stats.revenue)} revenue
                </p>
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_FILTERS.map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${statusFilter === s
                                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
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
