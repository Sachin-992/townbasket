import { useMemo } from 'react'
import { useCategories } from '../hooks/useAdminData'
import DataTable from '../components/DataTable'
import { formatDateTime } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { LayoutGrid, CheckCircle, XCircle } = ICON_MAP

export default function CategoriesPage() {
    const { data: categories, isLoading } = useCategories()

    // ── Computed stats ──────────────────────────
    const stats = useMemo(() => {
        const all = categories || []
        return {
            total: all.length,
            active: all.filter(c => c.is_active).length,
            inactive: all.filter(c => !c.is_active).length,
        }
    }, [categories])

    const columns = useMemo(() => [
        { key: 'name', label: 'Name' },
        { key: 'icon', label: 'Icon', render: (v) => v ? <span className="text-lg">{v}</span> : '—', sortable: false },
        { key: 'display_order', label: 'Order' },
        {
            key: 'is_active', label: 'Active', render: (v) => (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${v ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    {v ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {v ? 'Active' : 'Inactive'}
                </span>
            )
        },
        { key: 'created_at', label: 'Created', render: (v) => formatDateTime(v) },
    ], [])

    const STAT_CARDS = [
        { label: 'Total', value: stats.total, icon: LayoutGrid, color: 'indigo' },
        { label: 'Active', value: stats.active, icon: CheckCircle, color: 'emerald' },
        { label: 'Inactive', value: stats.inactive, icon: XCircle, color: 'gray' },
    ]

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                    <LayoutGrid size={22} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Shop categories configuration</p>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
                {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {isLoading ? '—' : value}
                            </p>
                        </div>
                        <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/30`}>
                            <Icon size={18} className={`text-${color}-600 dark:text-${color}-400`} />
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                columns={columns}
                data={categories || []}
                loading={isLoading}
                emptyMessage="No categories"
            />
        </div>
    )
}
