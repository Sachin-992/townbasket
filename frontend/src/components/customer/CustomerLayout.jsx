import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import BottomNav from './BottomNav'

const navItems = [
    { path: '/customer', label: 'Home', icon: '🏠', end: true },
    { path: '/customer/shops', label: 'Explore Shops', icon: '🔍' },
    { path: '/customer/orders', label: 'My Orders', icon: '📦' },
    { path: '/customer/cart', label: 'Cart', icon: '🛒', showBadge: true },
    { path: '/customer/profile', label: 'Profile', icon: '👤' },
]

export default function CustomerLayout({ children, title, showBack = false }) {
    const { user, signOut } = useAuth()
    const { cartCount, clearCart } = useCart()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await signOut()
        clearCart()
        navigate('/login')
    }

    const handleBack = () => navigate(-1)

    return (
        <div className="min-h-screen min-h-dvh bg-gray-50">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[280px] bg-white border-r border-gray-100 flex-col z-50">
                {/* Logo */}
                <div className="p-6 border-b border-gray-100">
                    <Link to="/customer" className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white text-xl font-bold">T</span>
                        </div>
                        <div>
                            <span className="text-xl font-bold text-gray-900">TownBasket</span>
                            <p className="text-[10px] text-gray-400 -mt-0.5">Town-first • Trust-first</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-emerald-50 text-emerald-600 font-semibold'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`
                            }
                        >
                            <span className="text-lg w-6 text-center">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.showBadge && cartCount > 0 && (
                                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                    {cartCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-emerald-50 rounded-xl mb-3">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-white font-bold text-sm">
                                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">
                                {user?.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:ml-[280px]">
                {/* Desktop Header */}
                {title && (
                    <header className="hidden lg:block sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 z-30">
                        <div className="container-responsive py-4 flex items-center gap-4">
                            {showBack && (
                                <button
                                    onClick={handleBack}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                        </div>
                    </header>
                )}

                {/* Mobile Header with Back Button */}
                {(showBack || title) && (
                    <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-lg border-b border-gray-100 z-40 safe-area-pt">
                        <div className="px-4 py-3 flex items-center gap-3">
                            {showBack && (
                                <button
                                    onClick={handleBack}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 touch-target"
                                >
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            {title && <h1 className="text-lg font-bold text-gray-900">{title}</h1>}
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className="pb-20 lg:pb-8">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <div className="lg:hidden">
                <BottomNav />
            </div>
        </div>
    )
}
