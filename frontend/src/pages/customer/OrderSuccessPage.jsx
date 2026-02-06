import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function OrderSuccessPage() {
    const location = useLocation()
    const order = location.state?.order
    const [showConfetti, setShowConfetti] = useState(true)

    useEffect(() => {
        // Hide confetti after animation
        const timer = setTimeout(() => setShowConfetti(false), 3000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Confetti Animation */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 50}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${1 + Math.random()}s`,
                            }}
                        >
                            <span className="text-2xl">{['🎉', '🎊', '✨', '🌟', '💚'][i % 5]}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-emerald-200/30 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200/30 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center relative z-10">
                {/* Success Icon */}
                <div className="relative mb-6">
                    <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/30">
                        <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    {/* Pulse Ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-28 h-28 bg-emerald-400/30 rounded-full animate-ping" />
                    </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Order Placed!</h1>
                <p className="text-gray-500 mb-6">Your order has been placed successfully</p>

                {order && (
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 mb-6 border border-emerald-100">
                        <p className="text-sm text-gray-500 mb-1">Order Number</p>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600">#{order.order_number}</p>
                        {order.total && (
                            <p className="text-gray-600 mt-2">Total: <span className="font-bold">₹{order.total}</span></p>
                        )}
                    </div>
                )}

                {/* Delivery Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-xl">🚚</span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">Estimated Delivery</p>
                            <p className="text-sm text-gray-500">Within 30-45 minutes</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Link
                        to="/customer/orders"
                        className="block w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Track Order
                    </Link>

                    <Link
                        to="/customer"
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-2xl font-semibold transition-colors"
                    >
                        Continue Shopping
                    </Link>
                </div>

                {/* Footer */}
                <p className="text-gray-400 text-xs mt-6">
                    Thank you for shopping with <span className="text-emerald-600 font-semibold">TownBasket</span>
                </p>
            </div>
        </div>
    )
}
