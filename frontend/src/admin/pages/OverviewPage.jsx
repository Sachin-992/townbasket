import { useState } from 'react'
import MetricCard from '../components/MetricCard'
import ChartCard, { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '../components/ChartCard'
import StatusBadge from '../components/StatusBadge'
import DateRangePicker from '../components/DateRangePicker'
import { useOverview, useRevenueAnalytics, useAllOrders } from '../hooks/useAdminData'
import { formatCurrency, formatNumber, formatPercent, formatRelative, getTrend, getTrendPercent } from '../utils/formatters'
import { AreaChart } from 'recharts'
import { Activity, ShoppingBag, Store, Users, TrendingUp, AlertTriangle } from 'lucide-react'

export default function OverviewPage() {
    const [period, setPeriod] = useState('daily')
    const { data: overview, isLoading: loadingOverview } = useOverview()
    const { data: revenue, isLoading: loadingRevenue } = useRevenueAnalytics(period)
    const { data: ordersRaw, isLoading: loadingOrders } = useAllOrders()

    const o = overview || {}
    const recentOrders = (ordersRaw || []).slice(0, 5)
    const chartData = (revenue?.series || []).map(d => ({
        date: d.date,
        revenue: Number(d.revenue || 0),
        orders: Number(d.orders || 0),
    }))

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time metrics for your town</p>
                </div>
                <DateRangePicker
                    activeLabel={period === 'daily' ? '30 days' : period === 'weekly' ? 'This week' : '3 months'}
                    onChange={({ label }) => {
                        if (label === 'Today' || label === '7 days' || label === '30 days') setPeriod('daily')
                        else if (label === 'This week') setPeriod('weekly')
                        else setPeriod('monthly')
                    }}
                />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Revenue"
                    value={formatCurrency(o.totalRevenue || 0)}
                    icon="IndianRupee"
                    trend={getTrend(o.totalRevenue, o.prevRevenue)}
                    trendValue={o.prevRevenue ? `${getTrendPercent(o.totalRevenue, o.prevRevenue).toFixed(1)}%` : undefined}
                    subtitle="all time"
                    loading={loadingOverview}
                />
                <MetricCard
                    title="Today's Orders"
                    value={formatNumber(o.todayOrders || 0)}
                    icon="ShoppingBag"
                    trend={getTrend(o.todayOrders, o.yesterdayOrders)}
                    trendValue={o.yesterdayOrders ? `${getTrendPercent(o.todayOrders, o.yesterdayOrders).toFixed(0)}%` : undefined}
                    subtitle="vs yesterday"
                    loading={loadingOverview}
                />
                <MetricCard
                    title="Active Sellers"
                    value={formatNumber(o.activeSellers || o.totalShops || 0)}
                    icon="Store"
                    subtitle={`${o.pendingShops || 0} pending`}
                    loading={loadingOverview}
                />
                <MetricCard
                    title="Fulfillment Rate"
                    value={formatPercent(o.fulfillmentRate || 0)}
                    icon="TrendingUp"
                    trend={o.fulfillmentRate >= 90 ? 'up' : o.fulfillmentRate >= 70 ? 'flat' : 'down'}
                    subtitle="delivered / total"
                    loading={loadingOverview}
                />
                <MetricCard
                    title="Total Users"
                    value={formatNumber(o.totalUsers || 0)}
                    icon="Users"
                    subtitle={`${o.newUsersToday || 0} new today`}
                    loading={loadingOverview}
                />
                <MetricCard
                    title="Pending Complaints"
                    value={formatNumber(o.pendingComplaints || 0)}
                    icon="AlertTriangle"
                    trend={o.pendingComplaints > 5 ? 'down' : 'flat'}
                    subtitle="need attention"
                    loading={loadingOverview}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Revenue Trend" subtitle={`${period} view`} className="lg:col-span-2">
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
                            <Tooltip
                                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#fff' }}
                                formatter={(v) => [formatCurrency(v), 'Revenue']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Recent orders */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h3>
                    {loadingOrders ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="animate-pulse h-12 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                            ))}
                        </div>
                    ) : recentOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">No orders yet</p>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map(order => (
                                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.order_number}</p>
                                        <p className="text-xs text-gray-400">{formatRelative(order.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">₹{order.total}</p>
                                        <StatusBadge status={order.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
