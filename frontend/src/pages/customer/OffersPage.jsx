import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usersApi } from '../../lib/api'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function OffersPage() {
    const { user } = useAuth()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadStats = useCallback(async () => {
        if (!user?.id) return
        try {
            setLoading(true)
            const data = await usersApi.getProfileStats(user.id)
            setStats(data)
        } catch (err) {
            console.error('Failed to load stats:', err)
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    // Calculate progress to next free delivery
    const totalSpent = stats?.total_spent || 0
    const freeDeliveriesAvailable = stats?.free_deliveries_available || 0
    const progressToNext = stats?.progress_to_next_free_delivery || 0
    const nextMilestone = stats?.next_free_delivery_milestone || 500
    const progressPercent = (progressToNext / 500) * 100

    const offers = [
        {
            id: 1,
            title: 'Free Delivery',
            description: 'On your first 3 orders',
            code: 'WELCOME',
            discount: '₹0 delivery',
            validTill: 'Valid on first 3 orders',
            color: 'from-emerald-500 to-teal-600'
        },
        {
            id: 2,
            title: 'TownBasket Special',
            description: '10% off on orders above ₹500',
            code: 'TOWN10',
            discount: '10% OFF',
            validTill: 'Valid till 31st March',
            color: 'from-orange-500 to-pink-600'
        },
        {
            id: 3,
            title: 'Weekend Feast',
            description: '15% off on Sat & Sun',
            code: 'WEEKEND15',
            discount: '15% OFF',
            validTill: 'Valid on weekends',
            color: 'from-purple-500 to-indigo-600'
        }
    ]

    const copyCode = (code) => {
        navigator.clipboard.writeText(code)
        alert(`Code "${code}" copied to clipboard!`)
    }

    if (loading) {
        return (
            <CustomerLayout title="Offers & Rewards" showBack>
                <div className="bg-gray-50 min-h-screen">
                    <div className="container-responsive py-4 space-y-4">
                        <div className="bg-gray-200 rounded-2xl h-48 animate-pulse" />
                        <div className="bg-gray-200 rounded-2xl h-32 animate-pulse" />
                        <div className="bg-gray-200 rounded-2xl h-24 animate-pulse" />
                    </div>
                </div>
            </CustomerLayout>
        )
    }

    return (
        <CustomerLayout title="Offers & Rewards" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Free Delivery Hero Card */}
                    <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 rounded-2xl p-5 text-white mb-5 relative overflow-hidden">
                        {/* Animated background elements */}
                        <div className="absolute inset-0">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                        </div>

                        <div className="relative">
                            {/* Main Reward Display */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <span className="text-3xl">🚚</span>
                                    </div>
                                    <div>
                                        <p className="text-white/70 text-xs uppercase tracking-wide">Free Deliveries</p>
                                        <h2 className="text-3xl font-black">{freeDeliveriesAvailable}</h2>
                                    </div>
                                </div>
                                {freeDeliveriesAvailable > 0 && (
                                    <div className="bg-white/20 px-4 py-2 rounded-xl">
                                        <p className="text-sm font-bold">Ready to use! 🎉</p>
                                    </div>
                                )}
                            </div>

                            {/* Progress to Next Free Delivery */}
                            <div className="bg-white/10 rounded-xl p-4 mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold">Progress to Next Free Delivery</span>
                                    <span className="text-sm text-white/80">₹{progressToNext.toFixed(0)} / ₹500</span>
                                </div>
                                <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-500 relative"
                                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                    >
                                        {progressPercent > 20 && (
                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                                                {progressPercent.toFixed(0)}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-white/70 text-xs mt-2 text-center">
                                    Spend ₹{(500 - progressToNext).toFixed(0)} more to unlock your next free delivery!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* How It Works */}
                    <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4 text-lg">How It Works</h3>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                                <span className="text-3xl">💰</span>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">Spend ₹500</p>
                                <p className="text-gray-500 text-sm">Get 1 FREE Delivery</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                            <svg className="w-6 h-6 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-gray-700">
                                <span className="font-bold">It's automatic!</span> Free deliveries are added to your account when you reach ₹500 milestones.
                            </p>
                        </div>

                        {/* Visual Milestones */}
                        <div className="mt-4 grid grid-cols-4 gap-2">
                            {[500, 1000, 1500, 2000].map((milestone) => {
                                const isReached = totalSpent >= milestone
                                return (
                                    <div
                                        key={milestone}
                                        className={`text-center p-2 rounded-xl ${isReached ? 'bg-emerald-100' : 'bg-gray-100'}`}
                                    >
                                        <div className={`text-lg font-bold ${isReached ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            {isReached ? '🎁' : '🔒'}
                                        </div>
                                        <p className={`text-xs font-semibold ${isReached ? 'text-emerald-600' : 'text-gray-400'}`}>
                                            ₹{milestone}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl">📦</span>
                            </div>
                            <p className="text-2xl font-black text-emerald-600">{stats?.delivered_orders || 0}</p>
                            <p className="text-xs text-gray-500">Orders Delivered</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                                <span className="text-2xl">💵</span>
                            </div>
                            <p className="text-2xl font-black text-amber-600">₹{stats?.total_spent?.toFixed(0) || 0}</p>
                            <p className="text-xs text-gray-500">Total Spent</p>
                        </div>
                    </div>

                    {/* Bonus Points Section */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 mb-5 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">⭐</span>
                            </div>
                            <div>
                                <p className="font-bold text-lg">{stats?.rewards || 0} Bonus Points</p>
                                <p className="text-purple-200 text-xs">Earn 1 point per ₹10 spent</p>
                            </div>
                        </div>
                    </div>

                    {/* Available Offers */}
                    <h3 className="font-bold text-gray-900 mb-3 text-lg">Available Offers</h3>
                    <div className="space-y-4 mb-6">
                        {offers.map((offer) => (
                            <div key={offer.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                                <div className={`bg-gradient-to-r ${offer.color} p-4 text-white`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-lg">{offer.title}</h4>
                                            <p className="text-white/80 text-sm">{offer.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black">{offer.discount}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">{offer.validTill}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{offer.code}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => copyCode(offer.code)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition-all"
                                    >
                                        Copy Code
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Terms */}
                    <p className="text-center text-gray-400 text-xs pb-4">
                        * Free deliveries are awarded when orders are delivered. Terms apply.
                    </p>
                </div>
            </div>
        </CustomerLayout>
    )
}
