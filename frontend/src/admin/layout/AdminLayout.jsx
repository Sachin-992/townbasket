import { useState, useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import CommandPalette from './CommandPalette'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAdminSSE } from '../hooks/useAdminSSE'
import { PermissionProvider } from '../hooks/usePermissions'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,       // 30s — reduces redundant fetches on tab switch
            gcTime: 10 * 60 * 1000,  // 10 min garbage collection window
        },
    },
})

function AdminLayoutInner() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [paletteOpen, setPaletteOpen] = useState(false)

    // ── Real-time SSE connection ────────────────
    const sse = useAdminSSE()

    const shortcuts = useMemo(() => ({
        'meta+k': () => setPaletteOpen(true),
        'meta+[': () => setSidebarCollapsed(c => !c),
    }), [])

    useKeyboardShortcuts(shortcuts)

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden text-gray-900 dark:text-white transition-colors duration-200">
            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
          fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:translate-x-0 md:static
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                <AdminSidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                />
            </div>

            {/* Main content */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'}`}>
                <AdminTopbar
                    onMenuClick={() => setMobileMenuOpen(true)}
                    onOpenPalette={() => setPaletteOpen(true)}
                    sse={sse}
                />

                <main className="flex-1 overflow-y-auto">
                    <Outlet context={{ sse }} />
                </main>
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
