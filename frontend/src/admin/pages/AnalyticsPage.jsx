import { useState } from 'react'
import ICON_MAP from '../utils/iconMap'
import ChartCard, { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '../components/ChartCard'
import { useTopProducts, useTopShops, usePeakHours, useConversionFunnel, useCustomerLifetimeValue } from '../hooks/useAdminData'
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters'
import { AreaChart, BarChart, Bar, Cell } from 'recharts'

const { BarChart3, Crown, Target, Star, ShoppingBag, Clock, ArrowUpRight, ArrowDownRight } = ICON_MAP

const FUNNEL_COLORS = ['#6366f1', '#8b5cf6', '#10b981']

export default function AnalyticsPage() {
    const [days, setDays] = useState(30)
    const { data: productsData, isLoading: loadingProducts } = useTopProducts(days)
    const { data: shopsData, isLoading: loadingShops } = useTopShops(days)
    const { data: peakData, isLoading: loadingPeak } = usePeakHours(days)
    const { data: funnelData, isLoading: loadingFunnel } = useConversionFunnel(days)
    const { data: clvData, isLoading: loadingCLV } = useCustomerLifetimeValue()

    const products = productsData?.products || []
    const shops = shopsData?.shops || []
    const hourly = peakData?.hourly || []
    const funnel = funnelData?.funnel || []
    const customers = clvData?.customers || []

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-[1440px] mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                        <BarChart3 size={22} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Deep insights into your marketplace</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${days === d
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Top row: Conversion Funnel + Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Conversion Funnel */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-5">
                        <Target size={16} className="text-indigo-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Conversion Funnel</h3>
                    </div>
                    {loadingFunnel ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-14 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {funnel.map((stage, idx) => (
                                <div key={stage.stage} className="relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stage.stage}</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {formatNumber(stage.count)} <span className="text-xs font-normal text-gray-400">({stage.rate}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                        <div
                                            className="h-full rounded-lg transition-all duration-700"
                                            style={{
                                                width: `${stage.rate}%`,
                                                background: `linear-gradient(90deg, ${FUNNEL_COLORS[idx]}, ${FUNNEL_COLORS[idx]}88)`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {funnelData?.cancel_rate > 0 && (
                                <p className="text-xs text-gray-400 mt-2">
                                    Cancel rate: <span className="text-rose-500 font-medium">{funnelData.cancel_rate}%</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Peak Hours */}
                <ChartCard title="Peak Ordering Hours" subtitle={`last ${days} days`}>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={hourly}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 10, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={h => `${h}:00`}
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#fff' }}
                                formatter={(v, name) => [name === 'orders' ? v : formatCurrency(v), name === 'orders' ? 'Orders' : 'Revenue']}
                                labelFormatter={h => `${h}:00 — ${h + 1}:00`}
                            />
                            <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                                {hourly.map((entry, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={entry.orders >= Math.max(...hourly.map(h => h.orders)) * 0.7
                                            ? '#6366f1'
                                            : entry.orders >= Math.max(...hourly.map(h => h.orders)) * 0.4
                                                ? '#a5b4fc'
                                                : '#e0e7ff'}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Top Products + Top Shops */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-5">
                        <ShoppingBag size={16} className="text-emerald-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Products</h3>
                        <span className="text-xs text-gray-400 ml-auto">by revenue</span>
                    </div>
                    {loadingProducts ? (
                        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />)}</div>
                    ) : products.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">No product data yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {products.map((p, idx) => (
                                <div key={p.name} className="flex items-center gap-3 py-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                            idx === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                                                idx === 2 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' :
                                                    'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                                        <p className="text-xs text-gray-400">{p.orders} orders · {p.quantity} units</p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{formatCurrency(p.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Shop Leaderboard */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-5">
                        <Crown size={16} className="text-amber-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Shop Leaderboard</h3>
                        <span className="text-xs text-gray-400 ml-auto">by revenue</span>
                    </div>
                    {loadingShops ? (
                        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />)}</div>
                    ) : shops.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">No shop data yet</p>
                    ) : (
                        <div className="space-y-2.5">
                            {shops.slice(0, 8).map((s, idx) => (
                                <div key={s.id} className="flex items-center gap-3 py-2">
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                            idx === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                                                idx === 2 ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' :
                                                    'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                        }`}>
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {s.town} · {s.fulfillment_rate}% fulfilled
                                            <Star size={10} className="inline ml-1 text-amber-400" /> {s.rating}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{formatCurrency(s.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Lifetime Value */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Crown size={16} className="text-violet-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Customer Lifetime Value</h3>
                    <span className="text-xs text-gray-400 ml-auto">Top {customers.length} customers</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Spent</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Orders</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Order</th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCLV ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="animate-pulse h-6 bg-gray-100 dark:bg-gray-700 rounded" /></td></tr>
                                ))
                            ) : customers.length === 0 ? (
                                <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">No customer data</td></tr>
                            ) : (
                                customers.map((c, idx) => (
                                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-5 py-3 text-gray-400 font-medium">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.phone}</p>
                                        </td>
                                        <td className="text-right px-4 py-3 font-bold text-gray-900 dark:text-white">{formatCurrency(c.total_spent)}</td>
                                        <td className="text-center px-4 py-3">{c.order_count}</td>
                                        <td className="text-right px-4 py-3 text-gray-500 dark:text-gray-400">{formatCurrency(c.avg_order)}</td>
                                        <td className="text-center px-4 py-3">
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300">
                                                {c.reward_points}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
