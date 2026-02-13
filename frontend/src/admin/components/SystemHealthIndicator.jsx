import { memo } from 'react'
import { useSystemHealth } from '../hooks/useAdminData'

function SystemHealthIndicator({ compact = false }) {
    const { data, isLoading } = useSystemHealth()

    if (isLoading || !data) {
        return (
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                {!compact && <span className="text-xs text-gray-400">Checking...</span>}
            </div>
        )
    }

    const checks = [
        { key: 'database', ok: data.database !== false },
        { key: 'cache', ok: data.cache !== false },
        { key: 'auth', ok: data.auth !== false },
    ]

    const allOk = checks.every(c => c.ok)
    const someDown = checks.some(c => !c.ok)

    const dotColor = allOk ? 'bg-emerald-500' : someDown ? 'bg-amber-500' : 'bg-rose-500'
    const label = allOk ? 'All systems operational' : 'Degraded performance'

    if (compact) {
        return (
            <div className="flex items-center gap-1.5" title={label}>
                <div className={`w-2 h-2 rounded-full ${dotColor} ${allOk ? '' : 'animate-pulse'}`} />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/40">
            <div className={`w-2 h-2 rounded-full ${dotColor} ${allOk ? '' : 'animate-pulse'}`} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
        </div>
    )
}

export default memo(SystemHealthIndicator)
