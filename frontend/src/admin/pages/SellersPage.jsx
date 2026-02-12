import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAllShops, usePendingShops } from '../hooks/useAdminData'
import { adminShopsApi } from '../api/adminApi'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { formatDateTime } from '../utils/formatters'
import { CheckCircle, XCircle, Power } from 'lucide-react'

export default function SellersPage() {
    const [tab, setTab] = useState('all')
    const { data: allShops, isLoading: loadingAll } = useAllShops()
    const { data: pendingShops, isLoading: loadingPending } = usePendingShops()
    const qc = useQueryClient()
    const confirm = useConfirm()
    const toast = useToast()

    const handleApprove = async (shop) => {
        const ok = await confirm('Approve Shop', `Approve "${shop.name}"?`, { confirmText: 'Approve', variant: 'primary' })
        if (!ok) return
        try {
            await adminShopsApi.approve(shop.id)
            toast.success(`${shop.name} approved`)
            qc.invalidateQueries({ queryKey: ['admin', 'shops'] })
        } catch (e) { toast.error(e.message) }
    }

    const handleReject = async (shop) => {
        const ok = await confirm('Reject Shop', `Reject "${shop.name}"? This cannot be undone.`, { variant: 'danger' })
        if (!ok) return
        try {
            await adminShopsApi.reject(shop.id)
            toast.success(`${shop.name} rejected`)
            qc.invalidateQueries({ queryKey: ['admin', 'shops'] })
        } catch (e) { toast.error(e.message) }
    }

    const handleToggle = async (shop) => {
        const ok = await confirm('Toggle Status', `${shop.is_active ? 'Deactivate' : 'Activate'} "${shop.name}"?`)
        if (!ok) return
        try {
            await adminShopsApi.toggleActive(shop.id)
            toast.success(`${shop.name} ${shop.is_active ? 'deactivated' : 'activated'}`)
            qc.invalidateQueries({ queryKey: ['admin', 'shops'] })
        } catch (e) { toast.error(e.message) }
    }

    const allColumns = useMemo(() => [
        { key: 'name', label: 'Shop Name' },
        { key: 'owner_name', label: 'Owner' },
        { key: 'town', label: 'Town' },
        { key: 'category_name', label: 'Category', render: (v) => v || '—', sortable: false },
        { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
        { key: 'is_active', label: 'Active', render: (v) => v ? '✓' : '✗', sortable: false },
        { key: 'created_at', label: 'Created', render: (v) => formatDateTime(v) },
        {
            key: '_actions', label: 'Actions', sortable: false, render: (_, row) => (
                <button onClick={() => handleToggle(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle active">
                    <Power size={14} className={row.is_active ? 'text-emerald-500' : 'text-gray-400'} />
                </button>
            )
        }
    ], [])

    const pendingColumns = useMemo(() => [
        { key: 'name', label: 'Shop Name' },
        { key: 'owner_name', label: 'Owner' },
        { key: 'owner_phone', label: 'Phone' },
        { key: 'town', label: 'Town' },
        { key: 'address', label: 'Address', render: (v) => <span className="max-w-[200px] truncate block">{v}</span> },
        { key: 'created_at', label: 'Applied', render: (v) => formatDateTime(v) },
        {
            key: '_actions', label: 'Actions', sortable: false, render: (_, row) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => handleApprove(row)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" title="Approve">
                        <CheckCircle size={16} className="text-emerald-600" />
                    </button>
                    <button onClick={() => handleReject(row)} className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Reject">
                        <XCircle size={16} className="text-rose-500" />
                    </button>
                </div>
            )
        }
    ], [])

    const tabs = [
        { key: 'all', label: 'All Shops', count: allShops?.length },
        { key: 'pending', label: 'Pending', count: pendingShops?.length },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sellers</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage shop registrations and status</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.key
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        {t.label}
                        {t.count != null && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-600 rounded-full">{t.count}</span>}
                    </button>
                ))}
            </div>

            {tab === 'all' ? (
                <DataTable
                    columns={allColumns}
                    data={(allShops || []).map(s => ({ ...s, category_name: s.category?.name || s.category_name }))}
                    loading={loadingAll}
                    exportable
                    exportFilename="sellers"
                    emptyMessage="No shops registered yet"
                />
            ) : (
                <DataTable
                    columns={pendingColumns}
                    data={pendingShops || []}
                    loading={loadingPending}
                    emptyMessage="No pending shop registrations"
                />
            )}
        </div>
    )
}
