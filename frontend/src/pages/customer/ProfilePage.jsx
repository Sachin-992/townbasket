import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { usersApi } from '../../lib/api'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function ProfilePage() {
    const { user, signOut } = useAuth()
    const { clearCart } = useCart()
    const navigate = useNavigate()
    const toast = useToast()
    const [stats, setStats] = useState({ orders: 0, rewards: 0, favorites: 0 })
    const [backendUser, setBackendUser] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', phone: '' })
    const [saving, setSaving] = useState(false)
    const [showRateModal, setShowRateModal] = useState(false)
    const [rating, setRating] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [rateSubmitted, setRateSubmitted] = useState(false)

    const loadUserData = useCallback(async () => {
        if (!user?.id) return
        try {
            // Load stats
            const statsData = await usersApi.getProfileStats(user.id)
            setStats(statsData)

            // Load user profile from backend
            const userData = await usersApi.getCurrentUser(user.id)
            setBackendUser(userData)
        } catch (err) {
            console.error('Failed to load user data:', err)
        }
    }, [user?.id])

    useEffect(() => {
        loadUserData()
    }, [loadUserData])

    useEffect(() => {
        // Initialize form with backend user data (for phone) and Supabase data (for name)
        setEditForm({
            name: backendUser?.name || user?.user_metadata?.full_name || '',
            phone: backendUser?.phone || ''
        })
    }, [user, backendUser])

    const handleLogout = async () => {
        await signOut()
        clearCart()
        navigate('/login')
    }

    const handleEditProfile = async (e) => {
        e.preventDefault()
        if (!user?.id) return

        setSaving(true)
        try {
            await usersApi.updateProfile(user.id, editForm)
            setShowEditModal(false)
            // Reload user data to reflect changes
            await loadUserData()
        } catch (err) {
            console.error('Failed to update profile:', err)
            toast.error('Failed to update profile. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const menuItems = [
        { icon: '📋', label: 'My Orders', path: '/customer/orders', description: 'Track & view your orders' },
        { icon: '📍', label: 'Saved Addresses', path: '/customer/addresses', description: 'Manage delivery locations' },
        { icon: '💳', label: 'Payment Methods', path: '#', badge: 'Soon', description: 'Saved cards & UPI' },
        { icon: '🎁', label: 'Offers & Rewards', path: '/customer/offers', description: 'Coupons & cashback' },
        { icon: '🔔', label: 'Notifications', path: '/customer/notifications', description: 'Order updates & offers' },
        { icon: '❓', label: 'Help & Support', path: '/customer/help', description: 'FAQs & contact us' },
    ]

    return (
        <CustomerLayout title="Profile" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Profile Header Card */}
                    <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-5 sm:p-6 text-white mb-5 relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative flex items-center gap-4">
                            <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl" style={{ width: '72px', height: '72px' }}>
                                <span className="text-3xl sm:text-4xl font-bold text-emerald-600">
                                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl sm:text-2xl font-bold truncate">{user?.user_metadata?.full_name || 'User'}</h2>
                                <p className="text-emerald-100 text-sm truncate">{user?.email}</p>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                    Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <Link to="/customer/orders" className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-2xl font-bold text-emerald-600">{stats.orders}</p>
                            <p className="text-xs text-gray-500">Orders</p>
                        </Link>
                        <Link to="/customer/offers" className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-2xl font-bold text-amber-600">
                                {stats.free_deliveries_available || 0} 🚚
                            </p>
                            <p className="text-xs text-gray-500">Free Deliveries</p>
                        </Link>
                        <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                            <p className="text-2xl font-bold text-purple-600">{stats.favorites}</p>
                            <p className="text-xs text-gray-500">Favorites</p>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                        {menuItems.map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.path}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                            >
                                <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span className="text-xl">{item.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{item.label}</span>
                                        {item.badge && (
                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">{item.description}</p>
                                </div>
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        ))}
                    </div>

                    {/* About Section */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                        <Link to="/customer/about" className="flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">ℹ️</span>
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-gray-900">About TownBasket</span>
                                <p className="text-xs text-gray-400">Version 1.0.0</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <button onClick={() => setShowRateModal(true)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left">
                            <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-xl">⭐</span>
                            </div>
                            <div className="flex-1">
                                <span className="font-semibold text-gray-900">Rate Us</span>
                                <p className="text-xs text-gray-400">Love TownBasket? Leave a review!</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:bg-red-50 transition-colors group"
                    >
                        <div className="w-11 h-11 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors">
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <span className="font-semibold text-red-600">Logout</span>
                    </button>

                    {/* Footer Slogan */}
                    <div className="mt-8 text-center pb-6">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full mb-3">
                            <span className="text-emerald-600 font-bold text-sm">🌿 TownBasket</span>
                        </div>
                        <p className="text-gray-400 text-xs">
                            <span className="font-semibold text-emerald-600">Town-first</span> •
                            <span className="font-semibold text-emerald-600"> Trust-first</span> •
                            <span className="font-semibold text-emerald-600"> People-first</span>
                        </p>
                        <p className="text-gray-300 text-[10px] mt-2">TownBasket is NOT a copy of city apps.</p>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowEditModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-24 sm:pb-6 animate-slide-up">
                        {/* Handle - Mobile Only */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pt-4 sm:pt-0">
                            <h2 className="text-xl font-black text-gray-900">Edit Profile</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleEditProfile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter your name"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Enter your phone number"
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Rate Us Modal */}
            {showRateModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowRateModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-24 sm:pb-6 animate-slide-up">
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full sm:hidden" />

                        {rateSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">🎉</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Thank You!</h3>
                                <p className="text-gray-500 text-sm mt-2">Your feedback helps us improve.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6 pt-4 sm:pt-0">
                                    <h2 className="text-xl font-black text-gray-900">Rate TownBasket</h2>
                                    <button
                                        onClick={() => setShowRateModal(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                                    >
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <p className="text-gray-500 text-sm mb-4 text-center">How would you rate your experience?</p>

                                {/* Star Rating */}
                                <div className="flex justify-center gap-2 mb-6">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className={`text-4xl transition-transform ${rating >= star ? 'scale-110' : 'opacity-30'}`}
                                        >
                                            ⭐
                                        </button>
                                    ))}
                                </div>

                                {rating > 0 && (
                                    <p className="text-center font-semibold text-gray-900 mb-4">
                                        {rating === 5 && "Excellent! We're glad you love it! 🎉"}
                                        {rating === 4 && "Great! Thanks for the positive feedback! 😊"}
                                        {rating === 3 && "Good! We'll work to improve. 👍"}
                                        {rating === 2 && "We're sorry. Please tell us more. 😔"}
                                        {rating === 1 && "We're really sorry. Please share your concerns. 🙏"}
                                    </p>
                                )}

                                {/* Feedback Text */}
                                <textarea
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    placeholder="Share your feedback (optional)"
                                    rows={3}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors resize-none mb-4"
                                />

                                <button
                                    onClick={() => {
                                        setRateSubmitted(true)
                                        setTimeout(() => {
                                            setShowRateModal(false)
                                            setRateSubmitted(false)
                                            setRating(0)
                                            setFeedback('')
                                        }, 2000)
                                    }}
                                    disabled={rating === 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-bold text-lg active:scale-[0.98] transition-all disabled:cursor-not-allowed"
                                >
                                    Submit Rating
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </CustomerLayout>
    )
}
