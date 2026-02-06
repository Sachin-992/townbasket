import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shopsApi, ordersApi, complaintsApi } from '../lib/api'

export default function AdminDashboard() {
    const { signOut, user } = useAuth()
    const [activeTab, setActiveTab] = useState('pending')
    const [filter, setFilter] = useState('all') // 'all' | 'today'
    const [pendingShops, setPendingShops] = useState([])
    const [allShops, setAllShops] = useState([])
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [stats, setStats] = useState({
        totalShops: 0,
        pendingShops: 0,
        totalOrders: 0,
        todayOrders: 0,
        pendingComplaints: 0,
    })

    useEffect(() => {
        loadStats()
        loadTabContent()
    }, [activeTab])

    // Close sidebar when tab changes (mobile UX)
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [activeTab])

    const loadStats = async () => {
        try {
            const data = await shopsApi.getAdminStats()
            if (data && !data.error) {
                setStats(prev => ({ ...prev, ...data }))
            }
            // Also load pending complaints count
            const complaints = await complaintsApi.getAllComplaints('pending')
            if (Array.isArray(complaints)) {
                setStats(prev => ({ ...prev, pendingComplaints: complaints.length }))
            }
        } catch (err) {
            console.error('Error loading stats:', err)
        }
    }

    const loadTabContent = async () => {
        setLoading(true)
        try {
            if (activeTab === 'pending') {
                const data = await shopsApi.getPendingShops()
                setPendingShops(Array.isArray(data) ? data : [])
            } else if (activeTab === 'shops') {
                const data = await shopsApi.getAllShops()
                setAllShops(Array.isArray(data) ? data : [])
            } else if (activeTab === 'orders') {
                const data = await ordersApi.getAllOrders()
                setOrders(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (shopId) => {
        await shopsApi.approveShop(shopId)
        loadStats()
        loadTabContent()
    }

    const handleReject = async (shopId) => {
        if (window.confirm('Are you sure you want to reject this shop?')) {
            await shopsApi.rejectShop(shopId)
            loadStats()
            loadTabContent()
        }
    }

    const handleLogout = async () => {
        await signOut()
        window.location.href = '/login'
    }

    const tabs = [
        { id: 'pending', label: 'Pending Approvals', icon: '⏳' },
        { id: 'shops', label: 'All Shops', icon: '🏪' },
        { id: 'orders', label: 'All Orders', icon: '📦' },
        { id: 'complaints', label: 'Complaints', icon: '🚨', link: '/admin/complaints' },
    ]

    const getFilteredOrders = () => {
        if (filter === 'today') {
            const today = new Date().toDateString()
            return orders.filter(order => new Date(order.created_at).toDateString() === today)
        }
        return orders
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-20 flex items-center justify-between p-4 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">A</div>
                    <span className="font-bold">Admin Panel</span>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                </button>
            </div>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 hidden md:block">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/30">
                            A
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-wide">Admin Panel</h1>
                            <p className="text-xs text-slate-400">TownBasket</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-b border-slate-800 md:hidden flex justify-between items-center">
                    <span className="font-bold text-lg">Menu</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="p-2">✕</button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {tabs.map((tab) => (
                        tab.link ? (
                            <Link
                                key={tab.id}
                                to={tab.link}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span className="font-medium">{tab.label}</span>
                                {stats.pendingComplaints > 0 && (
                                    <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {stats.pendingComplaints}
                                    </span>
                                )}
                            </Link>
                        ) : (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id)
                                    setFilter('all')
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">{tab.icon}</span>
                                <span className="font-medium">{tab.label}</span>
                                {tab.id === 'pending' && stats.pendingShops > 0 && (
                                    <span className="ml-auto bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {stats.pendingShops}
                                    </span>
                                )}
                            </button>
                        )
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <span>🚪</span>
                        <span className="font-medium">Logout</span>
                    </button>
                    <p className="text-center text-xs text-slate-600 mt-4">
                        Logged in as {user?.email}
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
                <header className="bg-white shadow-sm p-4 md:p-8 md:pb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                    <p className="text-sm md:text-base text-gray-500">Welcome back, Administrator.</p>
                </header>

                <div className="p-4 md:p-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
                        <StatCard
                            title="Total Shops"
                            value={stats.totalShops}
                            icon="🏪"
                            color="bg-indigo-500"
                            onClick={() => { setActiveTab('shops'); setFilter('all') }}
                            isActive={activeTab === 'shops'}
                        />
                        <StatCard
                            title="Pending"
                            value={stats.pendingShops}
                            icon="⏳"
                            color="bg-amber-500"
                            onClick={() => { setActiveTab('pending'); setFilter('all') }}
                            isActive={activeTab === 'pending'}
                        />
                        <StatCard
                            title="Total Orders"
                            value={stats.totalOrders}
                            icon="📦"
                            color="bg-emerald-500"
                            onClick={() => { setActiveTab('orders'); setFilter('all') }}
                            isActive={activeTab === 'orders' && filter === 'all'}
                        />
                        <StatCard
                            title="Today's Orders"
                            value={stats.todayOrders}
                            icon="📅"
                            color="bg-blue-500"
                            onClick={() => { setActiveTab('orders'); setFilter('today') }}
                            isActive={activeTab === 'orders' && filter === 'today'}
                        />
                    </div>

                    {/* Content Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">
                                {activeTab === 'orders' && filter === 'today' ? "Today's Orders" : tabs.find(t => t.id === activeTab)?.label}
                            </h3>
                            {loading && <span className="text-indigo-600 text-sm animate-pulse">Refreshing data...</span>}
                        </div>

                        <div className="p-6">
                            {loading && !pendingShops.length && !allShops.length && !orders.length ? (
                                <div className="py-20 text-center text-gray-400">
                                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                                    Loading...
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'pending' && (
                                        <PendingShopsList
                                            shops={pendingShops}
                                            onApprove={handleApprove}
                                            onReject={handleReject}
                                        />
                                    )}
                                    {activeTab === 'shops' && <AllShopsList shops={allShops} />}
                                    {activeTab === 'orders' && <OrdersList orders={getFilteredOrders()} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

function StatCard({ title, value, icon, color, onClick, isActive }) {
    return (
        <div
            onClick={onClick}
            className={`
                bg-white p-3 md:p-6 rounded-2xl shadow-sm border transition-all cursor-pointer h-full active:scale-95 touch-manipulation flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4
                ${isActive ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10' : 'border-gray-100 hover:shadow-md hover:border-indigo-200 hover:scale-[1.02]'}
            `}
        >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl text-white shadow-lg ${color} ${isActive ? 'scale-110' : ''} transition-transform`}>
                {icon}
            </div>
            <div>
                <p className={`text-xs md:text-sm font-medium truncate ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>{title}</p>
                <p className="text-xl md:text-2xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    )
}

function PendingShopsList({ shops, onApprove, onReject }) {
    if (shops.length === 0) return <EmptyState message="No pending approvals. great job! 🎉" />

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
                <div key={shop.id} className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
                            🏪
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wide">
                            Pending
                        </span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{shop.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{shop.category_name} • {shop.town}</p>

                    <div className="space-y-2 mb-6">
                        <InfoRow icon="👤" text={shop.owner_name} />
                        <InfoRow icon="📞" text={shop.phone} />
                        <InfoRow icon="📍" text={shop.address} />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onApprove(shop.id)}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => onReject(shop.id)}
                            className="flex-1 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

function AllShopsList({ shops }) {
    if (shops.length === 0) return <EmptyState message="No shops found." />

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="p-4">Shop Name</th>
                            <th className="p-4">Owner</th>
                            <th className="p-4">Town</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {shops.map((shop) => (
                            <tr key={shop.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-medium text-gray-900">{shop.name}</td>
                                <td className="p-4 text-gray-500">{shop.owner_name}</td>
                                <td className="p-4 text-gray-500">{shop.town}</td>
                                <td className="p-4">
                                    <StatusBadge status={shop.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {shops.map((shop) => (
                    <div key={shop.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-900">{shop.name}</h3>
                            <StatusBadge status={shop.status} />
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                            <p>👤 {shop.owner_name}</p>
                            <p>📍 {shop.town}</p>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

function OrdersList({ orders }) {
    if (orders.length === 0) return <EmptyState message="No orders yet." />

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Customer</th>
                            <th className="p-4">Shop</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50">
                                <td className="p-4 font-medium text-indigo-600">#{order.order_number || order.id}</td>
                                <td className="p-4 text-gray-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                                <td className="p-4 text-gray-600">{order.customer_name}</td>
                                <td className="p-4 text-gray-600">{order.shop_name}</td>
                                <td className="p-4 font-bold text-gray-800">₹{order.total}</td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600`}>
                                        {order.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {orders.map((order) => (
                    <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="font-bold text-indigo-600 block">#{order.order_number || order.id}</span>
                                <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <p>👤 {order.customer_name}</p>
                            <p>🏪 {order.shop_name}</p>
                        </div>
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Total Amount</span>
                            <span className="font-bold text-gray-900">₹{order.total}</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}

function InfoRow({ icon, text }) {
    return (
        <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-gray-400">{icon}</span>
            <span className="truncate">{text}</span>
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = {
        approved: 'bg-emerald-100 text-emerald-700',
        pending: 'bg-amber-100 text-amber-700',
        rejected: 'bg-rose-100 text-rose-700',
    }
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}
        </span>
    )
}

function EmptyState({ message }) {
    return (
        <div className="text-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <div className="text-4xl mb-4 opacity-20">📂</div>
            <p className="text-gray-500 font-medium">{message}</p>
        </div>
    )
}
