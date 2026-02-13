import { memo } from 'react'

function SkeletonLoader({ className = '', variant = 'rect' }) {
    const base = 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg'
    const shapes = {
        rect: '',
        circle: '!rounded-full',
        text: 'h-4 w-3/4',
        card: 'h-32',
        chart: 'h-64',
    }
    return <div className={`${base} ${shapes[variant] || ''} ${className}`} />
}

/** Pre-built skeleton groups */
export function MetricCardSkeleton() {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 min-h-[128px]">
            <div className="flex items-center justify-between mb-4">
                <SkeletonLoader className="h-4 w-24" />
                <SkeletonLoader className="h-10 w-10" variant="circle" />
            </div>
            <SkeletonLoader className="h-8 w-20 mb-2" />
            <SkeletonLoader className="h-3 w-32" />
        </div>
    )
}

export function TableSkeleton({ rows = 5 }) {
    return (
        <div className="space-y-3 min-h-[340px]">
            <SkeletonLoader className="h-10 w-full" />
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonLoader key={i} className="h-14 w-full min-h-[56px]" />
            ))}
        </div>
    )
}

export function ChartSkeleton() {
    return <SkeletonLoader variant="chart" className="w-full min-h-[256px]" />
}

export default memo(SkeletonLoader)
