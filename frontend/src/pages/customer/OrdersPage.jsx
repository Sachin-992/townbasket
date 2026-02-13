import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CustomerLayout from '../../components/customer/CustomerLayout'
import { ordersApi } from '../../lib/api'

// Auto-refresh interval for ongoing orders (15 seconds)
const POLL_INTERVAL = 15000

export default function OrdersPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('ongoing')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [showHelpModal, setShowHelpModal] = useState(false)
    const [justDelivered, setJustDelivered] = useState(null) // Track freshly delivered order for celebration
    const pollRef = useRef(null)
    const prevStatusRef = useRef({}) // Track previous statuses for animation detection

    // Load orders (used for initial load and polling)
    const loadOrders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true)
            const data = await ordersApi.getCustomerOrders(user.id)
            const newOrders = Array.isArray(data) ? data : []

            // Detect status changes for animations
            newOrders.forEach(order => {
                const prevStatus = prevStatusRef.current[order.id]
                if (prevStatus && prevStatus !== order.status) {
                    // Status changed! If it just got delivered, trigger celebration
                    if (order.status === 'delivered') {
                        setJustDelivered(order)
                        // Auto-clear celebration after 4 seconds
                        setTimeout(() => setJustDelivered(null), 4000)
                    }
                }
                prevStatusRef.current[order.id] = order.status
            })

            setOrders(newOrders)

            // Update selected order in modal if it's open
            if (selectedOrder) {
                const updated = newOrders.find(o => o.id === selectedOrder.id)
                if (updated) setSelectedOrder(updated)
            }
        } catch (err) {
            console.error('Failed to load orders:', err)
        } finally {
            setLoading(false)
        }
    }, [user?.id, selectedOrder?.id])

    // Initial load
    useEffect(() => {
        if (user?.id) loadOrders()
    }, [user])

    // Auto-polling — runs every 15s when there are ongoing orders
    useEffect(() => {
        const hasOngoing = orders.some(o => !['delivered', 'cancelled'].includes(o.status))

        if (hasOngoing && user?.id) {
            pollRef.current = setInterval(() => loadOrders(true), POLL_INTERVAL)
        }

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }
    }, [orders.length, user?.id, loadOrders])

    // Auto-switch to History tab when all ongoing orders are completed
    useEffect(() => {
        const ongoingCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length
        if (activeTab === 'ongoing' && ongoingCount === 0 && orders.length > 0 && !loading) {
            // Small delay so user can see the last step complete
            const timer = setTimeout(() => setActiveTab('past'), 2500)
            return () => clearTimeout(timer)
        }
    }, [orders, activeTab, loading])

    const ongoingOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
    const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

    const getStatusConfig = (status) => {
        const configs = {
            pending: { label: 'Order Placed', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🕐', step: 1, message: 'Waiting for shop to confirm your order...' },
            confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '✓', step: 2, message: 'Shop has confirmed! Preparing your order...' },
            preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '👨‍🍳', step: 3, message: 'Your order is being packed with care...' },
            ready: { label: 'Ready', color: 'bg-teal-100 text-teal-700 border-teal-200', icon: '📦', step: 4, message: 'Packed and ready for pickup by delivery partner!' },
            out_for_delivery: { label: 'On the way', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🚚', step: 4.5, message: 'Your order is on its way to you!' },
            delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✅', step: 5, message: 'Order delivered successfully!' },
            cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200', icon: '❌', step: 0, message: 'This order has been cancelled.' },
        }
        return configs[status] || { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '📋', step: 0, message: '' }
    }

    const displayOrders = activeTab === 'ongoing' ? ongoingOrders : pastOrders

    // Progress steps for the animated tracker
    const progressSteps = [
        { key: 'placed', label: 'Placed', icon: '🛒', stepNum: 1 },
        { key: 'confirmed', label: 'Confirmed', icon: '✓', stepNum: 2 },
        { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', stepNum: 3 },
        { key: 'ready', label: 'Ready', icon: '📦', stepNum: 4 },
        { key: 'delivered', label: 'Delivered', icon: '🏠', stepNum: 5 },
    ]

    return (
        <CustomerLayout title="My Orders" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {/* Tab Buttons */}
                    <div className="bg-white rounded-2xl p-1.5 flex gap-1 shadow-sm mb-5">
                        <button
                            onClick={() => setActiveTab('ongoing')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'ongoing'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="text-lg">📦</span>
                            <span>Ongoing</span>
                            {ongoingOrders.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'ongoing' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {ongoingOrders.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'past'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <span className="text-lg">📋</span>
                            <span>History</span>
                            {pastOrders.length > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'past' ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {pastOrders.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Live Update Indicator */}
                    {activeTab === 'ongoing' && ongoingOrders.length > 0 && (
                        <div className="flex items-center justify-center gap-2 mb-4 text-xs text-emerald-600 font-medium">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Live tracking • Auto-updating every 15s
                        </div>
                    )}

                    {/* Delivery Celebration Toast */}
                    {justDelivered && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl shadow-lg animate-slide-up flex items-center gap-3">
                            <span className="text-3xl">🎉</span>
                            <div>
                                <p className="font-bold">Order Delivered!</p>
                                <p className="text-white/80 text-sm">#{justDelivered.order_number} has been delivered successfully</p>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse">
                                    <div className="flex justify-between mb-4">
                                        <div className="h-5 bg-gray-200 rounded w-24" />
                                        <div className="h-5 bg-gray-200 rounded w-20" />
                                    </div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                </div>
                            ))}
                        </div>
                    ) : displayOrders.length === 0 ? (
                        /* Empty State */
                        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-5">
                                <span className="text-5xl">{activeTab === 'ongoing' ? '📦' : '📋'}</span>
                            </div>
                            <h3 className="text-gray-800 text-lg font-bold mb-2">
                                {activeTab === 'ongoing' ? 'No active orders' : 'No order history'}
                            </h3>
                            <p className="text-gray-500 text-sm mb-6">
                                {activeTab === 'ongoing'
                                    ? 'Start shopping to see your orders here'
                                    : 'Your completed orders will appear here'
                                }
                            </p>
                            {activeTab === 'ongoing' && (
                                <Link
                                    to="/customer"
                                    className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                                >
                                    Start Shopping
                                </Link>
                            )}
                        </div>
                    ) : (
                        /* Orders List */
                        <div className="space-y-4">
                            {displayOrders.map((order) => {
                                const statusConfig = getStatusConfig(order.status)
                                const isOngoing = activeTab === 'ongoing'

                                return (
                                    <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                        {/* Header */}
                                        <div className="p-4 border-b border-gray-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-gray-900">#{order.order_number}</span>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                                                            {statusConfig.icon} {statusConfig.label}
                                                        </span>
                                                        {order.free_delivery_used && (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                🎁 Free Delivery
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <p className="text-lg font-bold text-gray-900">₹{order.total}</p>
                                            </div>
                                        </div>

                                        {/* Animated Progress Tracker — Only for ongoing orders */}
                                        {isOngoing && statusConfig.step > 0 && (
                                            <div className="px-4 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                                                {/* Status Message */}
                                                <p className="text-center text-sm font-semibold text-emerald-700 mb-3">
                                                    {statusConfig.message}
                                                </p>

                                                {/* Progress Step Circles */}
                                                <div className="flex items-center justify-between relative mb-1">
                                                    {/* Background track line */}
                                                    <div className="absolute top-3 left-[10%] right-[10%] h-1 bg-gray-200 rounded-full z-0" />
                                                    {/* Active track line */}
                                                    <div
                                                        className="absolute top-3 left-[10%] h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full z-[1] transition-all duration-1000 ease-out"
                                                        style={{ width: `${Math.max(0, ((statusConfig.step - 1) / 4) * 80)}%` }}
                                                    />

                                                    {progressSteps.map((step) => {
                                                        const isCompleted = step.stepNum <= statusConfig.step
                                                        const isCurrent = Math.ceil(statusConfig.step) === step.stepNum
                                                        return (
                                                            <div key={step.key} className="flex flex-col items-center relative z-10">
                                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-700 ${isCompleted
                                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                                                    : 'bg-white text-gray-400 border-2 border-gray-200'
                                                                    } ${isCurrent ? 'ring-4 ring-emerald-200 scale-110' : ''}`}>
                                                                    {isCompleted ? '✓' : step.stepNum}
                                                                </div>
                                                                <span className={`text-[10px] mt-1.5 font-semibold ${isCompleted ? 'text-emerald-600' : 'text-gray-400'
                                                                    } ${isCurrent ? 'font-bold' : ''}`}>
                                                                    {step.label}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Delivery Partner Info - When assigned */}
                                        {order.delivery_partner_name && isOngoing && (
                                            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-lg">🚴</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{order.delivery_partner_name}</p>
                                                            <p className="text-blue-600 text-xs">Delivery Partner</p>
                                                        </div>
                                                    </div>
                                                    {order.delivery_partner_phone && (
                                                        <a
                                                            href={`tel:${order.delivery_partner_phone}`}
                                                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                            Call
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Shop & Items */}
                                        <div className="p-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                                                    <span className="text-xl">🏪</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">{order.shop_name}</p>
                                                    <p className="text-gray-400 text-xs">{order.items?.length || 0} items</p>
                                                </div>
                                            </div>

                                            {/* Items */}
                                            <div className="bg-gray-50 rounded-xl p-3">
                                                <div className="text-sm text-gray-600 space-y-1">
                                                    {order.items?.slice(0, 3).map((item, idx) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <span className="truncate flex-1">{item.quantity}× {item.product_name}</span>
                                                            <span className="text-gray-900 font-medium ml-2">₹{item.total_price || item.unit_price * item.quantity || 0}</span>
                                                        </div>
                                                    ))}
                                                    {order.items?.length > 3 && (
                                                        <p className="text-gray-400 text-xs pt-1">+{order.items.length - 3} more items</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="px-4 pb-4 flex gap-3">
                                            {isOngoing ? (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        </svg>
                                                        Track Order
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedOrder(order); setShowHelpModal(true); }}
                                                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                                                    >
                                                        Help
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/customer/shop/${order.shop}`)}
                                                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Reorder
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 rounded-xl font-semibold text-sm transition-all cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Order Details / Track Order Modal */}
            {selectedOrder && !showHelpModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedOrder(null)}>
                    <div
                        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[90vh] overflow-auto pb-20 sm:pb-0"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Mobile Drag Handle */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Order Details</h3>
                                <p className="text-gray-500 text-sm">#{selectedOrder.order_number}</p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                aria-label="Close order details"
                                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Live Order Status with Full Progress Tracker */}
                        <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-2xl">
                                    {selectedOrder.status === 'delivered' ? '✅' : selectedOrder.status === 'cancelled' ? '❌' : '📦'}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{getStatusConfig(selectedOrder.status).label}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(selectedOrder.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Vertical Timeline Progress */}
                            {getStatusConfig(selectedOrder.status).step > 0 && (
                                <div className="ml-2 space-y-0">
                                    {progressSteps.map((step, idx) => {
                                        const currentStep = getStatusConfig(selectedOrder.status).step
                                        const isCompleted = step.stepNum <= currentStep
                                        const isCurrent = Math.ceil(currentStep) === step.stepNum
                                        const isLast = idx === progressSteps.length - 1

                                        return (
                                            <div key={step.key} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-700 ${isCompleted
                                                        ? 'bg-emerald-500 text-white shadow-md'
                                                        : 'bg-gray-200 text-gray-400'
                                                        } ${isCurrent ? 'ring-4 ring-emerald-200 scale-110' : ''}`}>
                                                        {isCompleted ? '✓' : step.icon}
                                                    </div>
                                                    {!isLast && (
                                                        <div className={`w-0.5 h-8 transition-all duration-700 ${isCompleted && step.stepNum < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                                    )}
                                                </div>
                                                <div className={`pt-1 ${isCurrent ? 'font-bold' : ''}`}>
                                                    <p className={`text-sm ${isCompleted ? 'text-emerald-700' : 'text-gray-400'}`}>
                                                        {step.label}
                                                    </p>
                                                    {isCurrent && (
                                                        <p className="text-xs text-emerald-600 mt-0.5 animate-pulse">
                                                            {getStatusConfig(selectedOrder.status).message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Live indicator */}
                            {!['delivered', 'cancelled'].includes(selectedOrder.status) && (
                                <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-emerald-200/50 text-xs text-emerald-600 font-medium">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    Live tracking active
                                </div>
                            )}
                        </div>

                        {/* Delivery Partner Info */}
                        {selectedOrder.delivery_partner_name && (
                            <div className="p-4 bg-blue-50 border-b border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">🚴</div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{selectedOrder.delivery_partner_name}</p>
                                            <p className="text-blue-600 text-sm">Delivery Partner</p>
                                        </div>
                                    </div>
                                    {selectedOrder.delivery_partner_phone && (
                                        <a
                                            href={`tel:${selectedOrder.delivery_partner_phone}`}
                                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
                                        >
                                            📞 Call
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Shop Info */}
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-xl">🏪</div>
                                <div>
                                    <p className="font-semibold text-gray-900">{selectedOrder.shop_name}</p>
                                    <p className="text-gray-500 text-sm">{selectedOrder.items?.length || 0} items</p>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="p-4 border-b border-gray-100">
                            <h4 className="font-bold text-gray-900 mb-3">Order Items</h4>
                            <div className="space-y-2">
                                {selectedOrder.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold text-sm">
                                                {item.quantity}×
                                            </span>
                                            <span className="text-gray-900">{item.product_name}</span>
                                        </div>
                                        <span className="font-semibold text-gray-900">₹{item.total_price || item.unit_price * item.quantity || 0}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="p-4 space-y-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{selectedOrder.subtotal || selectedOrder.total}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery Fee</span>
                                <span className={selectedOrder.free_delivery_used ? 'text-emerald-600 font-semibold' : ''}>
                                    {selectedOrder.free_delivery_used ? '🎁 FREE' : `₹${selectedOrder.delivery_fee || 0}`}
                                </span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
                                <span>Total</span>
                                <span>₹{selectedOrder.total}</span>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="p-4 bg-gray-50">
                            <h4 className="font-bold text-gray-900 mb-2">📍 Delivery Address</h4>
                            <p className="text-gray-600 text-sm">{selectedOrder.delivery_address || 'Address not available'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelpModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => { setShowHelpModal(false); setSelectedOrder(null); }}>
                    <div
                        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl pb-20 sm:pb-0"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Mobile Drag Handle */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Need Help?</h3>
                                <p className="text-gray-500 text-sm">Order #{selectedOrder.order_number}</p>
                            </div>
                            <button
                                onClick={() => { setShowHelpModal(false); setSelectedOrder(null); }}
                                aria-label="Close help"
                                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Help Options */}
                        <div className="p-4 space-y-3">
                            <a
                                href={`https://wa.me/919876543210?text=Hi, I need help with order ${selectedOrder.order_number}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl">💬</div>
                                <div>
                                    <p className="font-bold text-gray-900">Chat on WhatsApp</p>
                                    <p className="text-gray-500 text-sm">Get instant support</p>
                                </div>
                            </a>

                            <a
                                href="tel:+919876543210"
                                className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">📞</div>
                                <div>
                                    <p className="font-bold text-gray-900">Call Support</p>
                                    <p className="text-gray-500 text-sm">+91 98765 43210</p>
                                </div>
                            </a>

                            <Link
                                to="/customer/contact"
                                className="flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-2xl">✉️</div>
                                <div>
                                    <p className="font-bold text-gray-900">Submit a Complaint</p>
                                    <p className="text-gray-500 text-sm">We'll respond within 24 hours</p>
                                </div>
                            </Link>
                        </div>

                        {/* Quick FAQ */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-gray-500 text-sm text-center">
                                Common issues: Delayed delivery | Wrong items | Refund request
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </CustomerLayout>
    )
}
