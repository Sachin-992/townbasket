import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { ADMIN_NAV } from '../utils/permissions'
import { systemApi, fraudApi } from '../api/adminApi'
import { useDarkMode } from '../hooks/useDarkMode'
import ICON_MAP, { getIcon } from '../utils/iconMap'

const {
    Search, Users, Store, Package, Settings, UserCheck,
    ShieldAlert, RotateCw, Download, Moon, Sun, Activity,
    ScrollText, BarChart3, Eye, Clock,
} = ICON_MAP

/* ──────────── Style constants ──────────── */

const ITEM_CLASS = [
    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm',
    'text-gray-700 dark:text-gray-300 cursor-pointer',
    'data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30',
    'data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-400',
].join(' ')

const GROUP_HEADING_CLASS = [
    '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
    '[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold',
    '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest',
    '[&_[cmdk-group-heading]]:text-gray-400 dark:[&_[cmdk-group-heading]]:text-gray-500',
].join(' ')

const STATUS_STYLES = {
    approved: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    rejected: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    delivered: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    cancelled: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    active: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
}

/* ──────────── Admin quick actions ──────────── */

const ADMIN_ACTIONS = [
    { id: 'fraud-scan', label: 'Run Fraud Scan', icon: ShieldAlert, keywords: 'fraud scan detect' },
    { id: 'export-audit', label: 'Export Audit CSV', icon: Download, keywords: 'export audit csv download' },
    { id: 'health-check', label: 'System Health Check', icon: Activity, keywords: 'health system status' },
    { id: 'toggle-dark', label: 'Toggle Dark Mode', icon: Moon, keywords: 'dark mode light theme' },
    { id: 'pending-sellers', label: 'View Pending Sellers', icon: UserCheck, keywords: 'pending sellers approve' },
    { id: 'fraud-alerts', label: 'View Fraud Alerts', icon: Eye, keywords: 'fraud alerts critical' },
    { id: 'open-settings', label: 'Open Settings', icon: Settings, keywords: 'settings config' },
]

/* ──────────── Component ──────────── */

export default function CommandPalette({ open, onClose }) {
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState(null)
    const [searching, setSearching] = useState(false)
    const navigate = useNavigate()
    const { toggle: toggleDark } = useDarkMode()
    const inputRef = useRef(null)
    const debounceRef = useRef(null)

    // Reset on open
    useEffect(() => {
        if (open) {
            setSearch('')
            setSearchResults(null)
            setSearching(false)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    // Debounced search
    const doSearch = useCallback((q) => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (q.length < 2) {
            setSearchResults(null)
            setSearching(false)
            return
        }

        setSearching(true)
        debounceRef.current = setTimeout(async () => {
            try {
                const data = await systemApi.quickSearch(q)
                setSearchResults(data)
            } catch {
                setSearchResults({ users: [], shops: [], orders: [] })
            }
            setSearching(false)
        }, 250)
    }, [])

    const handleSearchChange = useCallback((value) => {
        setSearch(value)
        doSearch(value)
    }, [doSearch])

    // Navigation helper
    const go = useCallback((path) => {
        onClose()
        navigate(path)
    }, [onClose, navigate])

    // Execute admin action
    const execAction = useCallback(async (actionId) => {
        onClose()
        switch (actionId) {
            case 'fraud-scan':
                try { await fraudApi.triggerScan() } catch { /* silent */ }
                break
            case 'export-audit':
                try { await systemApi.exportAuditCSV({}) } catch { /* silent */ }
                break
            case 'health-check':
                navigate('/admin/system-health')
                break
            case 'toggle-dark':
                toggleDark()
                break
            case 'pending-sellers':
                navigate('/admin/sellers')
                break
            case 'fraud-alerts':
                navigate('/admin/fraud')
                break
            case 'open-settings':
                navigate('/admin/settings')
                break
        }
    }, [onClose, navigate])

    if (!open) return null

    const hasResults = searchResults &&
        (searchResults.users?.length || searchResults.shops?.length || searchResults.orders?.length)

    return (
        <div
            className="fixed inset-0 z-[100]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div className="relative max-w-xl w-full mx-auto mt-[12vh] px-4">
                <Command
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
                    label="Command palette"
                    shouldFilter={!hasResults}
                >
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        {searching ? (
                            <RotateCw size={16} className="text-indigo-500 animate-spin shrink-0" />
                        ) : (
                            <Search size={18} className="text-gray-400 shrink-0" />
                        )}
                        <Command.Input
                            ref={inputRef}
                            value={search}
                            onValueChange={handleSearchChange}
                            placeholder="Search users, shops, orders, or type a command…"
                            className="w-full py-4 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        <kbd className="shrink-0 px-2 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-800 rounded text-gray-400">
                            ESC
                        </kbd>
                    </div>

                    <Command.List className="max-h-[360px] overflow-y-auto p-2">
                        <Command.Empty className="py-8 text-center text-sm text-gray-400">
                            {searching ? 'Searching…' : 'No results found.'}
                        </Command.Empty>

                        {/* ── Entity Search Results ── */}
                        {searchResults?.users?.length > 0 && (
                            <Command.Group heading="Users" className={GROUP_HEADING_CLASS}>
                                {searchResults.users.map(u => (
                                    <Command.Item
                                        key={`user-${u.id}`}
                                        value={`user ${u.name} ${u.email} ${u.phone}`}
                                        onSelect={() => go('/admin/users')}
                                        className={ITEM_CLASS}
                                    >
                                        <Users size={15} className="shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{u.name || 'Unnamed'}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${u.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                                                    {u.role}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400 truncate block">
                                                {u.email || u.phone}
                                            </span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {searchResults?.shops?.length > 0 && (
                            <Command.Group heading="Shops" className={GROUP_HEADING_CLASS}>
                                {searchResults.shops.map(s => (
                                    <Command.Item
                                        key={`shop-${s.id}`}
                                        value={`shop ${s.name}`}
                                        onSelect={() => go('/admin/sellers')}
                                        className={ITEM_CLASS}
                                    >
                                        <Store size={15} className="shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium truncate">{s.name}</span>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-500'}`}>
                                            {s.status}
                                        </span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {searchResults?.orders?.length > 0 && (
                            <Command.Group heading="Orders" className={GROUP_HEADING_CLASS}>
                                {searchResults.orders.map(o => (
                                    <Command.Item
                                        key={`order-${o.id}`}
                                        value={`order ${o.order_number}`}
                                        onSelect={() => go('/admin/orders')}
                                        className={ITEM_CLASS}
                                    >
                                        <Package size={15} className="shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium font-mono text-xs">#{o.order_number}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-500'}`}>
                                                    {o.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {o.shop_name} · ₹{o.total.toLocaleString()}
                                            </span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* ── Navigate Sections ── */}
                        {!hasResults && (
                            <Command.Group heading="Navigate" className={GROUP_HEADING_CLASS}>
                                {ADMIN_NAV.map(item => {
                                    const Icon = getIcon(item.icon)
                                    return (
                                        <Command.Item
                                            key={item.path}
                                            value={`go to ${item.label}`}
                                            onSelect={() => go(item.path)}
                                            className={ITEM_CLASS}
                                        >
                                            <Icon size={15} />
                                            <span>{item.label}</span>
                                        </Command.Item>
                                    )
                                })}
                            </Command.Group>
                        )}

                        {/* ── Admin Actions ── */}
                        <Command.Group heading="Actions" className={`${GROUP_HEADING_CLASS} mt-1`}>
                            {ADMIN_ACTIONS.map(action => (
                                <Command.Item
                                    key={action.id}
                                    value={`${action.label} ${action.keywords}`}
                                    onSelect={() => execAction(action.id)}
                                    className={ITEM_CLASS}
                                >
                                    <action.icon size={15} />
                                    <span>{action.label}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>
                    </Command.List>

                    {/* ── Keyboard hints footer ── */}
                    <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">↑</kbd>
                            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">↵</kbd>
                            select
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono">esc</kbd>
                            close
                        </span>
                        <span className="ml-auto text-gray-300 dark:text-gray-600">
                            ⌘K / Ctrl+K
                        </span>
                    </div>
                </Command>
            </div>
        </div>
    )
}
