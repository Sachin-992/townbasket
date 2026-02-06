import { useState, useEffect } from 'react'
import { shopsApi } from '../../lib/api'

export default function AdminSellers() {
    const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'all'
    const [shops, setShops] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadShops()
    }, [activeTab])

    const loadShops = async () => {
        setLoading(true)
        try {
            const data = activeTab === 'pending'
                ? await shopsApi.getPendingShops()
                : await shopsApi.getAllShops()

            setShops(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error loading shops:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (shopId) => {
        if (!window.confirm('Approve this seller?')) return
        try {
            await shopsApi.approveShop(shopId)
            loadShops()
        } catch (err) {
            console.error('Error approving shop:', err)
            alert('Failed to approve shop')
        }
    }

    const handleReject = async (shopId) => {
        const reason = prompt('Please provide a reason for rejection (optional):')
        if (reason === null) return // Cancelled

        try {
            await shopsApi.rejectShop(shopId)
            // Ideally send reason to backend if API supported it
            loadShops()
        } catch (err) {
            console.error('Error rejecting shop:', err)
            alert('Failed to reject shop')
        }
    }

    const handleToggleActive = async (shopId, currentStatus) => {
        const action = currentStatus ? 'Disable' : 'Enable'
        if (!window.confirm(`Are you sure you want to ${action} this seller?`)) return

        try {
            await shopsApi.toggleShopActive(shopId)
            loadShops()
        } catch (err) {
            console.error('Error toggling shop:', err)
            alert(`Failed to ${action} shop`)
        }
    }

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
                    <p className="text-gray-500">Approve new requests and manage active sellers.</p>
                </div>

                {/* Tabs */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'pending'
                                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Pending Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        All Sellers
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="py-20 text-center text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    Loading...
                </div>
            ) : (
                <>
                    {shops.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="text-4xl block mb-4">🏪</span>
                            <p className="text-gray-500">No sellers found in this category.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {shops.map((shop) => (
                                <SellerCard
                                    key={shop.id}
                                    shop={shop}
                                    isPending={activeTab === 'pending'}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onToggle={handleToggleActive}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function SellerCard({ shop, isPending, onApprove, onReject, onToggle }) {
    return (
        <div className={`bg-white rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${!shop.is_active && !isPending ? 'border-gray-200 opacity-75' : 'border-gray-100'
            }`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">
                        {shop.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{shop.name}</h3>
                        <p className="text-xs text-gray-500">{shop.category_name || 'Retail'}</p>
                    </div>
                </div>
                {!isPending && (
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${shop.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {shop.is_active ? 'Active' : 'Disabled'}
                    </span>
                )}
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                    <span>👤</span> {shop.owner_name}
                </div>
                <div className="flex items-center gap-2">
                    <span>📞</span> {shop.phone}
                </div>
                <div className="flex items-center gap-2">
                    <span>📍</span> {shop.town}
                </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-50">
                {isPending ? (
                    <>
                        <button
                            onClick={() => onApprove(shop.id)}
                            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-600"
                        >
                            Approve
                        </button>
                        <button
                            onClick={() => onReject(shop.id)}
                            className="flex-1 bg-white border border-rose-200 text-rose-500 py-2 rounded-lg text-sm font-medium hover:bg-rose-50"
                        >
                            Reject
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onToggle(shop.id, shop.is_active)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border ${shop.is_active
                                ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                            }`}
                    >
                        {shop.is_active ? 'Disable Account' : 'Enable Account'}
                    </button>
                )}
            </div>
        </div>
    )
}
