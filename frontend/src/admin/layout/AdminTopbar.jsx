import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Bell, Menu, Command } from 'lucide-react'
import SystemHealthIndicator from '../components/SystemHealthIndicator'
import { ADMIN_NAV } from '../utils/permissions'

export default function AdminTopbar({ onMenuClick, onOpenPalette }) {
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

    return (
        <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
            {/* Left: Mobile menu + Breadcrumb */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                >
                    <Menu size={20} />
                </button>

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

            {/* Right: Search, Health, Notifications */}
            <div className="flex items-center gap-2">
                {/* Command palette trigger */}
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

                <SystemHealthIndicator compact />

                <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
                    <Bell size={18} />
                    {/* Notification dot */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                </button>
            </div>
        </header>
    )
}
