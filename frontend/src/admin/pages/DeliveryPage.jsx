import { useMemo } from 'react'
import { useUsersByRole, useDeliveryEfficiency } from '../hooks/useAdminData'
import { adminUsersApi } from '../api/adminApi'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import DataTable from '../components/DataTable'
import { formatDateTime, formatCurrency, formatPercent } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { Truck, Users, TrendingUp, IndianRupee, CheckCircle, Zap } = ICON_MAP

export default function DeliveryPage() {
    const { data: partners, isLoading } = useUsersByRole('delivery')
    const { data: effData, isLoading: loadingEff } = useDeliveryEfficiency()
    const qc = useQueryClient()
    const confirm = useConfirm()
    const toast = useToast()

    const efficiency = effData?.partners || []
    const totalPartners = (partners || []).length
    const avgCompletion = efficiency.length > 0
        ? Math.round(efficiency.reduce((s, p) => s + (p.completion_rate || 0), 0) / efficiency.length)
        : 0

    const handleToggle = async (user) => {
        const ok = await confirm('Toggle Status', `${user.is_active ? 'Deactivate' : 'Activate'} ${user.name || user.phone}?`)
        if (!ok) return
        try {
            await adminUsersApi.toggleActive(user.id)
            toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`)
            qc.invalidateQueries({ queryKey: ['admin', 'users', 'delivery'] })
        } catch (e) { toast.error(e.message) }
    }

    const columns = useMemo(() => [
        { key: 'name', label: 'Name', render: (v, row) => v || row.phone || '—' },
        { key: 'phone', label: 'Phone' },
        { key: 'town', label: 'Town', render: (v) => v || '—' },
        {
            key: 'is_online', label: 'Online', render: (v) => (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${v ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${v ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {v ? 'Online' : 'Offline'}
                </span>
            )
        },
        { key: 'is_enrolled', label: 'Enrolled', render: (v) => v ? '✓' : '—', sortable: false },
        { key: 'is_active', label: 'Active', render: (v) => v ? '✓' : '✗', sortable: false },
        { key: 'created_at', label: 'Joined', render: (v) => formatDateTime(v) },
        {
            key: '_actions', label: '', sortable: false, render: (_, row) => (
                <button onClick={() => handleToggle(row)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle active">
                    <Zap size={14} className={row.is_active ? 'text-emerald-500' : 'text-gray-400'} />
                </button>
            )
        },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Truck size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Partners</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {totalPartners} partner{totalPartners !== 1 ? 's' : ''} registered
                    </p>
                </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partners</span>
                        <Users size={16} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPartners}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(partners || []).filter(p => p.is_online).length} online now</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Completion</span>
                        <CheckCircle size={16} className="text-emerald-500" />
                    </div>
                    <p className={`text-2xl font-bold ${avgCompletion >= 80 ? 'text-emerald-600 dark:text-emerald-400' : avgCompletion >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {loadingEff ? '...' : `${avgCompletion}%`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">delivery success rate</p>
                </div>
                {efficiency.slice(0, 2).map((p, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {i === 0 ? 'Top Performer' : '#2 Performer'}
                            </span>
                            <TrendingUp size={16} className={i === 0 ? 'text-amber-500' : 'text-violet-500'} />
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name || 'Partner'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {p.completed || 0} deliveries · {formatCurrency(p.revenue || 0)} handled
                        </p>
                    </div>
                ))}
            </div>

            {/* Efficiency Table */}
            {efficiency.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Delivery Efficiency Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Partner</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {efficiency.map((p, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-3 text-gray-400 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name || 'N/A'}</td>
                                        <td className="text-center px-4 py-3">{p.assigned || 0}</td>
                                        <td className="text-center px-4 py-3 text-emerald-600 dark:text-emerald-400 font-medium">{p.completed || 0}</td>
                                        <td className="text-center px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${(p.completion_rate || 0) >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                                                    (p.completion_rate || 0) >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                                        'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                                }`}>
                                                {p.completion_rate || 0}%
                                            </span>
                                        </td>
                                        <td className="text-right px-4 py-3 font-medium">{formatCurrency(p.revenue || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Partner Management Table */}
            <DataTable
                columns={columns}
                data={partners || []}
                loading={isLoading}
                exportable
                exportFilename="delivery-partners"
                emptyMessage="No delivery partners registered"
            />
        </div>
    )
}

