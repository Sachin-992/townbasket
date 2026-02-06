import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ordersApi } from '../../lib/api'
import { Link } from 'react-router-dom'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function NotificationsPage() {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)

    const loadNotifications = useCallback(async () => {
        if (!user?.id) return
        try {
            setLoading(true)
            // Get recent orders as notifications
            const orders = await ordersApi.getCustomerOrders(user.id)

            // Convert orders to notifications
            const orderNotifications = (orders || []).slice(0, 10).map(order => ({
                id: order.id,
                type: 'order',
                title: getOrderTitle(order.status),
                message: `Order #${order.id} - ${order.shop_name || 'Shop'}`,
                time: formatTime(order.updated_at || order.created_at),
                icon: getOrderIcon(order.status),
                status: order.status,
                link: '/customer/orders'
            }))

            setNotifications(orderNotifications)
        } catch (err) {
            console.error('Failed to load notifications:', err)
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        loadNotifications()
    }, [loadNotifications])

    const getOrderTitle = (status) => {
        const titles = {
            'pending': 'Order Placed',
            'accepted': 'Order Accepted',
            'preparing': 'Order Being Prepared',
            'ready': 'Order Ready for Pickup',
            'out_for_delivery': 'Out for Delivery',
            'delivered': 'Order Delivered',
            'cancelled': 'Order Cancelled'
        }
        return titles[status] || 'Order Update'
    }

    const getOrderIcon = (status) => {
        const icons = {
            'pending': '🕐',
            'accepted': '✅',
            'preparing': '👨‍🍳',
            'ready': '📦',
            'out_for_delivery': '🛵',
            'delivered': '🎉',
            'cancelled': '❌'
        }
        return icons[status] || '📋'
    }

    const formatTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now - date

        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
        if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
        return date.toLocaleDateString()
    }

    return (
        <CustomerLayout title="Notifications" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center">
                            <span className="text-5xl">🔔</span>
                            <h3 className="text-lg font-bold text-gray-900 mt-4">No notifications yet</h3>
                            <p className="text-gray-500 text-sm mt-1">Place an order to receive updates here</p>
                            <Link
                                to="/customer"
                                className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold"
                            >
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    to={notification.link}
                                    className="block bg-white rounded-2xl p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${notification.status === 'delivered' ? 'bg-emerald-100' :
                                                notification.status === 'cancelled' ? 'bg-red-100' :
                                                    'bg-blue-100'
                                            }`}>
                                            {notification.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-bold text-gray-900">{notification.title}</h4>
                                                <span className="text-xs text-gray-400 flex-shrink-0">{notification.time}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Notification Settings */}
                    <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-3">Notification Preferences</h3>
                        <div className="space-y-3">
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🛒</span>
                                    <span className="font-medium text-gray-700">Order Updates</span>
                                </div>
                                <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">🎁</span>
                                    <span className="font-medium text-gray-700">Offers & Promotions</span>
                                </div>
                                <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-600 rounded" />
                            </label>
                            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📰</span>
                                    <span className="font-medium text-gray-700">News & Updates</span>
                                </div>
                                <input type="checkbox" className="w-5 h-5 text-emerald-600 rounded" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}
