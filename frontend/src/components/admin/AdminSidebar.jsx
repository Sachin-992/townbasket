import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function AdminSidebar({ isOpen, onClose }) {
    const { pathname } = useLocation()
    const { signOut, user } = useAuth()

    const menuItems = [
        { path: '/admin', label: 'Home', icon: '🏠', exact: true },
        { path: '/admin/sellers', label: 'Sellers', icon: '🏪' },
        { path: '/admin/orders', label: 'Orders', icon: '📦' },
        { path: '/admin/delivery', label: 'Delivery', icon: '🛵' },
        { path: '/admin/complaints', label: 'Complaints', icon: '🧾' },
        { path: '/admin/categories', label: 'Categories', icon: '🗂️' },
        { path: '/admin/settings', label: 'Settings', icon: '🎛️' },
    ]

    const isActive = (path, exact) => {
        if (exact) return pathname === path
        return pathname.startsWith(path)
    }

    const handleLogout = async () => {
        await signOut()
        window.location.href = '/login'
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/30">
                            A
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-wide">TownBasket</h1>
                            <p className="text-xs text-slate-400">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-800 md:hidden flex justify-between items-center">
                    <span className="font-bold text-lg">Menu</span>
                    <button onClick={onClose} className="p-2">✕</button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => onClose && onClose()}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive(item.path, item.exact)
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <span>🚪</span>
                        <span className="font-medium">Logout</span>
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-4">
                        Logged in as {user?.email}
                    </p>
                </div>
            </aside>
        </>
    )
}
