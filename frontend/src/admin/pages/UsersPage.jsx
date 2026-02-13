import { useState, useMemo } from 'react'
import { useUsers } from '../hooks/useAdminData'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { Users, Shield, ShieldCheck, UserCog, Truck } = ICON_MAP

const ROLE_CONFIG = {
    admin: { label: 'Admin', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Shield },
    seller: { label: 'Seller', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: UserCog },
    delivery: { label: 'Delivery', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Truck },
    customer: { label: 'Customer', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', icon: Users },
}

export default function UsersPage() {
    const [roleFilter, setRoleFilter] = useState('')
    const { data, isLoading } = useUsers()
    const users = data || []

    const filtered = useMemo(() => {
        if (!roleFilter) return users
        return users.filter(u => u.role === roleFilter)
    }, [users, roleFilter])

    const roleCounts = useMemo(() => {
        const counts = { admin: 0, seller: 0, delivery: 0, customer: 0 }
        users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++ })
        return counts
    }, [users])

    const columns = useMemo(() => [
        {
            key: 'name', label: 'User', render: (v, row) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {(v || row.phone || '?')[0].toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{v || 'Unnamed'}</p>
                        <p className="text-xs text-gray-400">{row.phone || row.email || '—'}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'role', label: 'Role', render: (v) => {
                const cfg = ROLE_CONFIG[v] || ROLE_CONFIG.customer
                const Icon = cfg.icon
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon size={11} />
                        {cfg.label}
                    </span>
                )
            }
        },
        {
            key: 'is_active', label: 'Status', render: (v) => (
                <StatusBadge status={v ? 'active' : 'inactive'} />
            )
        },
        {
            key: 'created_at', label: 'Joined', render: (v) => (
                <span className="text-xs text-gray-500">{v ? formatDateTime(v) : '—'}</span>
            )
        },
        { key: 'town', label: 'Town', render: (v) => <span className="text-sm">{v || '—'}</span> },
    ], [])

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <Users size={22} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {users.length} total users across all roles
                        </p>
                    </div>
                </div>
            </div>

            {/* Role summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
                    const Icon = cfg.icon
                    const isActive = roleFilter === role
                    return (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                            className={`p-4 rounded-xl border text-left transition-all ${isActive
                                ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                                : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                                    <Icon size={14} className={cfg.color} />
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{roleCounts[role]}</span>
                            </div>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{cfg.label}s</span>
                        </button>
                    )
                })}
            </div>

            {/* Users table */}
            <DataTable
                columns={columns}
                data={filtered}
                loading={isLoading}
                exportable
                exportFilename="users"
                pageSize={20}
                emptyMessage="No users found"
            />
        </div>
    )
}
