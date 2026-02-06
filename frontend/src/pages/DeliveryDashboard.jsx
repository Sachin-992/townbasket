import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { ordersApi, usersApi } from '../lib/api'

export default function DeliveryDashboard() {
    const { user, signOut } = useAuth()
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeDelivery, setActiveDelivery] = useState(null)
    const [availableRequests, setAvailableRequests] = useState([])
    const [history, setHistory] = useState([])
    const [stats, setStats] = useState({
        today_earnings: 0,
        monthly_earnings: 0,
        completed_count: 0,
        completed_month_count: 0,
        pending_cod: 0
    })
    const [refreshing, setRefreshing] = useState(false)
    const [enrollData, setEnrollData] = useState({
        name: '',
        vehicle_type: 'Bike',
        vehicle_number: '',
        area: ''
    })
    const [submittingEnroll, setSubmittingEnroll] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [reportData, setReportData] = useState({ type: '', description: '' })
    const [activeView, setActiveView] = useState('status') // 'status' or 'log'

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true)
        try {
            // 1. Get Profile (for online status)
            const userData = await usersApi.getCurrentUser(user.id)
            setProfile(userData)

            // 2. Get Active/Available Deliveries
            const activeData = await ordersApi.getDeliveryOrders('my-orders')
            setActiveDelivery(activeData[0] || null)

            const availableData = await ordersApi.getDeliveryOrders('available')
            setAvailableRequests(availableData)

            // 3. Get Stats
            const statsData = await ordersApi.getDeliveryStats()
            setStats(statsData)

            // 4. Get History
            const historyData = await ordersApi.getDeliveryOrders('completed')
            setHistory(historyData)

        } catch (err) {
            console.error('Failed to load delivery dashboard:', err)
            if (err.message === 'User not found') {
                // Proactive sync fallback
                try {
                    await usersApi.syncUser({
                        supabase_uid: user.id,
                        email: user.email,
                        phone: user.phone
                    })
                    // Retry loading data once
                    const userData = await usersApi.getCurrentUser(user.id)
                    setProfile(userData)
                    return loadData(false)
                } catch (syncErr) {
                    setProfile({ error: 'Sync required' })
                }
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [user.id])

    useEffect(() => {
        loadData()
        // Simple polling for new requests every 30 seconds
        const interval = setInterval(() => loadData(false), 30000)
        return () => clearInterval(interval)
    }, [loadData])

    const handleToggleStatus = async () => {
        try {
            const updated = await usersApi.toggleOnlineStatus(user.id)
            setProfile(updated)
        } catch (err) {
            alert('Failed to update status')
        }
    }

    const handleAcceptOrder = async (orderId) => {
        try {
            setRefreshing(true)
            await ordersApi.acceptDelivery(orderId, user.id)
            loadData(false)
        } catch (err) {
            alert(err.message || 'Failed to accept order')
            setRefreshing(false)
        }
    }

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            setRefreshing(true)
            await ordersApi.updateOrderStatus(orderId, newStatus)
            loadData(false)
        } catch (err) {
            alert('Failed to update status')
            setRefreshing(false)
        }
    }

    const handleEnroll = async (e) => {
        e.preventDefault()
        setSubmittingEnroll(true)
        try {
            await usersApi.enrollDeliveryPartner({
                supabase_uid: user.id,
                rider_data: enrollData
            })
            loadData(false)
        } catch (err) {
            alert('Enrollment failed. Please try again.')
        } finally {
            setSubmittingEnroll(false)
        }
    }

    const openMaps = (address) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        window.open(url, '_blank')
    }

    if (profile && !profile.is_enrolled) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 p-8 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-2xl" />

                    <div className="relative z-10 space-y-8">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-rounded text-3xl">assignment_ind</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Partner Enrollment</h2>
                            <p className="text-slate-500 text-sm font-medium">Complete your profile to start receiving assigned delivery tasks.</p>
                        </div>

                        <form onSubmit={handleEnroll} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your legal name"
                                        value={enrollData.name}
                                        onChange={e => setEnrollData({ ...enrollData, name: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Vehicle</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Bike', 'Scooter', 'Cycle', 'Other'].map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setEnrollData({ ...enrollData, vehicle_type: v })}
                                                className={`py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border-2 ${enrollData.vehicle_type === v
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                                                    : 'bg-white text-slate-400 border-slate-50 hover:border-slate-100 shadow-sm'
                                                    }`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vehicle Number</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. TN-01-AB-1234"
                                        value={enrollData.vehicle_number}
                                        onChange={e => setEnrollData({ ...enrollData, vehicle_number: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-1.5 px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Area / Town</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter your town name"
                                        value={enrollData.area}
                                        onChange={e => setEnrollData({ ...enrollData, area: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submittingEnroll}
                                className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-[2rem] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submittingEnroll ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Complete Enrollment'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )
    }

    if (profile?.error === 'Sync required') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
                    <span className="material-symbols-rounded text-4xl">sync_problem</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Account Sync Required</h2>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">Your profile wasn't found in our local database. Please log out and log in again to sync your account.</p>
                </div>
                <button
                    onClick={() => signOut()}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    Log Out & Re-sync
                </button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Connecting to TownBasket...</p>
            </div>
        )
    }

    return (
        <div className="bg-[#f8fafc] min-h-screen font-display antialiased text-slate-900 pb-20">
            {/* STICKY HEADER */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 transition-all">
                <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                            <span className="material-symbols-rounded text-xl">delivery_dining</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-slate-900 truncate uppercase tracking-tight">{profile?.name || 'Partner'}</h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Delivery Partner</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleToggleStatus}
                            className={`h-9 px-4 rounded-full font-black text-[9px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 border active:scale-95 ${profile?.is_online
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${profile?.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                            {profile?.is_online ? 'ONLINE' : 'OFFLINE'}
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-rounded text-lg">logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* STATUS VIEW (Main Dashboard) */}
            {activeView === 'status' && (
                <main className="max-w-7xl mx-auto p-5 space-y-8">
                    {/* 1. ACTIVE DELIVERY (TOP PRIORITY) */}
                    {activeDelivery && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Active Delivery</h2>
                                <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                    <span className="material-symbols-rounded text-sm animate-bounce">location_on</span>
                                    In Progress
                                </div>
                            </div>

                            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden group">
                                <div className="p-6 md:p-8 space-y-8">
                                    {/* Pickup Source */}
                                    <div className="flex gap-4 relative">
                                        <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-dotted bg-slate-200 border-l border-dashed h-24 ml-[-0.25px]" />
                                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-100 z-10">
                                            <span className="material-symbols-rounded">storefront</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pick up from</p>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">{activeDelivery.shop_name}</h3>
                                            <p className="text-sm font-bold text-slate-500 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">{activeDelivery.shop_address}</p>
                                            <div className="flex gap-2 mt-3 flex-wrap">
                                                <button
                                                    onClick={() => openMaps(activeDelivery.shop_address)}
                                                    className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                                                >
                                                    <span className="material-symbols-rounded text-sm">directions</span> Directions
                                                </button>
                                                {activeDelivery.shop_phone && (
                                                    <a
                                                        href={`tel:${activeDelivery.shop_phone}`}
                                                        className="flex items-center gap-2 text-purple-600 text-[10px] font-black uppercase tracking-widest bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">call</span> Call Shop
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery Destination */}
                                    <div className="flex gap-4 pt-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                                            <span className="material-symbols-rounded">person_pin_circle</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deliver to</p>
                                            <h3 className="text-lg font-black text-slate-900 leading-tight">{activeDelivery.customer_name}</h3>
                                            <p className="text-sm font-bold text-slate-500 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">{activeDelivery.delivery_address}</p>
                                            <div className="flex gap-2 mt-3 flex-wrap">
                                                <button
                                                    onClick={() => openMaps(activeDelivery.delivery_address)}
                                                    className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                                                >
                                                    <span className="material-symbols-rounded text-sm">map</span> Navigate
                                                </button>
                                                {activeDelivery.customer_phone && (
                                                    <a
                                                        href={`tel:${activeDelivery.customer_phone}`}
                                                        className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <span className="material-symbols-rounded text-sm">call</span> Call Customer
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Items Preview */}
                                    {activeDelivery.items && activeDelivery.items.length > 0 && (
                                        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span className="material-symbols-rounded text-sm">inventory_2</span>
                                                Order Items ({activeDelivery.items.length})
                                            </p>
                                            <div className="space-y-2">
                                                {activeDelivery.items.slice(0, 4).map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 text-sm">
                                                        <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center font-black text-xs">{item.quantity}</span>
                                                        <span className="font-bold text-slate-700 truncate">{item.product_name}</span>
                                                    </div>
                                                ))}
                                                {activeDelivery.items.length > 4 && (
                                                    <p className="text-xs font-bold text-amber-600 pl-9">+{activeDelivery.items.length - 4} more items</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Info */}
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Payment Mode</p>
                                            <p className={`text-sm font-black uppercase ${activeDelivery.payment_method === 'cod' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {activeDelivery.payment_method === 'cod' ? '💵 Cash on Delivery' : '💳 Already Paid'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Collect Amount</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tight">₹{activeDelivery.total}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Header */}
                                <div className="bg-slate-900 p-6 flex flex-col sm:flex-row gap-4">
                                    {activeDelivery.status === 'ready' && (
                                        <button
                                            onClick={() => handleUpdateStatus(activeDelivery.id, 'out_for_delivery')}
                                            disabled={refreshing}
                                            className="w-full bg-emerald-500 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                                        >
                                            {refreshing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-rounded">check_circle</span> Start Delivery</>}
                                        </button>
                                    )}
                                    {activeDelivery.status === 'out_for_delivery' && (
                                        <button
                                            onClick={() => handleUpdateStatus(activeDelivery.id, 'delivered')}
                                            disabled={refreshing}
                                            className="w-full bg-emerald-500 text-white font-black text-sm py-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                                        >
                                            {refreshing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><span className="material-symbols-rounded">verified</span> Mark Delivered</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Grid Layout for Stats and Requests on Desktop */}
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* 2. STATS & EARNINGS (LEFT) */}
                        <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
                            <section className="space-y-4">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Financial Radar</h2>
                                <div className="grid gap-5">
                                    {/* Monthly Earnings Card - Premium Dark Design */}
                                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl shadow-slate-300 overflow-hidden relative group transition-all hover:scale-[1.02]">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-emerald-500/30 transition-all duration-500" />
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-2xl" />

                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-6">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Revenue</p>
                                                <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                                                    <span className="material-symbols-rounded text-emerald-400 text-sm">payments</span>
                                                </div>
                                            </div>
                                            <p className="text-5xl font-black tracking-tighter mb-2">₹{stats.monthly_earnings.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest mb-8 flex items-center gap-1">
                                                <span className="material-symbols-rounded text-xs">trending_up</span> +12% from last month
                                            </p>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Trips</p>
                                                    <p className="text-xl font-black">{stats.completed_month_count}</p>
                                                </div>
                                                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10 backdrop-blur-sm">
                                                    <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest mb-1">Avg/Order</p>
                                                    <p className="text-xl font-black text-emerald-400">₹{(stats.monthly_earnings / (stats.completed_month_count || 1)).toFixed(0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Today's Earnings Card - Vibrant Emerald */}
                                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-8 rounded-[3rem] text-white shadow-xl shadow-emerald-200 relative overflow-hidden group transition-all hover:shadow-2xl">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100 mb-1 leading-none">Today's Wallet</p>
                                        <p className="text-4xl font-black tracking-tighter mb-6 underline decoration-emerald-300/30 underline-offset-8">₹{stats.today_earnings.toLocaleString()}</p>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-100">Daily Goal</p>
                                                <p className="text-[10px] font-black">75%</p>
                                            </div>
                                            <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-white rounded-full w-3/4 shadow-[0_0_15px_white]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center group hover:border-emerald-200 hover:shadow-lg transition-all">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 mb-3 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                                <span className="material-symbols-rounded text-sm">route</span>
                                            </div>
                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 leading-none">Today missions</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">{stats.completed_count}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center group hover:border-rose-200 hover:shadow-lg transition-all">
                                            <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-400 mb-3">
                                                <span className="material-symbols-rounded text-sm">account_balance_wallet</span>
                                            </div>
                                            <p className="text-rose-400 text-[9px] font-black uppercase tracking-widest mb-1 leading-none">Cash in pocket</p>
                                            <p className="text-2xl font-black text-rose-500 tracking-tight">₹{stats.pending_cod}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Recent History */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1">Recent Missions</h3>
                                <div className="space-y-3">
                                    {history.length === 0 ? (
                                        <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl py-10 px-6 text-center">
                                            <span className="material-symbols-rounded text-slate-200 text-4xl mb-2">history</span>
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest uppercase tracking-widest leading-relaxed">No missions completed today</p>
                                        </div>
                                    ) : (
                                        history.slice(0, 5).map(h => (
                                            <div key={h.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                                        <span className="material-symbols-rounded text-sm">task_alt</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-black text-slate-900 uppercase truncate">#{h.order_number}</p>
                                                        <p className="text-[9px] font-bold text-slate-400">{new Date(h.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-black text-slate-900 tracking-tight shrink-0">₹{h.delivery_fee > 0 ? h.delivery_fee : 15}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* 3. NEW REQUESTS (RIGHT) */}
                        <div className="lg:col-span-8 space-y-4 order-1 lg:order-2">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">New Feed</h2>
                                <button onClick={() => { setRefreshing(true); loadData(false); }} className={`p-2 text-slate-400 transition-all ${refreshing ? 'animate-spin text-emerald-500' : ''}`}>
                                    <span className="material-symbols-rounded text-lg">sync</span>
                                </button>
                            </div>

                            {availableRequests.length === 0 ? (
                                <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-20 px-10 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                        <span className="material-symbols-rounded text-3xl text-emerald-500 animate-pulse">radar</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Scanning for requests...</h3>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-xs leading-relaxed">
                                        {profile?.is_online ? "No available tasks in your area right now. Keep this screen open." : "Go online to start receiving delivery requests."}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {availableRequests.map(req => (
                                        <div key={req.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xl hover:shadow-emerald-900/5 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />

                                            <div className="relative">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black tracking-[0.1em] uppercase border border-emerald-100">
                                                        ₹{req.delivery_fee > 0 ? req.delivery_fee : 15} Earnings
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-300 uppercase">#{req.order_number}</p>
                                                </div>
                                                <h4 className="text-md font-black text-slate-900 mb-1">{req.shop_name}</h4>
                                                <div className="flex items-center text-slate-400 mb-6">
                                                    <span className="material-symbols-rounded text-xs mr-1">location_on</span>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">{req.delivery_area || req.delivery_town}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleAcceptOrder(req.id)}
                                                disabled={!profile?.is_online || refreshing}
                                                className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all active:scale-95 ${profile?.is_online
                                                    ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
                                                    : 'bg-slate-100 text-slate-300 border-transparent shadow-none cursor-not-allowed'
                                                    }`}
                                            >
                                                {refreshing ? 'Processing...' : 'Accept Task'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            )}

            {/* LOG VIEW (Mobile) */}
            {activeView === 'log' && (
                <main className="max-w-7xl mx-auto p-5 pb-24 lg:hidden">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Delivery History</h2>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{history.length} Total</span>
                        </div>

                        {history.length === 0 ? (
                            <div className="bg-white rounded-[2rem] p-8 text-center border border-slate-100">
                                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-rounded text-3xl text-slate-300">history</span>
                                </div>
                                <p className="font-bold text-slate-900">No deliveries yet</p>
                                <p className="text-sm text-slate-500 mt-1">Your completed deliveries will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map(order => (
                                    <div key={order.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${order.status === 'delivered'
                                                        ? 'bg-emerald-100 text-emerald-600'
                                                        : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(order.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-slate-900 truncate">{order.shop_name}</p>
                                                <p className="text-sm text-slate-500 truncate">{order.customer_name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-900">₹{order.total}</p>
                                                <p className={`text-[9px] font-bold uppercase ${order.payment_method === 'cod' ? 'text-amber-500' : 'text-emerald-500'
                                                    }`}>
                                                    {order.payment_method === 'cod' ? 'COD' : 'PAID'}
                                                </p>
                                            </div>
                                        </div>
                                        {order.items && order.items.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                    {order.items.length} item{order.items.length > 1 ? 's' : ''} delivered
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            )}

            {/* Floating Report Issue Button */}
            {activeDelivery && (
                <button
                    onClick={() => setShowReportModal(true)}
                    className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200 flex items-center justify-center active:scale-95 transition-transform z-40"
                >
                    <span className="material-symbols-rounded text-xl">flag</span>
                </button>
            )}

            {/* Report Issue Modal */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowReportModal(false)}>
                    <div
                        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl pb-8 sm:pb-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
                        </div>

                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">Report an Issue</h3>
                                <p className="text-slate-500 text-sm">Order #{activeDelivery?.order_number}</p>
                            </div>
                            <button
                                onClick={() => setShowReportModal(false)}
                                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"
                            >
                                <span className="material-symbols-rounded text-slate-600">close</span>
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Issue Type</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { type: 'wrong_address', label: 'Wrong Address', icon: '📍' },
                                    { type: 'customer_unavailable', label: 'Customer Unavailable', icon: '🚫' },
                                    { type: 'payment_issue', label: 'Payment Issue', icon: '💳' },
                                    { type: 'damaged_items', label: 'Damaged Items', icon: '📦' },
                                    { type: 'traffic_delay', label: 'Traffic Delay', icon: '🚗' },
                                    { type: 'other', label: 'Other', icon: '❓' },
                                ].map(item => (
                                    <button
                                        key={item.type}
                                        onClick={() => setReportData({ ...reportData, type: item.type })}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${reportData.type === item.type
                                            ? 'border-rose-500 bg-rose-50'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                            }`}
                                    >
                                        <span className="text-2xl">{item.icon}</span>
                                        <p className={`text-xs font-bold mt-2 ${reportData.type === item.type ? 'text-rose-600' : 'text-slate-600'
                                            }`}>{item.label}</p>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Notes</label>
                                <textarea
                                    placeholder="Describe the issue briefly..."
                                    value={reportData.description}
                                    onChange={e => setReportData({ ...reportData, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-50 rounded-xl p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                                />
                            </div>

                            <button
                                onClick={() => {
                                    // TODO: Submit report to backend
                                    alert(`Issue reported: ${reportData.type}\n${reportData.description}`)
                                    setShowReportModal(false)
                                    setReportData({ type: '', description: '' })
                                }}
                                disabled={!reportData.type}
                                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                            >
                                Submit Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK ACTIONS TAB BAR (MOBILE ONLY) */}
            <nav className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-md border-t border-slate-100 px-6 py-4 flex lg:hidden items-center justify-between z-50">
                <button
                    onClick={() => setActiveView('status')}
                    className="flex-1 flex flex-col items-center"
                >
                    <span className={`material-symbols-rounded ${activeView === 'status' ? 'text-emerald-600' : 'text-slate-300'}`}>home</span>
                    <span className={`text-[8px] font-black uppercase mt-1 ${activeView === 'status' ? 'text-emerald-600' : 'text-slate-400'}`}>Status</span>
                </button>
                <button
                    onClick={loadData}
                    className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-xl shadow-slate-900/20 -mt-14 border-[6px] border-[#f8fafc] active:scale-95 transition-transform"
                >
                    <span className="material-symbols-rounded text-2xl">refresh</span>
                </button>
                <button
                    onClick={() => setActiveView('log')}
                    className="flex-1 flex flex-col items-center"
                >
                    <span className={`material-symbols-rounded ${activeView === 'log' ? 'text-emerald-600' : 'text-slate-300'}`}>history</span>
                    <span className={`text-[8px] font-black uppercase mt-1 ${activeView === 'log' ? 'text-emerald-600' : 'text-slate-400'}`}>Log</span>
                </button>
            </nav>
        </div>
    )
}
