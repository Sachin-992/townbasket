import { memo } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import * as icons from 'lucide-react'
import { MetricCardSkeleton } from './SkeletonLoader'

const trendConfig = {
    up: { Icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    down: { Icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    flat: { Icon: Minus, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/30' },
}

/**
 * @param {Object} props
 * @param {string} props.title - Label text
 * @param {string|number} props.value - Primary metric value
 * @param {string} props.icon - Lucide icon name (PascalCase)
 * @param {'up'|'down'|'flat'} [props.trend] - Trend direction
 * @param {string|number} [props.trendValue] - e.g. "+12.3%"
 * @param {string} [props.subtitle] - Secondary label
 * @param {boolean} [props.loading]
 */
function MetricCard({ title, value, icon, trend = 'flat', trendValue, subtitle, loading }) {
    if (loading) return <MetricCardSkeleton />

    const LucideIcon = icons[icon] || icons.Activity
    const t = trendConfig[trend] || trendConfig.flat

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200">
                    <LucideIcon size={20} />
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{value}</h3>
                    {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
                </div>
                {trendValue && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${t.bg} ${t.color}`}>
                        <t.Icon size={14} />
                        {trendValue}
                    </div>
                )}
            </div>
        </div>
    )
}

export default memo(MetricCard)
