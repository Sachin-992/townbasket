import { useState, useMemo, memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDarkMode } from '../hooks/useDarkMode'
import { ADMIN_NAV } from '../utils/permissions'
import ICON_MAP, { getIcon } from '../utils/iconMap'

const { Moon, Sun, LogOut, ChevronsLeft, ChevronsRight } = ICON_MAP

function AdminSidebar({ collapsed, onToggleCollapse }) {
    const { pathname } = useLocation()
    const { signOut, user } = useAuth()
    const { isDark, toggle: toggleDark } = useDarkMode()

    const isActive = (path, exact) => exact ? pathname === path : pathname.startsWith(path)

    const handleLogout = async () => {
        await signOut()
        window.location.href = '/login'
    }

    return (
        <>
            <aside className={`
        fixed inset-y-0 left-0 z-40 flex flex-col
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}>
                {/* Brand */}
                <div className="h-16 flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 shrink-0">
                        TB
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h1 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight truncate">TownBasket</h1>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">Control Center</p>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
                    {ADMIN_NAV.map(item => {
                        const Icon = getIcon(item.icon)
                        const active = isActive(item.path, item.exact)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                title={collapsed ? item.label : undefined}
                                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                  ${active
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }
                `}
                            >
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                                )}
                                <Icon size={18} className="shrink-0" />
                                {!collapsed && <span className="truncate">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-1 shrink-0">
                    {/* Dark mode */}
                    <button
                        onClick={toggleDark}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
                    </button>

                    {/* Collapse toggle */}
                    <button
                        onClick={onToggleCollapse}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
                    >
                        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                        {!collapsed && <span>Collapse</span>}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        aria-label="Log out"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors w-full"
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Logout</span>}
                    </button>

                    {/* User */}
                    {!collapsed && (
                        <div className="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {user?.email}
                        </div>
                    )}
                </div>
            </aside>
        </>
    )
}

export default memo(AdminSidebar)
