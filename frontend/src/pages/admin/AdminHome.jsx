import { useState, useEffect } from 'react'
import { shopsApi } from '../../lib/api' // We might need to create more specific APIs later

export default function AdminHome() {
    const [stats, setStats] = useState({
        totalShops: 0,
        pendingShops: 0,
        totalOrders: 0,
        todayOrders: 0,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            const data = await shopsApi.getAdminStats()
            if (data && !data.error) {
                setStats(data)
            }
        } catch (err) {
            console.error('Error loading stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const StatCard = ({ title, value, icon, color, subtext }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl text-white shadow-lg ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-gray-900">{loading ? '-' : value}</h3>
                    {subtext && <span className="text-xs font-medium text-gray-400">{subtext}</span>}
                </div>
            </div>
        </div>
    )

    return (
        <div className="p-4 md:p-8 space-y-8">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Town Status</h1>
                <p className="text-gray-500">Real-time overview of your town's health.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Orders"
                    value={stats.todayOrders}
                    icon="📅"
                    color="bg-blue-500"
                    subtext="orders placed today"
                />
                <StatCard
                    title="Active Sellers"
                    value={stats.totalShops}
                    icon="🏪"
                    color="bg-indigo-500"
                    subtext="approved shops"
                />
                <StatCard
                    title="Pending Complaints"
                    value="0"
                    icon="⚠️"
                    color="bg-rose-500"
                    subtext="need attention"
                />
                <StatCard
                    title="Active Delivery"
                    value="0"
                    icon="🛵"
                    color="bg-emerald-500"
                    subtext="partners online"
                />
            </div>

            {/* Quick Actions / Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                    <h3 className="font-bold text-lg mb-4">📢 Town Officer Actions</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <span className="text-xl">☀️</span>
                            <div>
                                <p className="font-medium">Morning Check</p>
                                <p className="text-xs text-indigo-200">Verify all delivery partners are active.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                            <span className="text-xl">🌙</span>
                            <div>
                                <p className="font-medium">Night Mode</p>
                                <p className="text-xs text-indigo-200">System will auto-disable at 10:00 PM.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-gray-900">🚀 Quick Links</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <a href="/admin/sellers" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center border border-gray-200">
                            <span className="block text-2xl mb-2">🏪</span>
                            <span className="font-medium text-gray-700 text-sm">Approve Sellers</span>
                        </a>
                        <a href="/admin/orders" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-center border border-gray-200">
                            <span className="block text-2xl mb-2">📦</span>
                            <span className="font-medium text-gray-700 text-sm">Track Orders</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
