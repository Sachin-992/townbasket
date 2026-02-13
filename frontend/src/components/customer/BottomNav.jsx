import { NavLink } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

export default function BottomNav() {
    const { cartCount } = useCart()

    const navItems = [
        {
            path: '/customer',
            label: 'Home',
            icon: (active) => (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            path: '/customer/shops',
            label: 'Explore',
            icon: (active) => (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        },
        {
            path: '/customer/cart',
            label: 'Cart',
            badge: cartCount,
            icon: (active) => (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        },
        {
            path: '/customer/orders',
            label: 'Orders',
            icon: (active) => (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            )
        },
        {
            path: '/customer/profile',
            label: 'Profile',
            icon: (active) => (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        },
    ]

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-pb" aria-label="Main navigation">
            <div className="max-w-lg mx-auto flex justify-around items-center h-14 sm:h-16">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/customer'}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 h-full relative transition-all duration-200 touch-target ${isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {/* Active Indicator */}
                                {isActive && (
                                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-0.5 sm:h-1 bg-emerald-500 rounded-b-full" />
                                )}

                                {/* Icon */}
                                <div className="relative">
                                    {item.icon(isActive)}

                                    {/* Badge */}
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 min-w-[16px] sm:min-w-[18px] h-[16px] sm:h-[18px] bg-orange-500 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center px-1">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </div>

                                {/* Label */}
                                <span className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
