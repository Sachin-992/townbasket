export default function Skeleton({ className = '', variant = 'default' }) {
    const baseClass = 'animate-pulse bg-gray-200 rounded'

    const variants = {
        default: 'h-4 w-full',
        title: 'h-6 w-3/4',
        avatar: 'h-12 w-12 rounded-full',
        button: 'h-12 w-32 rounded-xl',
        card: 'h-48 w-full rounded-2xl',
        image: 'h-32 w-full rounded-xl',
        text: 'h-4 w-full',
        'text-short': 'h-4 w-2/3',
    }

    return (
        <div className={`${baseClass} ${variants[variant] || variants.default} ${className}`} />
    )
}

// Skeleton loaders for specific components
export function ShopCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <Skeleton variant="image" />
            <div className="p-4 space-y-3">
                <Skeleton variant="title" />
                <Skeleton variant="text-short" />
                <Skeleton variant="text-short" />
            </div>
        </div>
    )
}

export function ProductCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <Skeleton variant="image" />
            <div className="p-3 space-y-2">
                <Skeleton variant="text" />
                <Skeleton variant="text-short" />
                <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton variant="button" className="w-16" />
                </div>
            </div>
        </div>
    )
}

export function OrderCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden p-4 space-y-3">
            <div className="flex justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton variant="text" />
            <Skeleton variant="text-short" />
            <div className="flex justify-between pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton variant="button" />
            </div>
        </div>
    )
}
