import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useComplaints } from '../hooks/useAdminData'
import { adminComplaintsApi } from '../api/adminApi'
import { useToast } from '../../context/ToastContext'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../utils/formatters'
import { CheckCircle } from 'lucide-react'

export default function ComplaintsPage() {
    const [statusFilter, setStatusFilter] = useState('pending')
    const { data: complaints, isLoading } = useComplaints(statusFilter)
    const qc = useQueryClient()
    const toast = useToast()

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
        { key: 'issue_type', label: 'Type', render: (v) => <span className="capitalize">{(v || '').replace(/_/g, ' ')}</span> },
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

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Complaints</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Review and resolve customer complaints</p>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
                {['pending', 'resolved'].map(s => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${statusFilter === s
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                    >
                        {s}
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
