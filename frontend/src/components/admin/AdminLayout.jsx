import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-20 flex items-center justify-between p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">A</div>
                    <span className="font-bold">TownBasket Admin</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>

            <AdminSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <Outlet />
            </main>
        </div>
    )
}
