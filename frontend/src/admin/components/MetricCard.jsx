import { memo, useMemo } from 'react'
import ICON_MAP, { getIcon } from '../utils/iconMap'

const { TrendingUp, TrendingDown, Minus } = ICON_MAP
import { MetricCardSkeleton } from './SkeletonLoader'

const trendConfig = {
    up: { Icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    down: { Icon: TrendingDown, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30' },
    flat: { Icon: Minus, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/30' },
}

/**
 * Mini sparkline — pure SVG, no library dependency.
 * @param {{ data: number[], color?: string, className?: string }} props
 */
function MiniSparkline({ data = [], color = '#6366f1', className = '' }) {
    const path = useMemo(() => {
        if (!data.length) return ''
        const max = Math.max(...data, 1)
        const min = Math.min(...data, 0)
        const range = max - min || 1
        const w = 100
        const h = 28
        const step = w / Math.max(data.length - 1, 1)
        return data
            .map((v, i) => {
                const x = i * step
                const y = h - ((v - min) / range) * (h - 4) - 2
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
            })
            .join(' ')
    }, [data])

    if (!data.length) return null

    return (
        <svg viewBox="0 0 100 28" className={`w-full h-7 ${className}`} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            {/* Fill area */}
            <path
                d={`${path} L100 28 L0 28 Z`}
                fill={`url(#spark-${color.replace('#', '')})`}
            />
            {/* Line */}
            <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
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
 * @param {number[]} [props.sparkline] - Array of numeric values for mini chart
 * @param {string} [props.sparkColor] - Sparkline colour
 * @param {string} [props.accentColor] - Custom icon bg/text accent
 */
function MetricCard({
    title, value, icon, trend = 'flat', trendValue, subtitle, loading,
    sparkline, sparkColor, accentColor,
}) {
    if (loading) return <MetricCardSkeleton />

    const LucideIcon = getIcon(icon)
    const t = trendConfig[trend] || trendConfig.flat

    const iconBg = accentColor
        ? `bg-${accentColor}-50 dark:bg-${accentColor}-900/30`
        : 'bg-indigo-50 dark:bg-indigo-900/30'
    const iconTxt = accentColor
        ? `text-${accentColor}-600 dark:text-${accentColor}-400`
        : 'text-indigo-600 dark:text-indigo-400'

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconTxt} group-hover:scale-110 transition-transform duration-200`}>
                    <LucideIcon size={18} />
                </div>
            </div>

            {/* Value + trend */}
            <div className="flex items-end justify-between">
                <div className="min-w-0">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate">{value}</h3>
                    {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                </div>
                {trendValue && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${t.bg} ${t.color} whitespace-nowrap`}>
                        <t.Icon size={12} />
                        {trendValue}
                    </div>
                )}
            </div>

            {/* Optional sparkline */}
            {sparkline && sparkline.length > 1 && (
                <div className="mt-3 -mx-1">
                    <MiniSparkline data={sparkline} color={sparkColor || '#6366f1'} />
                </div>
            )}
        </div>
    )
}

export default memo(MetricCard)
export { MiniSparkline }
