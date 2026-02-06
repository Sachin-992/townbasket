import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { shopsApi, ordersApi } from '../lib/api'
import ShopOnboarding from '../components/seller/ShopOnboarding'
import ProductList from '../components/seller/ProductList'
import ProductForm from '../components/seller/ProductForm'
import OrderList from '../components/seller/OrderList'
import ShopEditForm from '../components/seller/ShopEditForm'

export default function SellerDashboard() {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [shop, setShop] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showProductForm, setShowProductForm] = useState(false)
    const [isEditingShop, setIsEditingShop] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [activeTab, setActiveTab] = useState('orders')
    const [stats, setStats] = useState({
        todayOrders: 0,
        todayRevenue: 0,
        upiRevenue: 0,
        codRevenue: 0,
        cancelledOrders: 0,
        moneyToBeSent: 0,
        bestSellers: [],
        busyTime: "6 PM – 8 PM",
        thisWeekRevenue: 0,
        lastWeekRevenue: 0,
        avgRating: 0,
        reviewsCount: 0,
        uniqueCustomers: 0
    })
    const audioRef = useRef(null)
    const [lastOrderTimestamp, setLastOrderTimestamp] = useState(Date.now())

    useEffect(() => {
        if (user?.id) {
            checkShop()
            loadStats()
            // Setup Audio for notifications
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') // Simple ding
        }
    }, [user])

    // Poll for new orders to play sound
    useEffect(() => {
        if (!shop || !user) return

        const interval = setInterval(async () => {
            try {
                const orders = await ordersApi.getSellerOrders(user.id, 'pending')
                if (orders.length > 0) {
                    const latestOrder = new Date(orders[0].created_at).getTime()
                    if (latestOrder > lastOrderTimestamp) {
                        playNotification()
                        setLastOrderTimestamp(latestOrder)
                    }
                }
            } catch (err) {
                console.error("Polling error:", err)
            }
        }, 30000) // Poll every 30 seconds

        return () => clearInterval(interval)
    }, [shop, user, lastOrderTimestamp])

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play blocked", e))
            // Vibration for mobile
            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200])
        }
    }

    const loadStats = async () => {
        if (!user?.id) return
        try {
            const allOrders = await ordersApi.getSellerOrders(user.id)
            const now = new Date()
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
            const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000)
            const twoWeeksAgo = now.getTime() - (14 * 24 * 60 * 60 * 1000)

            // Today's Stats (Revenue should be based on when it was delivered)
            const todayOrdersList = allOrders.filter(o => {
                const createdDate = new Date(o.created_at).getTime()
                return createdDate >= startOfDay
            })

            const deliveredToday = allOrders.filter(o => {
                if (o.status !== 'delivered' || !o.delivered_at) return false
                return new Date(o.delivered_at).getTime() >= startOfDay
            })

            const cancelledToday = todayOrdersList.filter(o => o.status === 'cancelled')

            const todayRevenue = deliveredToday.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
            const upiToday = deliveredToday.filter(o => o.payment_method === 'upi' || o.payment_method === 'online')
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
            const codToday = deliveredToday.filter(o => o.payment_method === 'cod')
                .reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

            // Settlement (All delivered UPI orders not yet settled - simulated as all delivered UPI orders for simplicity)
            const allDeliveredUPI = allOrders.filter(o => (o.status === 'delivered') && (o.payment_method === 'upi' || o.payment_method === 'online'))
            const moneyToBeSent = allDeliveredUPI.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

            // Weekly Comparison
            const thisWeekOrders = allOrders.filter(o => {
                const time = new Date(o.created_at).getTime()
                return time >= oneWeekAgo && o.status === 'delivered'
            })
            const lastWeekOrders = allOrders.filter(o => {
                const time = new Date(o.created_at).getTime()
                return time >= twoWeeksAgo && time < oneWeekAgo && o.status === 'delivered'
            })

            const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)
            const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

            // Best Sellers (Top 3)
            const productSales = {}
            allOrders.filter(o => o.status === 'delivered').forEach(order => {
                order.items?.forEach(item => {
                    const name = item.product_name
                    productSales[name] = (productSales[name] || 0) + item.quantity
                })
            })

            const bestSellers = Object.entries(productSales)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 3)

            // Busy Time (Analyze last 30 days)
            const hourCounts = new Array(24).fill(0)
            allOrders.forEach(o => {
                const hour = new Date(o.created_at).getHours()
                hourCounts[hour]++
            })
            let maxWindow = 0
            let startHour = 18 // Default 6 PM
            for (let i = 0; i < 22; i++) {
                const windowSum = hourCounts[i] + hourCounts[i + 1] + hourCounts[i + 2]
                if (windowSum > maxWindow) {
                    maxWindow = windowSum
                    startHour = i
                }
            }
            const formatHour = (h) => h >= 12 ? `${h === 12 ? 12 : h - 12} PM` : `${h === 0 ? 12 : h} AM`
            const busyTime = `${formatHour(startHour)} – ${formatHour(startHour + 2)}`

            // Unique Customers count
            const uniqueCustomers = new Set(allOrders.map(o => o.customer_phone || o.customer_name)).size

            setStats({
                todayOrders: deliveredToday.length,
                todayRevenue,
                upiRevenue: upiToday,
                codRevenue: codToday,
                cancelledOrders: cancelledToday.length,
                moneyToBeSent,
                bestSellers,
                busyTime,
                thisWeekRevenue,
                lastWeekRevenue,
                avgRating: shop?.average_rating || 0,
                reviewsCount: shop?.total_reviews || 0,
                uniqueCustomers
            })
        } catch (err) {
            console.error('Failed to load real stats:', err)
        }
    }

    const checkShop = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await shopsApi.getMyShop(user.id)
            if (result.hasShop) {
                setShop(result.shop)
                // stats depends on shop/user
                loadStats()
            }
        } catch (err) {
            console.error('Failed to load shop:', err)
            setError(err.message || 'Failed to load shop details')
        } finally {
            setLoading(false)
        }
    }

    const handleShopCreated = (newShop) => setShop(newShop)

    const handleShopUpdated = (updatedShop) => {
        setShop(updatedShop)
        setIsEditingShop(false)
    }

    const handleToggleShop = async () => {
        const confirmMsg = shop.is_open
            ? "Are you sure you want to CLOSE your shop? Customers won't be able to order."
            : "Open shop now? You will start receiving orders."

        if (window.confirm(confirmMsg)) {
            const result = await shopsApi.toggleShopOpen(shop.id)
            setShop(prev => ({ ...prev, is_open: result.is_open }))
        }
    }

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to log out?")) {
            await signOut()
            navigate('/login')
        }
    }

    const handleAddProduct = () => {
        setEditingProduct(null)
        setShowProductForm(true)
    }

    const handleEditProduct = (product) => {
        setEditingProduct(product)
        setShowProductForm(true)
    }

    const handleProductSaved = () => {
        setShowProductForm(false)
        setEditingProduct(null)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10 animate-pulse">
                        <span className="text-3xl text-white">🏪</span>
                    </div>
                    <p className="text-slate-900 font-semibold text-lg tracking-tight">TownBasket</p>
                    <p className="text-slate-500 text-sm">Preparing your workspace...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-12 max-w-md w-full text-center border border-gray-100">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Connection Lost</h2>
                    <p className="text-gray-500 mb-8 font-medium leading-relaxed">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={checkShop}
                            className="bg-emerald-600 text-white w-full h-[56px] rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
                        >
                            Retry Connection
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                        >
                            Log out & Exit
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!shop) return <ShopOnboarding user={user} onShopCreated={handleShopCreated} />

    if (showProductForm) {
        return (
            <div className="min-h-screen bg-gray-50 py-10 px-4">
                <div className="max-w-2xl mx-auto">
                    <ProductForm
                        shop={shop}
                        product={editingProduct}
                        onSave={handleProductSaved}
                        onCancel={() => setShowProductForm(false)}
                    />
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'orders', label: 'Orders', icon: '📋' },
        { id: 'products', label: 'Products', icon: '📦' },
        { id: 'insights', label: 'Insights', icon: '📊' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ]

    return (
        <div className="bg-[#f8fafc] font-display text-slate-900 antialiased min-h-screen">
            {/* Sticky Refined Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Left: Shop Identity */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-12 h-12 bg-[#008a5e] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20 flex-shrink-0 overflow-hidden">
                            {shop.logo_url ? (
                                <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-rounded text-2xl">storefront</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 truncate uppercase">{shop.name}</h1>
                            <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                <span className="material-symbols-rounded text-xs mr-1 text-primary">location_on</span>
                                {shop.town}
                            </div>
                        </div>
                    </div>

                    {/* Center: Search/Indicator */}
                    <div className="hidden lg:flex flex-1 max-w-md mx-8">
                        <div className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-5 flex items-center gap-3 group focus-within:bg-white focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                            <span className="material-symbols-rounded text-slate-300 group-focus-within:text-primary transition-colors">search</span>
                            <input type="text" placeholder="Search orders or items..." className="bg-transparent border-none outline-none text-sm font-semibold w-full placeholder:text-slate-300" />
                        </div>
                    </div>

                    {/* Right: Unified Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleToggleShop}
                            className={`flex-1 md:flex-none h-11 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border active:scale-95 ${shop.is_open
                                ? 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                                : 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${shop.is_open ? 'bg-primary animate-pulse' : 'bg-rose-500'}`}></div>
                            {shop.is_open ? 'SHOP OPEN' : 'CLOSED'}
                        </button>

                        <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                            <button
                                onClick={handleLogout}
                                className="w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                                title="Sign Out"
                            >
                                <span className="material-symbols-rounded">logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav className="bg-white flex justify-around items-end pt-2 px-2 border-b border-slate-200 sticky top-[77px] z-30 md:justify-center md:gap-12">
                {[
                    { id: 'orders', label: 'ORDERS', icon: 'assignment' },
                    { id: 'products', label: 'PRODUCTS', icon: 'inventory_2' },
                    { id: 'insights', label: 'INSIGHTS', icon: 'monitoring' },
                    { id: 'settings', label: 'SETTINGS', icon: 'settings' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-1.5 pb-3 border-b-4 px-4 transition-all ${activeTab === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <span className={`material-symbols-rounded ${activeTab === tab.id ? 'text-primary' : ''}`}>
                            {tab.icon}
                        </span>
                        <span className="text-[10px] font-extrabold tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <main className="p-5 max-w-7xl mx-auto pb-24">
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatsCardSmall
                                icon="package_2"
                                label="TODAY'S ORDERS"
                                value={stats.todayOrders}
                                iconColor="text-amber-600"
                                onClick={() => setActiveTab('insights')}
                            />
                            <StatsCardSmall
                                icon="payments"
                                label="TODAY'S REVENUE"
                                value={`₹${stats.todayRevenue.toLocaleString()}`}
                                iconColor="text-emerald-500"
                                isCurrency
                                onClick={() => setActiveTab('insights')}
                            />
                            <StatsCardSmall
                                icon="star_rate"
                                label="AVG RATING"
                                value={stats.avgRating}
                                iconColor="text-orange-400"
                            />
                            <StatsCardSmall
                                icon="group"
                                label="CUSTOMERS"
                                value={stats.uniqueCustomers}
                                iconColor="text-indigo-500"
                            />
                        </div>

                        {/* Orders List Component */}
                        <OrderList user={user} onNewOrder={playNotification} />
                    </div>
                )}

                {activeTab === 'products' && (
                    <ProductList
                        shop={shop}
                        onAddProduct={handleAddProduct}
                        onEditProduct={handleEditProduct}
                    />
                )}

                {activeTab === 'insights' && (
                    <div className="space-y-6">
                        {/* Reuse the previously built responsive grid but with new styles */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Row 1: Earnings and Payment Split */}
                            <div className="lg:col-span-2">
                                <div className="flex flex-col items-center justify-center rounded-3xl shadow-sm bg-white border border-slate-100 p-8 md:p-12 text-center h-full">
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-1">Today's Earnings</p>
                                    <p className="text-primary text-6xl md:text-7xl font-extrabold leading-tight tracking-tight mb-4 tabular-nums">₹{stats.todayRevenue.toLocaleString()}</p>
                                    <div className="flex items-center gap-2 bg-primary/10 px-6 py-2.5 rounded-full border border-primary/20">
                                        <span className="material-symbols-rounded text-primary text-xl">check_circle</span>
                                        <p className="text-primary text-base md:text-lg font-extrabold whitespace-nowrap">{stats.todayOrders} Orders Completed</p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
                                    <h3 className="text-slate-400 text-[10px] font-bold tracking-widest mb-6 uppercase">Payment Methods</h3>
                                    <div className="space-y-8">
                                        <PaymentProgress
                                            label="UPI"
                                            value={stats.upiRevenue}
                                            total={stats.todayRevenue}
                                            icon="qr_code_2"
                                            color="bg-primary"
                                            iconColor="text-emerald-500"
                                        />
                                        <PaymentProgress
                                            label="Cash"
                                            value={stats.codRevenue}
                                            total={stats.todayRevenue}
                                            icon="payments"
                                            color="bg-slate-400"
                                            iconColor="text-slate-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Reuse other rows with matching styles */}
                            <div className="lg:col-span-1">
                                <div className="flex flex-col gap-4 p-6 rounded-3xl bg-blue-50 border border-blue-100 shadow-sm relative overflow-hidden group h-full">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-rounded text-6xl text-blue-600">account_balance</span>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-1">Settlement Status</p>
                                        <p className="text-blue-900 text-2xl font-black mt-2 tracking-tight">Money to be sent: ₹{stats.moneyToBeSent.toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2 border-t border-blue-200/50 pt-3 mt-auto relative z-10">
                                        <span className="material-symbols-rounded text-blue-600 text-sm">history</span>
                                        <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">Auto-Pay Active</p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-1 grid grid-cols-2 gap-4">
                                <MetricBox label="Delivered" value={stats.todayOrders} color="text-slate-900" />
                                <MetricBox label="Cancelled" value={stats.cancelledOrders} color="text-rose-500" />
                            </div>

                            <div className="lg:col-span-1">
                                <div className="flex items-center gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl h-full">
                                    <span className="material-symbols-rounded text-primary text-4xl">schedule</span>
                                    <div>
                                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Peak Traffic</p>
                                        <p className="text-base font-bold leading-tight">Rush between <span className="text-primary font-black">{stats.busyTime}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {isEditingShop ? (
                            <ShopEditForm
                                shop={shop}
                                onSave={handleShopUpdated}
                                onCancel={() => setIsEditingShop(false)}
                            />
                        ) : (
                            <>
                                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                        <div>
                                            <h2 className="font-extrabold text-slate-900 text-xl tracking-tight mb-1">Shop Profile</h2>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Store identity & contact</p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditingShop(true)}
                                            className="bg-primary/5 text-primary px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all"
                                        >
                                            Edit All
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        <SettingItem icon="storefront" label="Shop Name" value={shop.name} onEdit={() => setIsEditingShop(true)} />
                                        <SettingItem icon="location_on" label="Town / Area" value={shop.town} onEdit={() => setIsEditingShop(true)} />
                                        <SettingItem icon="home" label="Full Address" value={shop.address} onEdit={() => setIsEditingShop(true)} />
                                        <SettingItem icon="call" label="Phone Number" value={shop.phone} onEdit={() => setIsEditingShop(true)} />
                                        <SettingItem icon="schedule" label="Hours" value={`${shop.opening_time || '9:00 AM'} - ${shop.closing_time || '9:00 PM'}`} onEdit={() => setIsEditingShop(true)} />
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 rounded-2xl bg-rose-50 text-rose-600 font-extrabold text-sm hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-rounded">logout</span>
                                    SIGN OUT OF ACCOUNT
                                </button>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

function StatsCardSmall({ icon, label, value, iconColor, isCurrency, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`bg-white p-4 md:p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <span className={`material-symbols-rounded ${iconColor} text-xl`}>{icon}</span>
                <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{label}</span>
            </div>
            <div className="flex items-end justify-between">
                <span className={`text-4xl font-extrabold tracking-tight ${isCurrency ? 'text-primary' : 'text-slate-900'}`}>{value}</span>
                {onClick && <span className="material-symbols-rounded text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LIVE TRACKING</span>
            </div>
        </div>
    )
}

function PaymentProgress({ label, value, total, icon, color, iconColor }) {
    const percentage = total > 0 ? (value / total) * 100 : 0
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-rounded ${iconColor} bg-slate-50 p-1.5 rounded-xl text-xl`}>{icon}</span>
                    <p className="text-sm font-bold text-slate-700">{label}</p>
                </div>
                <p className="text-lg font-extrabold text-slate-900 tabular-nums">₹{value.toLocaleString()}</p>
            </div>
            <div className="h-2.5 rounded-full bg-slate-50 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
            </div>
        </div>
    )
}

function MetricBox({ label, value, color }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{label}</p>
            <p className={`${color} text-3xl font-black tracking-tight`}>{value}</p>
        </div>
    )
}

function SettingItem({ icon, label, value, onEdit }) {
    return (
        <div className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
            <div className="flex items-center gap-4">
                <span className="material-symbols-rounded text-slate-400 text-xl group-hover:text-primary transition-colors">{icon}</span>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-extrabold text-slate-700">{value || 'Not set'}</p>
                </div>
            </div>
            <button
                onClick={onEdit}
                className="text-primary font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
                Edit
            </button>
        </div>
    )
}

