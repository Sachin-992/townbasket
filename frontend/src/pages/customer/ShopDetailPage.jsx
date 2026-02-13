import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ProductCard from '../../components/customer/ProductCard'
import { shopsApi, productsApi } from '../../lib/api'

export default function ShopDetailPage() {
    const { shopId } = useParams()
    const navigate = useNavigate()
    const { cartCount, cartTotal, cartShop } = useCart()
    const toast = useToast()
    const [shop, setShop] = useState(null)
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [isFavorite, setIsFavorite] = useState(false)

    useEffect(() => {
        loadShopData()
    }, [shopId])

    const loadShopData = async () => {
        setLoading(true)
        try {
            const [shopData, productsData] = await Promise.all([
                shopsApi.getShop(shopId),
                productsApi.getProducts(shopId),
            ])
            setShop(shopData)
            setProducts(Array.isArray(productsData) ? productsData : [])
        } catch (err) {
            console.error('Failed to load shop:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = useMemo(() => {
        let result = [...products]
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            result = result.filter(p =>
                p.name?.toLowerCase().includes(term) ||
                p.description?.toLowerCase().includes(term)
            )
        }
        if (activeCategory === 'popular') {
            result = result.filter(p => p.is_featured)
        } else if (activeCategory === 'offers') {
            result = result.filter(p => p.discount_price && p.discount_price < p.price)
        }
        return result
    }, [products, searchTerm, activeCategory])

    const handleBack = () => navigate(-1)

    const handleShare = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: shop.name,
                    text: `Check out ${shop.name} on TownBasket!`,
                    url: window.location.href
                })
            } else {
                navigator.clipboard.writeText(window.location.href)
                toast.success('Link copied to clipboard!')
            }
        } catch (err) {
            /* Share cancelled by user */
        }
    }

    const handleFavorite = () => {
        setIsFavorite(!isFavorite)
    }

    // Loading State
    if (loading) {
        return (
            <CustomerLayout>
                <div className="bg-gray-50 min-h-screen">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-40 sm:h-48" />
                    <div className="container-responsive -mt-16">
                        <div className="bg-white rounded-2xl p-5 shadow-lg animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-5 bg-gray-200 rounded w-32" />
                                    <div className="h-4 bg-gray-200 rounded w-20" />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-xl p-3">
                                    <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CustomerLayout>
        )
    }

    // Error State
    if (!shop || shop.error) {
        return (
            <CustomerLayout title="Shop Not Found" showBack>
                <div className="flex flex-col items-center justify-center py-20 px-4 bg-gray-50 min-h-screen">
                    <span className="text-6xl mb-4">😕</span>
                    <h1 className="text-xl font-bold text-gray-900">Shop not found</h1>
                    <p className="text-gray-500 mt-2 text-center">This shop may have been removed.</p>
                    <button onClick={handleBack} className="mt-6 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold">
                        ← Go Back
                    </button>
                </div>
            </CustomerLayout>
        )
    }

    const showCart = cartCount > 0 && cartShop?.id === shop.id
    const inStockCount = products.filter(p => p.in_stock !== false).length
    const offersCount = products.filter(p => p.discount_price && p.discount_price < p.price).length

    return (
        <CustomerLayout>
            <div className="bg-gray-50 min-h-screen">
                {/* Hero Banner */}
                <div className="relative">
                    {/* Banner Image or Gradient */}
                    <div className="h-40 sm:h-48 lg:h-56 overflow-hidden">
                        {shop.banner_url ? (
                            <img
                                src={shop.banner_url}
                                alt={shop.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-7xl sm:text-8xl opacity-20">🏪</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>

                    {/* Navigation Buttons */}
                    <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between z-10">
                        <button
                            onClick={handleBack}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                        >
                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={handleFavorite}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all ${isFavorite ? 'bg-red-500' : 'bg-white'
                                    }`}
                            >
                                <svg
                                    className={`w-5 h-5 ${isFavorite ? 'text-white fill-current' : 'text-gray-700'}`}
                                    fill={isFavorite ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={handleShare}
                                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
                            >
                                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Shop Info Card */}
                <div className="container-responsive -mt-14 sm:-mt-16 relative z-10 mb-4">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-4 sm:p-5">
                            <div className="flex gap-3 sm:gap-4">
                                {/* Shop Logo */}
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
                                    {shop.logo_url ? (
                                        <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl sm:text-3xl">🏪</span>
                                    )}
                                </div>

                                {/* Shop Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{shop.name}</h1>
                                            <p className="text-gray-500 text-sm">{shop.category_name}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${shop.is_open ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {shop.is_open ? '● Open' : '● Closed'}
                                        </span>
                                    </div>

                                    {/* Info Badges */}
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-xs font-semibold text-amber-700">
                                            ⭐ {shop.average_rating || '4.5'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs font-semibold text-blue-700">
                                            🕐 20-30 min
                                        </span>
                                        <span className="inline-flex items-center gap-1 bg-purple-50 px-2 py-1 rounded text-xs font-semibold text-purple-700">
                                            📍 {shop.town || 'Local'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {shop.description && (
                                <p className="text-gray-600 text-sm mt-3 line-clamp-2">{shop.description}</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50">
                            <div className="text-center py-3 border-r border-gray-100">
                                <p className="text-xl font-bold text-emerald-600">{products.length}</p>
                                <p className="text-xs text-gray-500">Products</p>
                            </div>
                            <div className="text-center py-3 border-r border-gray-100">
                                <p className="text-xl font-bold text-blue-600">{inStockCount}</p>
                                <p className="text-xs text-gray-500">In Stock</p>
                            </div>
                            <div className="text-center py-3">
                                <p className="text-xl font-bold text-orange-600">{offersCount}</p>
                                <p className="text-xs text-gray-500">Offers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Section */}
                <div className="container-responsive pb-28 lg:pb-6">
                    {/* Search */}
                    <div className="mb-4">
                        <div className="flex items-center bg-white rounded-xl border border-gray-200 overflow-hidden focus-within:border-emerald-400 transition-colors">
                            <div className="pl-4 text-gray-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search products..."
                                className="flex-1 px-3 py-3 text-gray-700 placeholder-gray-400 focus:outline-none text-sm"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="px-4 text-gray-400 hover:text-gray-600">
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                        {[
                            { key: 'all', label: 'All Items', icon: '🛒' },
                            { key: 'popular', label: 'Popular', icon: '🔥' },
                            { key: 'offers', label: `Offers${offersCount > 0 ? ` (${offersCount})` : ''}`, icon: '💰' },
                        ].map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeCategory === cat.key
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Products Grid */}
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                            <span className="text-5xl">📦</span>
                            <p className="text-gray-600 mt-4 font-medium">
                                {searchTerm ? 'No products found' : 'No products available'}
                            </p>
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="mt-4 text-emerald-600 font-semibold">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} shop={shop} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Floating Cart */}
                {showCart && (
                    <div className="fixed bottom-16 sm:bottom-20 lg:bottom-4 left-3 right-3 lg:left-auto lg:right-4 lg:w-80 z-40 animate-slide-up">
                        <Link
                            to="/customer/cart"
                            className="flex items-center justify-between bg-emerald-600 text-white p-4 rounded-xl shadow-xl hover:bg-emerald-700 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                                    {cartCount}
                                </div>
                                <div>
                                    <p className="font-semibold">View Cart</p>
                                    <p className="text-emerald-200 text-xs">{cartShop.name}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">₹{cartTotal.toFixed(0)}</span>
                                <span>→</span>
                            </div>
                        </Link>
                    </div>
                )}
            </div>
        </CustomerLayout>
    )
}
