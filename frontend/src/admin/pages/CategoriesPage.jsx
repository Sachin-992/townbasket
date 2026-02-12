import { useMemo } from 'react'
import { useCategories } from '../hooks/useAdminData'
import DataTable from '../components/DataTable'
import { formatDateTime } from '../utils/formatters'

export default function CategoriesPage() {
    const { data: categories, isLoading } = useCategories()

    const columns = useMemo(() => [
        { key: 'name', label: 'Name' },
        { key: 'icon', label: 'Icon', render: (v) => v || '—', sortable: false },
        { key: 'display_order', label: 'Order' },
        { key: 'is_active', label: 'Active', render: (v) => v ? '✓' : '✗' },
        { key: 'created_at', label: 'Created', render: (v) => formatDateTime(v) },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Shop categories configuration</p>
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
