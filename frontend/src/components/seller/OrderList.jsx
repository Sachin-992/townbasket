import { useState, useEffect } from 'react'
import { ordersApi } from '../../lib/api'
import RiderAssignmentModal from './RiderAssignmentModal'

export default function OrderList({ user }) {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('pending')
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

    useEffect(() => {
        loadOrders()
    }, [user.id, activeTab])

    const loadOrders = async () => {
        setLoading(true)
        try {
            let data = []
            if (activeTab === 'all') {
                data = await ordersApi.getSellerOrders(user.id)
            } else if (activeTab === 'dispatched') {
                data = await ordersApi.getSellerOrders(user.id, 'out_for_delivery')
            } else {
                data = await ordersApi.getSellerOrders(user.id, activeTab)
            }
            setOrders(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load orders:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (orderId, newStatus) => {
        await ordersApi.updateOrderStatus(orderId, newStatus)
        loadOrders()
    }

    const tabs = [
        { id: 'pending', label: 'New Orders', icon: '🛎️' },
        { id: 'confirmed', label: 'Accepted', icon: '✅' },
        { id: 'preparing', label: 'Preparing', icon: '🍳' },
        { id: 'ready', label: 'Ready', icon: '🥡' },
        { id: 'dispatched', label: 'Dispatched', icon: '🚚' },
        { id: 'all', label: 'Previous', icon: '📜' },
    ]

    const getStatusActions = (status) => {
        switch (status) {
            case 'pending':
                return [
                    { status: 'confirmed', label: 'ACCEPT ORDER', variant: 'success' },
                    { status: 'cancelled', label: 'Reject', variant: 'danger' },
                ]
            case 'confirmed':
                return [{ status: 'preparing', label: 'START PREPARING', variant: 'primary' }]
            case 'preparing':
                return [
                    { status: 'assign', label: 'ASSIGN RIDER', variant: 'primary' },
                    { status: 'ready', label: 'MARK AS READY', variant: 'success' }
                ]
            case 'ready':
                return [
                    { status: 'assign', label: 'RE-ASSIGN RIDER', variant: 'primary' },
                    { status: 'out_for_delivery', label: 'HAND OVER TO RIDER', variant: 'primary' },
                    { status: 'delivered', label: 'SELF DELIVERED', variant: 'success' }
                ]
            case 'out_for_delivery':
                return [{ status: 'delivered', label: 'MARK AS DELIVERED', variant: 'success' }]
            default:
                return []
        }
    }

    const handleAction = async (orderId, newStatus) => {
        if (newStatus === 'cancelled') {
            const reason = window.prompt("Why are you rejecting this order? (Simple reason for customer)")
            if (!reason) return
            await ordersApi.updateOrderStatus(orderId, newStatus, reason)
        } else if (newStatus === 'assign') {
            const order = orders.find(o => o.id === orderId)
            setSelectedOrder(order)
            setIsAssignModalOpen(true)
        } else {
            await handleStatusUpdate(orderId, newStatus)
        }
    }

    return (
        <div className="space-y-6">
            {/* Scrollable Status Filters */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar scrollbar-hide -mx-5 px-5 py-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 px-5 py-3 rounded-full flex items-center gap-2 font-extrabold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                            : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <span className={`material-symbols-rounded text-lg ${activeTab === tab.id ? 'text-white' : tab.iconColor}`}>
                            {tab.icon}
                        </span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-6 animate-pulse">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white rounded-[2.5rem] h-64 border border-slate-100" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                /* Empty State from Design */
                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 py-20 px-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-rounded text-5xl text-slate-300">assignment_late</span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">No orders here</h2>
                    <p className="text-slate-500 font-medium leading-relaxed max-w-xs">
                        New orders will appear here automatically as soon as customers place them.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 transition-all relative overflow-hidden ${order.status === 'pending' ? 'ring-2 ring-primary ring-offset-2' : ''
                                }`}
                        >
                            {/* Header Row */}
                            <div className="p-6 md:p-8 border-b border-slate-50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                                            <span className="material-symbols-rounded text-slate-400">package_2</span>
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-900 text-xl tracking-tight leading-none mb-1">#{order.order_number}</p>
                                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                                {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • Today
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {order.delivery_supabase_uid && (
                                            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                                <span className="material-symbols-rounded text-emerald-600 text-sm">delivery_dining</span>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                                    {order.delivery_partner_name || 'Partner Assigned'}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-primary text-sm">
                                                {order.customer_name?.[0] || 'C'}
                                            </div>
                                            <div className="pr-2">
                                                <p className="font-extrabold text-slate-900 text-xs leading-none mb-1">{order.customer_name}</p>
                                                <p className="text-slate-400 font-bold text-[10px] tabular-nums">{order.customer_phone}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Manifest List */}
                                <div className="space-y-3">
                                    {order.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 bg-white text-primary rounded-lg flex items-center justify-center font-black text-xs border border-slate-100 shadow-sm">
                                                    {item.quantity}
                                                </span>
                                                <span className="font-extrabold text-slate-700 text-sm tracking-tight">{item.product_name}</span>
                                            </div>
                                            <span className="font-black text-slate-900 text-sm tracking-tight">₹{item.total_price}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer Row */}
                            <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex flex-col items-center sm:items-start">
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-1">TOTAL AMOUNT</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{order.total}</p>
                                </div>

                                <div className="flex gap-3 w-full sm:w-auto">
                                    {getStatusActions(order.status).map((action) => (
                                        <button
                                            key={action.status}
                                            onClick={() => handleAction(order.id, action.status)}
                                            className={`flex-1 sm:flex-none px-8 py-3.5 rounded-2xl font-extrabold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${action.variant === 'success'
                                                ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                                                : action.variant === 'danger'
                                                    ? 'bg-white border border-rose-200 text-rose-500 hover:bg-rose-50'
                                                    : 'bg-slate-900 text-white shadow-slate-200 hover:bg-slate-800'
                                                }`}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedOrder && (
                <RiderAssignmentModal
                    order={selectedOrder}
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssigned={loadOrders}
                />
            )}
        </div>
    )
}
