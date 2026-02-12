import { useMemo } from 'react'
import { useUsersByRole } from '../hooks/useAdminData'
import { adminUsersApi } from '../api/adminApi'
import { useQueryClient } from '@tanstack/react-query'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import DataTable from '../components/DataTable'
import { formatDateTime } from '../utils/formatters'
import { Power } from 'lucide-react'

export default function DeliveryPage() {
    const { data: partners, isLoading } = useUsersByRole('delivery')
    const qc = useQueryClient()
    const confirm = useConfirm()
    const toast = useToast()

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
                    <Power size={14} className={row.is_active ? 'text-emerald-500' : 'text-gray-400'} />
                </button>
            )
        },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Partners</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage delivery partner accounts</p>
            </div>
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
