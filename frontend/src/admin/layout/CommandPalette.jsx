import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command } from 'cmdk'
import { ADMIN_NAV } from '../utils/permissions'
import ICON_MAP, { getIcon } from '../utils/iconMap'

export default function CommandPalette({ open, onClose }) {
    const [search, setSearch] = useState('')
    const navigate = useNavigate()
    const inputRef = useRef(null)

    useEffect(() => {
        if (open) {
            setSearch('')
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    const go = (path) => {
        onClose()
        navigate(path)
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative max-w-lg w-full mx-auto mt-[15vh]">
                <Command className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden" label="Command palette">
                    {/* Search input */}
                    <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800">
                        <ICON_MAP.Search size={18} className="text-gray-400 shrink-0" />
                        <Command.Input
                            ref={inputRef}
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search pages, actions..."
                            className="w-full py-4 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        <kbd className="shrink-0 px-2 py-0.5 text-[10px] font-mono bg-gray-100 dark:bg-gray-800 rounded text-gray-400">
                            ESC
                        </kbd>
                    </div>

                    <Command.List className="max-h-72 overflow-y-auto p-2">
                        <Command.Empty className="py-8 text-center text-sm text-gray-400">
                            No results found.
                        </Command.Empty>

                        <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-400">
                            {ADMIN_NAV.map(item => {
                                const Icon = getIcon(item.icon)
                                return (
                                    <Command.Item
                                        key={item.path}
                                        value={item.label}
                                        onSelect={() => go(item.path)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 cursor-pointer data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-400"
                                    >
                                        <Icon size={16} />
                                        <span>{item.label}</span>
                                    </Command.Item>
                                )
                            })}
                        </Command.Group>

                        <Command.Group heading="Quick Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-400 mt-1">
                            <Command.Item
                                value="View pending sellers"
                                onSelect={() => go('/admin/sellers')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 cursor-pointer data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-400"
                            >
                                <ICON_MAP.UserCheck size={16} />
                                <span>View Pending Sellers</span>
                            </Command.Item>
                            <Command.Item
                                value="View all orders"
                                onSelect={() => go('/admin/orders')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 cursor-pointer data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-400"
                            >
                                <ICON_MAP.Package size={16} />
                                <span>View All Orders</span>
                            </Command.Item>
                            <Command.Item
                                value="Open settings"
                                onSelect={() => go('/admin/settings')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 cursor-pointer data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-400"
                            >
                                <ICON_MAP.Settings size={16} />
                                <span>Open Settings</span>
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
        </div>
    )
}
