import { useState, useMemo } from 'react'
import { useAuditLogs } from '../hooks/useAdminData'
import DataTable from '../components/DataTable'
import { formatDateTime } from '../utils/formatters'

const ACTION_LABELS = {
    shop_approve: 'Shop Approved',
    shop_reject: 'Shop Rejected',
    shop_toggle: 'Shop Toggled',
    user_toggle: 'User Toggled',
    settings_update: 'Settings Updated',
    complaint_resolve: 'Complaint Resolved',
    order_override: 'Order Override',
}

export default function AuditLogPage() {
    const [page, setPage] = useState(1)
    const { data, isLoading } = useAuditLogs(page)

    const logs = data?.results || data || []

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
        { key: 'target_type', label: 'Target', render: (v) => <span className="capitalize">{v}</span> },
        { key: 'target_id', label: 'ID' },
        { key: 'ip_address', label: 'IP', render: (v) => <span className="font-mono text-xs">{v || '—'}</span> },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Complete record of admin actions</p>
            </div>
            <DataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                exportable
                exportFilename="audit-log"
                pageSize={20}
                emptyMessage="No audit records yet"
            />
        </div>
    )
}
