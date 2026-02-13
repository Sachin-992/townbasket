import { useState, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import MetricCard from '../components/MetricCard'
import StatusBadge from '../components/StatusBadge'
import DateRangePicker from '../components/DateRangePicker'
import { useOverview, useRevenueAnalytics, useAllOrders } from '../hooks/useAdminData'
import { useAdminSSE } from '../hooks/useAdminSSE'
import { formatCurrency, formatNumber, formatPercent, formatRelative, getTrend, getTrendPercent } from '../utils/formatters'
import ICON_MAP from '../utils/iconMap'

const { ShieldAlert, Zap, Activity, Clock, ArrowUpRight, ArrowDownRight } = ICON_MAP

// Lazy-loaded Recharts — only fetched when visible
const LazyChartSection = lazy(() => import('./OverviewChart'))

// ── Revenue tab config ──────────────────────────
const REV_TABS = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
]

export default function OverviewPage() {
    const [period, setPeriod] = useState('daily')
    const [revTab, setRevTab] = useState('today')
    const { data: overview, isLoading: loadingOverview } = useOverview()
    const { data: revenue, isLoading: loadingRevenue } = useRevenueAnalytics(period)
    const { data: ordersRaw, isLoading: loadingOrders } = useAllOrders()
    const { todayRevenue: sseRevenue, todayOrders: sseOrders, connected, lastOrder, fraudAlerts: sseFraudAlerts, anomaly, dismissAnomaly } = useAdminSSE()

    const o = overview || {}
    const recentOrders = (ordersRaw || []).slice(0, 5)
    const chartData = (revenue?.series || []).map(d => ({
        date: d.date,
        revenue: Number(d.revenue || 0),
        orders: Number(d.orders || 0),
    }))

    const fraudCount = o.fraudAlerts || 0
    const criticalCount = o.criticalFraudAlerts || 0

    // 7-day sparkline data from backend
    const revSparkline = useMemo(() => (o.sparkline || []).map(s => s.revenue), [o.sparkline])
    const orderSparkline = useMemo(() => (o.sparkline || []).map(s => s.orders), [o.sparkline])

    // Select revenue for the active tab
    const revValue = revTab === 'today' ? (sseRevenue || o.revenueToday || 0)
        : revTab === 'week' ? (o.revenueWeek || 0)
            : (o.revenueMonth || 0)

    const revPrev = revTab === 'today' ? (o.revenueYesterday || 0)
        : revTab === 'week' ? (o.prevRevenue || 0)
            : (o.prevRevenue || 0)

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* ── Header ─────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overview</h1>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${connected
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            {connected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time operational intelligence</p>
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

            {/* ── Anomaly alert ──────────────────────── */}
            {anomaly && (
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-3">
                        <Zap size={18} className="text-rose-500" />
                        <span className="text-sm font-medium text-rose-700 dark:text-rose-300">{anomaly.message}</span>
                    </div>
                    <button onClick={dismissAnomaly} className="text-xs text-rose-500 hover:text-rose-700 font-medium">Dismiss</button>
                </div>
            )}

            {/* ── Live order toast ────────────────────── */}
            {lastOrder && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
                    <Activity size={16} className="text-indigo-500" />
                    <span className="text-sm text-indigo-700 dark:text-indigo-300">
                        New order <span className="font-semibold">#{lastOrder.order_number}</span>
                        {lastOrder.shop_name && <> from <span className="font-medium">{lastOrder.shop_name}</span></>}
                        {' — '}₹{lastOrder.total}
                    </span>
                </div>
            )}

            {/* ── Revenue Header with Tabs ────────────── */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Revenue</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">{loadingOverview ? '—' : formatCurrency(revValue)}</span>
                            {!loadingOverview && revPrev > 0 && (
                                <span className={`flex items-center gap-0.5 text-xs font-semibold ${revValue >= revPrev ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                    {revValue >= revPrev
                                        ? <ArrowUpRight size={13} />
                                        : <ArrowDownRight size={13} />}
                                    {getTrendPercent(revValue, revPrev).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                        {REV_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setRevTab(tab.key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${revTab === tab.key
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Revenue growth badge */}
                {!loadingOverview && o.revenueGrowth !== undefined && (
                    <p className="text-xs text-gray-400">
                        30-day growth: <span className={o.revenueGrowth >= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                            {o.revenueGrowth >= 0 ? '+' : ''}{o.revenueGrowth}%
                        </span>
                    </p>
                )}
            </div>

            {/* ── Intelligence Metric Cards ──────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                    title="Today's Orders"
                    value={formatNumber(sseOrders || o.todayOrders || 0)}
                    icon="ShoppingBag"
                    trend={getTrend(o.todayOrders, o.yesterdayOrders)}
                    trendValue={o.yesterdayOrders ? `${getTrendPercent(o.todayOrders, o.yesterdayOrders).toFixed(0)}%` : undefined}
                    subtitle="vs yesterday"
                    loading={loadingOverview}
                    sparkline={orderSparkline}
                    sparkColor="#6366f1"
                />
                <MetricCard
                    title="Active Sellers"
                    value={formatNumber(o.activeSellers || 0)}
                    icon="Store"
                    subtitle={`${o.activeSelling7d || 0} sold last 7d · ${o.pendingShops || 0} pending`}
                    loading={loadingOverview}
                    accentColor="blue"
                />
                <MetricCard
                    title="Fulfillment Rate"
                    value={formatPercent(o.fulfillmentRate || 0)}
                    icon="CheckCircle"
                    trend={o.fulfillmentRate >= 90 ? 'up' : o.fulfillmentRate >= 70 ? 'flat' : 'down'}
                    trendValue={o.fulfillmentRate >= 90 ? 'Healthy' : o.fulfillmentRate >= 70 ? 'OK' : 'Low'}
                    subtitle="delivered / total"
                    loading={loadingOverview}
                    accentColor="emerald"
                />
                <MetricCard
                    title="Complaint Ratio"
                    value={`${o.complaintRatio || 0}%`}
                    icon="AlertTriangle"
                    trend={o.complaintRatio <= 2 ? 'up' : o.complaintRatio <= 5 ? 'flat' : 'down'}
                    trendValue={o.pendingComplaints ? `${o.pendingComplaints} pending` : 'Clear'}
                    subtitle="complaints / orders"
                    loading={loadingOverview}
                    accentColor="amber"
                />
                <MetricCard
                    title="Avg Delivery Time"
                    value={o.avgDeliveryMinutes ? `${o.avgDeliveryMinutes} min` : '—'}
                    icon="Clock"
                    trend={o.avgDeliveryMinutes <= 30 ? 'up' : o.avgDeliveryMinutes <= 60 ? 'flat' : 'down'}
                    trendValue={o.avgDeliveryMinutes <= 30 ? 'Fast' : o.avgDeliveryMinutes <= 60 ? 'Average' : 'Slow'}
                    subtitle="confirmed → delivered"
                    loading={loadingOverview}
                    accentColor="violet"
                />
                <MetricCard
                    title="Conversion Rate"
                    value={formatPercent(o.conversionRate || 0)}
                    icon="Target"
                    trend={o.conversionRate >= 80 ? 'up' : o.conversionRate >= 50 ? 'flat' : 'down'}
                    trendValue={o.conversionRate >= 80 ? 'Strong' : o.conversionRate >= 50 ? 'Moderate' : 'Low'}
                    subtitle="orders that convert"
                    loading={loadingOverview}
                    accentColor="cyan"
                />
                <MetricCard
                    title="Total Users"
                    value={formatNumber(o.totalUsers || 0)}
                    icon="Users"
                    subtitle={`${o.newUsersToday || 0} today · ${o.newUsers7d || 0} this week`}
                    loading={loadingOverview}
                    accentColor="pink"
                />
                {/* Fraud Alerts — clickable card */}
                <Link to="/admin/fraud" className="block group">
                    <div className={`rounded-2xl p-5 border transition-all group-hover:shadow-md flex flex-col justify-between h-full ${criticalCount > 0
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
                        : fraudCount > 0
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                        }`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fraud Alerts</span>
                            <ShieldAlert size={18} className={criticalCount > 0 ? 'text-rose-500' : fraudCount > 0 ? 'text-amber-500' : 'text-gray-400'} />
                        </div>
                        <div>
                            <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-rose-700 dark:text-rose-400' :
                                fraudCount > 0 ? 'text-amber-700 dark:text-amber-400' :
                                    'text-gray-900 dark:text-white'
                                }`}>{fraudCount}</p>
                            <p className="text-[11px] mt-0.5 text-gray-400">
                                {criticalCount > 0
                                    ? <span className="text-rose-500 font-medium">{criticalCount} critical</span>
                                    : 'all clear'}
                            </p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* ── Charts + Recent Orders ──────────────── */}
            <Suspense fallback={
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl h-80 animate-pulse border border-gray-100 dark:border-gray-700" />
                    <div className="bg-white dark:bg-gray-800 rounded-2xl h-80 animate-pulse border border-gray-100 dark:border-gray-700" />
                </div>
            }>
                <LazyChartSection
                    chartData={chartData}
                    period={period}
                    recentOrders={recentOrders}
                    loadingOrders={loadingOrders}
                    loadingRevenue={loadingRevenue}
                    revSparkline={revSparkline}
                />
            </Suspense>
        </div>
    )
}
