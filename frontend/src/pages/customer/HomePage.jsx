import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CustomerLayout from '../../components/customer/CustomerLayout'
import CategoryGrid from '../../components/customer/CategoryGrid'
import ShopCard from '../../components/customer/ShopCard'
import { shopsApi, usersApi } from '../../lib/api'

export default function HomePage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [shops, setShops] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [showAddressModal, setShowAddressModal] = useState(false)
    const [savedAddresses, setSavedAddresses] = useState([])
    const [selectedAddressId, setSelectedAddressId] = useState(null)

    // Get the currently selected address object
    const selectedAddress = useMemo(() => {
        return savedAddresses.find(a => a.id === selectedAddressId) ||
            savedAddresses.find(a => a.is_default) ||
            savedAddresses[0] || null
    }, [savedAddresses, selectedAddressId])

    const loadAddresses = useCallback(async () => {
        if (!user?.id) return
        try {
            const data = await usersApi.getAddresses(user.id)
            const addresses = data.addresses || []
            setSavedAddresses(addresses)
            // Set the default address as selected
            const defaultAddr = addresses.find(a => a.is_default)
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id)
            } else if (addresses.length > 0) {
                setSelectedAddressId(addresses[0].id)
            }
        } catch (err) {
            console.error('Failed to load addresses:', err)
        }
    }, [user?.id])

    useEffect(() => {
        loadShops()
        loadAddresses()
    }, [loadAddresses])

    const loadShops = async () => {
        try {
            const data = await shopsApi.getShops()
            setShops(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load shops:', err)
        } finally {
            setLoading(false)
        }
    }

    // Filter shops based on search query
    const filteredShops = useMemo(() => {
        if (!searchQuery.trim()) return shops
        const query = searchQuery.toLowerCase()
        return shops.filter(shop =>
            shop.name?.toLowerCase().includes(query) ||
            shop.category_name?.toLowerCase().includes(query) ||
            shop.town?.toLowerCase().includes(query)
        )
    }, [shops, searchQuery])

    const handleSearch = (e) => {
        setSearchQuery(e.target.value)
        setShowSearchResults(e.target.value.length > 0)
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/customer/shops?q=${encodeURIComponent(searchQuery)}`)
        }
    }

    return (
        <CustomerLayout>
            {/* Header with Search */}
            <header className="sticky top-0 bg-white z-30 border-b border-gray-100 safe-area-pt">
                <div className="container-responsive py-3 sm:py-4">
                    {/* Location & Profile - Mobile */}
                    <div className="flex items-center justify-between mb-3 lg:hidden">
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide font-medium">Deliver to</p>
                            <button
                                onClick={() => setShowAddressModal(true)}
                                className="flex items-center gap-1 font-bold text-gray-900 text-sm sm:text-base active:scale-95 transition-transform"
                            >
                                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {selectedAddress?.label || 'Add Address'}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                        <Link
                            to="/customer/profile"
                            className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center touch-target shadow-lg shadow-emerald-500/20"
                        >
                            <span className="font-bold text-white text-sm">
                                {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </Link>
                    </div>

                    {/* Search Bar + Address (Desktop) */}
                    <div className="flex items-center gap-4">
                        <form onSubmit={handleSearchSubmit} className="relative flex-1">
                            <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearch}
                                placeholder="Search for shops, groceries, food..."
                                className="w-full bg-gray-100 rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 py-3 sm:py-3.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm sm:text-base"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setShowSearchResults(false); }}
                                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </form>

                        {/* Address Selector - Desktop Only */}
                        <button
                            onClick={() => setShowAddressModal(true)}
                            className="hidden lg:flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors flex-shrink-0"
                        >
                            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Deliver to</p>
                                <p className="font-bold text-gray-900 text-sm">{selectedAddress?.label || 'Add Address'}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchQuery && (
                        <div className="absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-40 max-h-64 overflow-y-auto">
                            <div className="container-responsive py-2">
                                {filteredShops.length === 0 ? (
                                    <p className="text-gray-500 text-sm py-4 text-center">No results for "{searchQuery}"</p>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-500 mb-2 px-2">{filteredShops.length} results</p>
                                        {filteredShops.slice(0, 5).map((shop) => (
                                            <Link
                                                key={shop.id}
                                                to={`/customer/shop/${shop.id}`}
                                                onClick={() => setShowSearchResults(false)}
                                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-lg">🏪</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 text-sm">{shop.name}</p>
                                                    <p className="text-xs text-gray-500">{shop.category_name} • {shop.town}</p>
                                                </div>
                                            </Link>
                                        ))}
                                        {filteredShops.length > 5 && (
                                            <button
                                                onClick={() => navigate(`/customer/shops?q=${encodeURIComponent(searchQuery)}`)}
                                                className="w-full text-emerald-600 font-semibold text-sm py-2 hover:bg-emerald-50 rounded-lg"
                                            >
                                                View all {filteredShops.length} results →
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="container-responsive py-4 sm:py-6 space-y-6 sm:space-y-8">
                {/* Hero Banner */}
                <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="inline-block bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-full mb-2 sm:mb-3 animate-pulse-soft">
                                🔥 LIMITED TIME
                            </div>
                            <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-black mb-1 sm:mb-2">Free Delivery</h2>
                            <p className="text-emerald-100 text-sm sm:text-base">On your first 3 orders! Start shopping now.</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                            <button
                                onClick={() => navigate('/customer/shops')}
                                className="bg-white hover:bg-gray-50 active:scale-95 text-emerald-600 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl cursor-pointer"
                            >
                                Order Now →
                            </button>
                            <p className="text-emerald-200 text-xs">No minimum order value</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-2xl sm:text-3xl mb-1">🚀</div>
                        <p className="text-lg sm:text-2xl font-black text-gray-900">30 min</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Fast Delivery</p>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-2xl sm:text-3xl mb-1">🏪</div>
                        <p className="text-lg sm:text-2xl font-black text-gray-900">{shops.length}+</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Local Shops</p>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-2xl sm:text-3xl mb-1">💚</div>
                        <p className="text-lg sm:text-2xl font-black text-gray-900">0%</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Commission</p>
                    </div>
                </div>

                {/* Categories */}
                <section>
                    <h2 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <span>🍽️</span> What's on your mind?
                    </h2>
                    <CategoryGrid />
                </section>

                {/* Special Offers */}
                <section>
                    <h2 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                        <span>🎉</span> Special Offers
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Link
                            to="/customer/shops?category=food"
                            className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="absolute right-0 bottom-0 text-5xl opacity-20">🥘</div>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80">FLAT</p>
                            <p className="text-xl sm:text-2xl font-black">20% OFF</p>
                            <p className="text-xs sm:text-sm mt-1 opacity-80">on Food orders</p>
                        </Link>
                        <Link
                            to="/customer/shops?category=pharmacy"
                            className="bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="absolute right-0 bottom-0 text-5xl opacity-20">💊</div>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80">UPTO</p>
                            <p className="text-xl sm:text-2xl font-black">15% OFF</p>
                            <p className="text-xs sm:text-sm mt-1 opacity-80">on Pharmacy</p>
                        </Link>
                        <Link
                            to="/customer/shops?category=vegetables"
                            className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="absolute right-0 bottom-0 text-5xl opacity-20">🥬</div>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80">FRESH</p>
                            <p className="text-xl sm:text-2xl font-black">FREE DELIVERY</p>
                            <p className="text-xs sm:text-sm mt-1 opacity-80">on Vegetables</p>
                        </Link>
                        <Link
                            to="/customer/shops"
                            className="bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-white relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                        >
                            <div className="absolute right-0 bottom-0 text-5xl opacity-20">🎁</div>
                            <p className="text-[10px] sm:text-xs font-bold opacity-80">NEW USER</p>
                            <p className="text-xl sm:text-2xl font-black">FREE DELIVERY</p>
                            <p className="text-xs sm:text-sm mt-1 opacity-80">First 3 orders</p>
                        </Link>
                    </div>
                </section>

                {/* Shops */}
                <section>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-base sm:text-lg lg:text-xl font-black text-gray-900 flex items-center gap-2">
                            <span>🏪</span> Shops Near You
                        </h2>
                        <Link to="/customer/shops" className="text-emerald-600 font-bold text-xs sm:text-sm hover:underline flex items-center gap-1">
                            See All
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid-shops">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden animate-pulse shadow-sm">
                                    <div className="h-28 sm:h-36 md:h-40 bg-gray-200" />
                                    <div className="p-3 sm:p-4 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : shops.length === 0 ? (
                        <div className="text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-sm">
                            <span className="text-5xl sm:text-6xl">🏪</span>
                            <p className="text-gray-600 mt-3 sm:mt-4 font-semibold">No shops available yet</p>
                            <p className="text-gray-400 text-sm mt-1">Check back later!</p>
                        </div>
                    ) : (
                        <div className="grid-shops">
                            {shops.map((shop) => (
                                <ShopCard key={shop.id} shop={shop} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Trust Banner */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white text-center">
                    <h3 className="text-lg sm:text-xl font-black mb-2">TownBasket is NOT a copy of city apps.</h3>
                    <p className="text-gray-300 text-sm sm:text-base">
                        It is a <span className="text-emerald-400 font-bold">town-first</span>, <span className="text-emerald-400 font-bold">trust-first</span>, <span className="text-emerald-400 font-bold">people-first</span> digital ecosystem.
                    </p>
                </div>
            </div>

            {/* Address Selection Modal (Bottom Sheet on Mobile, Centered on Desktop) */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAddressModal(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 pb-24 sm:pb-6 animate-slide-up max-h-[70vh] overflow-y-auto">
                        {/* Handle - Mobile Only */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full sm:hidden" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 pt-4">
                            <h2 className="text-xl font-black text-gray-900">Deliver to</h2>
                            <button
                                onClick={() => setShowAddressModal(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Address Options */}
                        {savedAddresses.length === 0 ? (
                            <div className="text-center py-8">
                                <span className="text-4xl">📍</span>
                                <p className="text-gray-600 font-medium mt-3">No addresses saved yet</p>
                                <p className="text-gray-400 text-sm mt-1">Add your first delivery address</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedAddresses.map((addr) => {
                                    const typeIcon = addr.type === 'home' ? '🏠' : addr.type === 'work' ? '🏢' : '📍'
                                    const isSelected = selectedAddressId === addr.id
                                    return (
                                        <button
                                            key={addr.id}
                                            onClick={() => {
                                                setSelectedAddressId(addr.id)
                                                setShowAddressModal(false)
                                            }}
                                            className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left active:scale-[0.98] ${isSelected
                                                ? 'border-emerald-500 bg-emerald-50'
                                                : 'border-gray-200 bg-white hover:border-emerald-200'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${isSelected ? 'bg-emerald-100' : 'bg-gray-100'
                                                }`}>
                                                {typeIcon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-gray-900">{addr.label}</h3>
                                                    {addr.is_default && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">Default</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 line-clamp-1">{addr.address_line}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* Add New Address Button */}
                        <button
                            onClick={() => {
                                setShowAddressModal(false)
                                navigate('/customer/addresses')
                            }}
                            className="w-full mt-4 py-4 rounded-xl border-2 border-dashed border-emerald-300 text-emerald-600 font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 active:scale-[0.98] transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {savedAddresses.length === 0 ? 'Add Your First Address' : 'Manage Addresses'}
                        </button>
                    </div>
                </div>
            )}
        </CustomerLayout>
    )
}
