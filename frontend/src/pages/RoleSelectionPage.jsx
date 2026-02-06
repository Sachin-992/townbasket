import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLES = [
    {
        id: 'customer',
        title: 'Customer',
        icon: '🛒',
        description: 'Order from local shops',
        color: 'from-emerald-400 to-teal-500',
        bgLight: 'bg-emerald-50',
    },
    {
        id: 'seller',
        title: 'Seller',
        icon: '🏪',
        description: 'Sell your products',
        color: 'from-blue-400 to-indigo-500',
        bgLight: 'bg-blue-50',
    },
    {
        id: 'delivery',
        title: 'Delivery Partner',
        icon: '🛵',
        description: 'Deliver orders',
        color: 'from-orange-400 to-rose-500',
        bgLight: 'bg-orange-50',
    },
]

const ADMIN_ROLE = {
    id: 'admin',
    title: 'Town Officer',
    icon: '🛡️',
    description: 'Manage town operations',
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
}

export default function RoleSelectionPage() {
    const [selectedRole, setSelectedRole] = useState(null)
    const [loading, setLoading] = useState(false)
    const { user, setUserProfile } = useAuth()
    const navigate = useNavigate()

    // Determine if admin role should be shown
    const isAdmin = user?.email === 'sachinchinnasamy2021@gmail.com' ||
        user?.app_metadata?.app_role === 'admin' ||
        user?.user_metadata?.app_role === 'admin';

    const visibleRoles = isAdmin ? [...ROLES, ADMIN_ROLE] : ROLES;

    const handleSelectRole = async () => {
        if (!selectedRole) return

        setLoading(true)

        const profile = {
            id: user.id,
            phone: user.phone,
            role: selectedRole,
            name: user?.user_metadata?.full_name || user?.user_metadata?.name
        }

        await setUserProfile(profile)

        // Navigate based on role
        if (selectedRole === 'customer') {
            navigate('/customer')
        } else if (selectedRole === 'seller') {
            navigate('/seller')
        } else if (selectedRole === 'delivery') {
            navigate('/delivery')
        } else if (selectedRole === 'admin') {
            navigate('/admin')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen min-h-dvh bg-gray-50 flex flex-col relative overflow-y-auto">
            {/* Background Decorations (Desktop) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-3xl" />
                <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-t from-emerald-50/50 to-transparent" />
            </div>

            {/* Header with Logo */}
            <div className="relative z-10 p-3 md:p-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <span className="text-white text-lg font-bold">T</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">TownBasket</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Welcome Message */}
                    <div className="text-center mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 tracking-tight">
                            Welcome, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}! 👋
                        </h1>
                        <p className="text-gray-500 text-base">Select your journey to get started.</p>
                    </div>

                    {/* Role Cards */}
                    <div className="space-y-3 mb-6">
                        {visibleRoles.map((role) => (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 text-left group relative overflow-hidden ${selectedRole === role.id
                                    ? 'border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 scale-[1.02] ring-1 ring-emerald-500'
                                    : 'border-white bg-white/80 hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:-translate-y-0.5'
                                    }`}
                            >
                                <div className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center text-xl shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                    {role.icon}
                                </div>
                                <div className="relative z-10 flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors leading-tight">{role.title}</h3>
                                    <p className="text-gray-500 text-sm group-hover:text-gray-600 leading-tight">{role.description}</p>
                                </div>
                                <div className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedRole === role.id
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-300 group-hover:border-emerald-300'
                                    }`}>
                                    {selectedRole === role.id && (
                                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleSelectRole}
                        disabled={!selectedRole || loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-4 rounded-xl text-lg font-bold shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Please wait...
                            </>
                        ) : (
                            <>
                                Continue
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </>
                        )}
                    </button>

                    {/* Note */}
                    <p className="text-center text-gray-400 text-sm mt-6">
                        You can switch roles anytime from settings
                    </p>
                </div>
            </div>
        </div>
    )
}
