import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import ICON_MAP from '../utils/iconMap'
import AlertCenter from '../components/AlertCenter'
import { ADMIN_NAV } from '../utils/permissions'

const { Search, Menu, Command } = ICON_MAP

const HEALTH_COLORS = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    unknown: 'bg-gray-400',
    online: 'bg-emerald-500',
    offline: 'bg-rose-500',
}

function HealthBadge({ health, connected }) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    const [online, setOnline] = useState(isOnline)

    useEffect(() => {
        const goOnline = () => setOnline(true)
        const goOffline = () => setOnline(false)
        window.addEventListener('online', goOnline)
        window.addEventListener('offline', goOffline)
        return () => {
            window.removeEventListener('online', goOnline)
            window.removeEventListener('offline', goOffline)
        }
    }, [])

    // Priority: SSE health > SSE connected > browser online/offline
    let status, label, color
    if (connected && health?.status) {
        status = health.status
        label = status.charAt(0).toUpperCase() + status.slice(1)
        color = HEALTH_COLORS[status] || HEALTH_COLORS.unknown
    } else if (connected) {
        label = 'Healthy'
        color = HEALTH_COLORS.healthy
    } else if (online) {
        label = 'Online'
        color = HEALTH_COLORS.online
    } else {
        label = 'Offline'
        color = HEALTH_COLORS.offline
    }

    return (
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" title={`Status: ${label}`}>
            <span className={`w-2 h-2 rounded-full ${color} ${(connected || online) ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {label}
            </span>
        </div>
    )
}

export default function AdminTopbar({ onMenuClick, onOpenPalette, sse }) {
    const { pathname } = useLocation()

    // Build breadcrumb from current path
    const crumbs = (() => {
        const parts = pathname.split('/').filter(Boolean)
        const items = [{ label: 'Admin', path: '/admin' }]
        if (parts.length > 1) {
            const navItem = ADMIN_NAV.find(n => pathname.startsWith(n.path) && !n.exact)
            if (navItem) items.push({ label: navItem.label, path: navItem.path })
        }
        return items
    })()

    // Current page title for mobile
    const pageTitle = (() => {
        const navItem = ADMIN_NAV.find(n => pathname.startsWith(n.path) && !n.exact)
        if (navItem) return navItem.label
        if (pathname === '/admin') return 'Overview'
        return 'Admin'
    })()

    return (
        <header className="h-14 md:h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            {/* Left: Mobile title / Desktop breadcrumb */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    aria-label="Open sidebar menu"
                    className="hidden md:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                    <Menu size={20} />
                </button>

                {/* Mobile: page title */}
                <h1 className="md:hidden text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {pageTitle}
                </h1>

                {/* Desktop: breadcrumb */}
                <nav className="hidden md:flex items-center gap-2 text-sm">
                    {crumbs.map((crumb, i) => (
                        <span key={crumb.path} className="flex items-center gap-2">
                            {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
                            <span className={i === crumbs.length - 1 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                                {crumb.label}
                            </span>
                        </span>
                    ))}
                </nav>
            </div>

            {/* Right: Search, Health Badge, Alert Center */}
            <div className="flex items-center gap-1.5 md:gap-2">
                {/* Mobile: search icon */}
                <button
                    onClick={onOpenPalette}
                    aria-label="Search"
                    className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors tap-animate"
                >
                    <Search size={20} />
                </button>

                {/* Desktop: full command palette trigger */}
                <button
                    onClick={onOpenPalette}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Search size={14} />
                    <span>Search...</span>
                    <kbd className="ml-4 px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                        ⌘K
                    </kbd>
                </button>

                {/* System health status badge — SSE-powered */}
                <HealthBadge
                    health={sse?.systemHealth}
                    connected={sse?.connected}
                />

                {/* Alert Center — SSE-powered */}
                <AlertCenter
                    alerts={sse?.alerts || []}
                    unreadCount={sse?.unreadCount || 0}
                    onMarkRead={sse?.markAlertRead}
                    onDismiss={sse?.dismissAlert}
                    onClearAll={sse?.clearAllAlerts}
                />
            </div>
        </header>
    )
}
