/**
 * Lazy-loaded chart section for OverviewPage.
 * Separates heavy Recharts dependency into its own code-split chunk.
 */
import ChartCard, { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from '../components/ChartCard'
import StatusBadge from '../components/StatusBadge'
import { MiniSparkline } from '../components/MetricCard'
import { AreaChart } from 'recharts'
import { formatCurrency, formatRelative } from '../utils/formatters'

export default function OverviewChart({ chartData, period, recentOrders, loadingOrders, loadingRevenue, revSparkline }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue trend chart */}
            <ChartCard title="Revenue Trend" subtitle={`${period} view`} className="lg:col-span-2">
                {loadingRevenue ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-pulse text-sm text-gray-400">Loading chart…</div>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2">
                        <p className="text-sm text-gray-400">No revenue data yet</p>
                        {/* Show sparkline preview if available */}
                        {revSparkline && revSparkline.length > 1 && (
                            <div className="w-48">
                                <MiniSparkline data={revSparkline} color="#6366f1" />
                                <p className="text-[10px] text-gray-400 text-center mt-1">7-day preview</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis
                                yAxisId="rev"
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => formatCurrency(v)}
                            />
                            <YAxis
                                yAxisId="ord"
                                orientation="right"
                                tick={{ fontSize: 11, fill: '#9ca3af' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ background: '#1f2937', border: 'none', borderRadius: 12, fontSize: 12, color: '#fff' }}
                                formatter={(v, name) => [
                                    name === 'revenue' ? formatCurrency(v) : v,
                                    name === 'revenue' ? 'Revenue' : 'Orders'
                                ]}
                            />
                            <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGradient)" />
                            <Area yAxisId="ord" type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={1.5} fill="url(#orderGradient)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
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
    )
}
