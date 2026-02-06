import { useState, useEffect } from 'react'
import { ordersApi } from '../../lib/api'

export default function AdminOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('today') // 'today' | 'history'

    // Stats
    const [stats, setStats] = useState({ count: 0, total: 0 })

    useEffect(() => {
        loadOrders()
    }, [])

    useEffect(() => {
        if (!loading) {
            calculateStats()
        }
    }, [activeTab, orders, loading])

    const loadOrders = async () => {
        setLoading(true)
        try {
            const data = await ordersApi.getAllOrders()
            const ordersList = Array.isArray(data) ? data : []
            setOrders(ordersList)
        } catch (err) {
            console.error('Error loading orders:', err)
        } finally {
            setLoading(false)
        }
    }

    const getFilteredOrders = () => {
        const today = new Date().toDateString()
        if (activeTab === 'today') {
            return orders.filter(o => new Date(o.created_at).toDateString() === today)
        } else {
            // History = anything NOT today
            return orders.filter(o => new Date(o.created_at).toDateString() !== today)
        }
    }

    const calculateStats = () => {
        const displayed = getFilteredOrders()

        const totalRevenue = displayed.reduce((sum, order) => {
            const val = parseFloat(order.total) || 0
            return sum + val
        }, 0)

        setStats({
            count: displayed.length,
            total: totalRevenue
        })
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const StatusBadge = ({ status }) => {
        const colors = {
            pending: 'bg-amber-100 text-amber-700',
            confirmed: 'bg-blue-100 text-blue-700',
            preparing: 'bg-indigo-100 text-indigo-700',
            ready: 'bg-purple-100 text-purple-700',
            out_for_delivery: 'bg-orange-100 text-orange-700',
            delivered: 'bg-emerald-100 text-emerald-700',
            cancelled: 'bg-rose-100 text-rose-700'
        }

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
                {status.replace(/_/g, ' ')}
            </span>
        )
    }

    const displayedOrders = getFilteredOrders()

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-500">Track and monitor all town orders.</p>
                </div>

                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'today'
                            ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history'
                            ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        History
                    </button>
                </div>
            </header>

            {/* Dynamic Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className={`p-6 rounded-2xl text-white shadow-lg relative overflow-hidden transition-colors duration-300 ${activeTab === 'today'
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-indigo-200'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 shadow-gray-200'
                    }`}>
                    <div className="relative z-10">
                        <p className={`font-medium text-sm uppercase tracking-wide mb-1 ${activeTab === 'today' ? 'text-indigo-100' : 'text-gray-300'}`}>
                            {activeTab === 'today' ? 'Total Orders Today' : 'Total Past Orders'}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">{stats.count}</span>
                            <span className={`text-sm ${activeTab === 'today' ? 'text-indigo-200' : 'text-gray-400'}`}>orders</span>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                        <span className="text-9xl">📦</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-gray-500 font-medium text-sm uppercase tracking-wide mb-1">
                            {activeTab === 'today' ? "Today's Revenue" : "Historical Revenue"}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gray-900">₹{stats.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-5">
                        <span className="text-6xl">💰</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    Loading Data...
                </div>
            ) : (
                <>
                    {displayedOrders.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <span className="text-4xl block mb-4">✨</span>
                            <p className="text-gray-500">No {activeTab === 'today' ? "orders found for today" : "order history found"}.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedOrders.map((order) => (
                                <div key={order.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs text-gray-400 font-medium mb-1">
                                                Order #{order.order_number || order.id} • {formatDate(order.created_at)}
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-lg">
                                                ₹{order.total}
                                            </h3>
                                        </div>
                                        <StatusBadge status={order.status} />
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                                                👤
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{order.customer_name}</p>
                                                <p className="text-xs text-gray-500">{order.customer_phone}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                                                🏪
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{order.shop_name}</p>
                                                <p className="text-xs text-gray-500">Shop ID: {order.shop}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
