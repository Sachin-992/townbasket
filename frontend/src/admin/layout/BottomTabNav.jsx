import { useState, memo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getIcon } from '../utils/iconMap'
import ICON_MAP from '../utils/iconMap'
import { ADMIN_NAV } from '../utils/permissions'
import { useAuth } from '../../context/AuthContext'

const { X, ChevronRight, LogOut } = ICON_MAP

// Primary tabs shown in bottom bar (max 5 including "More")
const PRIMARY_TABS = [
    { path: '/admin', label: 'Overview', icon: 'LayoutDashboard', exact: true },
    { path: '/admin/orders', label: 'Orders', icon: 'Package' },
    { path: '/admin/sellers', label: 'Sellers', icon: 'Store' },
    { path: '/admin/users', label: 'Users', icon: 'Users' },
]

// Everything else goes into "More" sheet
const MORE_ITEMS = ADMIN_NAV.filter(
    item => !PRIMARY_TABS.some(t => t.path === item.path)
)

function BottomTabNav() {
    const { pathname } = useLocation()
    const { signOut } = useAuth()
    const [moreOpen, setMoreOpen] = useState(false)

    const isActive = useCallback((path, exact) =>
        exact ? pathname === path : pathname.startsWith(path),
        [pathname]
    )

    // Check if current route is in "More"
    const moreActive = MORE_ITEMS.some(item => isActive(item.path, item.exact))

    return (
        <>
            {/* Bottom Tab Bar */}
            <nav
                className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                role="tablist"
                aria-label="Admin navigation"
            >
                <div className="flex items-stretch justify-around h-[60px]">
                    {PRIMARY_TABS.map(tab => {
                        const Icon = getIcon(tab.icon)
                        const active = isActive(tab.path, tab.exact)
                        return (
                            <Link
                                key={tab.path}
                                to={tab.path}
                                role="tab"
                                aria-selected={active}
                                aria-label={tab.label}
                                className={`
                                    flex flex-col items-center justify-center flex-1 gap-0.5
                                    transition-all duration-150 relative tap-animate
                                    ${active
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-400 dark:text-gray-500'
                                    }
                                `}
                            >
                                {active && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 dark:bg-indigo-400 rounded-b-full" />
                                )}
                                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                                <span className="text-[10px] font-semibold tracking-tight leading-none">
                                    {tab.label}
                                </span>
                            </Link>
                        )
                    })}

                    {/* More button */}
                    <button
                        onClick={() => setMoreOpen(true)}
                        role="tab"
                        aria-selected={moreActive}
                        aria-label="More navigation options"
                        className={`
                            flex flex-col items-center justify-center flex-1 gap-0.5
                            transition-all duration-150 tap-animate
                            ${moreActive
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-gray-400 dark:text-gray-500'
                            }
                        `}
                    >
                        {moreActive && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-indigo-600 dark:bg-indigo-400 rounded-b-full" />
                        )}
                        <div className="flex gap-[3px]">
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                        </div>
                        <div className="flex gap-[3px] mt-[2px]">
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                            <div className="w-[4px] h-[4px] rounded-full bg-current" />
                        </div>
                        <span className="text-[10px] font-semibold tracking-tight leading-none mt-0.5">
                            More
                        </span>
                    </button>
                </div>
            </nav>

            {/* More sheet overlay */}
            {moreOpen && (
                <div className="md:hidden fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMoreOpen(false)}
                    />

                    {/* Sheet */}
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl animate-slide-up overflow-hidden"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                        role="dialog"
                        aria-label="More navigation"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">
                                Navigation
                            </h3>
                            <button
                                onClick={() => setMoreOpen(false)}
                                aria-label="Close navigation"
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors tap-animate"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Items */}
                        <div className="px-3 py-3 max-h-[60vh] overflow-y-auto">
                            {MORE_ITEMS.map(item => {
                                const Icon = getIcon(item.icon)
                                const active = isActive(item.path, item.exact)
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMoreOpen(false)}
                                        className={`
                                            flex items-center gap-3 px-4 py-3.5 rounded-xl
                                            transition-all duration-150 tap-animate
                                            ${active
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                                            ${active
                                                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                            }
                                        `}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-sm font-medium flex-1">{item.label}</span>
                                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                                    </Link>
                                )
                            })}

                            {/* Logout */}
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    onClick={async () => { setMoreOpen(false); await signOut(); window.location.href = '/login' }}
                                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl w-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-150 tap-animate"
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-900/30 text-rose-500">
                                        <LogOut size={20} />
                                    </div>
                                    <span className="text-sm font-medium flex-1 text-left">Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default memo(BottomTabNav)
