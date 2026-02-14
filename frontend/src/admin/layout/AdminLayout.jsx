import { useState, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import CommandPalette from './CommandPalette'
import BottomTabNav from './BottomTabNav'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAdminSSE } from '../hooks/useAdminSSE'
import { PermissionProvider } from '../hooks/usePermissions'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            gcTime: 10 * 60 * 1000,
        },
    },
})

function AdminLayoutInner() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [paletteOpen, setPaletteOpen] = useState(false)

    const sse = useAdminSSE()

    const shortcuts = useMemo(() => ({
        'meta+k': () => setPaletteOpen(true),
        'meta+[': () => setSidebarCollapsed(c => !c),
    }), [])

    useKeyboardShortcuts(shortcuts)

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden text-gray-900 dark:text-white transition-colors duration-200">
            {/* Desktop sidebar — completely hidden below md */}
            <aside className={`
                hidden md:flex md:flex-col md:shrink-0
                bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
                transition-all duration-300 ease-in-out h-screen sticky top-0
                ${sidebarCollapsed ? 'md:w-[72px]' : 'md:w-64'}
            `}>
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                />
            </aside>

            {/* Main content — full width on mobile, flex-1 on desktop */}
            <div className="flex-1 flex flex-col min-w-0 w-full">
                <AdminTopbar
                    onToggleSidebar={() => setSidebarCollapsed(c => !c)}
                    onOpenPalette={() => setPaletteOpen(true)}
                    sse={sse}
                />

                <main className="flex-1 overflow-y-auto pb-[76px] md:pb-0">
                    <Outlet context={{ sse }} />
                </main>

                {/* Mobile bottom tab navigation — hidden on desktop */}
                <BottomTabNav />
            </div>

            {/* Command Palette */}
            <CommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
            />
        </div>
    )
}

export default function AdminLayout() {
    return (
        <QueryClientProvider client={queryClient}>
            <PermissionProvider>
                <AdminLayoutInner />
            </PermissionProvider>
        </QueryClientProvider>
    )
}
