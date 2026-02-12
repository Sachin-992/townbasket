import { Suspense, lazy, memo } from 'react'
import { ChartSkeleton } from './SkeletonLoader'

const LazyAreaChart = lazy(() => import('recharts').then(m => ({ default: m.AreaChart })))
const LazyBarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })))
const LazyPieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })))

// Re-export light composables synchronously from recharts
// (these are tiny and always needed alongside charts)
export { Area, Bar, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

/**
 * Chart card wrapper with title, optional subtitle, and lazy-loaded chart.
 */
function ChartCard({ title, subtitle, children, className = '' }) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 ${className}`}>
            {title && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
            )}
            <Suspense fallback={<ChartSkeleton />}>
                {children}
            </Suspense>
        </div>
    )
}

export { LazyAreaChart as AreaChart, LazyBarChart as BarChart, LazyPieChart as PieChart }
export default memo(ChartCard)
