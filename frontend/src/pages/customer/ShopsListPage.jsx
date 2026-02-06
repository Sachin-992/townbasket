import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import CustomerLayout from '../../components/customer/CustomerLayout'
import ShopCard from '../../components/customer/ShopCard'
import { shopsApi } from '../../lib/api'

export default function ShopsListPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const categoryId = searchParams.get('category')
    const searchQuery = searchParams.get('search') || ''

    const [shops, setShops] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(searchQuery)
    const [selectedCategory, setSelectedCategory] = useState(categoryId || 'all')
    const [sortBy, setSortBy] = useState('popular')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        loadData()
    }, [categoryId])

    useEffect(() => {
        setSearchTerm(searchQuery)
    }, [searchQuery])

    const loadData = async () => {
        setLoading(true)
        try {
            const [shopsData, categoriesData] = await Promise.all([
                shopsApi.getShops(categoryId),
                shopsApi.getCategories()
            ])
            setShops(Array.isArray(shopsData) ? shopsData : [])
            setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Filter and sort shops
    const filteredShops = useMemo(() => {
        let result = [...shops]

        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            result = result.filter(shop =>
                shop.name?.toLowerCase().includes(term) ||
                shop.category_name?.toLowerCase().includes(term) ||
                shop.address?.toLowerCase().includes(term)
            )
        }

        // Filter by category (if different from URL param)
        if (selectedCategory !== 'all' && !categoryId) {
            result = result.filter(shop => shop.category?.toString() === selectedCategory)
        }

        // Sort
        switch (sortBy) {
            case 'rating':
                result.sort((a, b) => (b.rating || 4.2) - (a.rating || 4.2))
                break
            case 'newest':
                result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                break
            case 'name':
                result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                break
            default: // popular
                result.sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0))
        }

        return result
    }, [shops, searchTerm, selectedCategory, sortBy, categoryId])

    const handleClearFilters = () => {
        setSearchTerm('')
        setSelectedCategory('all')
        setSortBy('popular')
        navigate('/customer/shops')
    }

    const currentCategory = categories.find(c => c.id?.toString() === categoryId)

    return (
        <CustomerLayout title={currentCategory?.name || "Explore Shops"} showBack>
            <div className="container-responsive py-4 space-y-4">
                {/* Hero Banner */}
                <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full"></div>
                        <div className="absolute right-20 bottom-0 w-24 h-24 bg-white rounded-full"></div>
                        <div className="absolute left-1/4 top-1/4 w-16 h-16 bg-white rounded-full"></div>
                    </div>

                    <div className="relative z-10">
                        <h1 className="text-white text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                            {currentCategory ? `${currentCategory.icon || '🏪'} ${currentCategory.name}` : '🛍️ Discover Local Shops'}
                        </h1>
                        <p className="text-white/80 text-sm sm:text-base">
                            Find the best shops in your town with amazing offers
                        </p>

                        {/* Search Bar */}
                        <div className="mt-4 relative">
                            <div className="flex items-center bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
                                <div className="pl-4 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search shops, categories..."
                                    className="flex-1 px-3 py-3.5 sm:py-4 text-gray-700 placeholder-gray-400 focus:outline-none text-sm sm:text-base"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="px-3 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-3.5 sm:py-4 border-l transition-colors ${showFilters ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-white rounded-xl sm:rounded-2xl p-4 shadow-sm border border-gray-100 animate-fadeIn">
                        {/* Category Filter */}
                        <div className="mb-4">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === 'all'
                                        ? 'bg-emerald-500 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    All
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id?.toString())}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${selectedCategory === cat.id?.toString()
                                            ? 'bg-emerald-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sort By */}
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Sort By</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'popular', label: '🔥 Popular', icon: '' },
                                    { value: 'rating', label: '⭐ Top Rated', icon: '' },
                                    { value: 'newest', label: '✨ Newest', icon: '' },
                                    { value: 'name', label: '🔤 Name', icon: '' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setSortBy(option.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${sortBy === option.value
                                            ? 'bg-orange-500 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {(searchTerm || selectedCategory !== 'all' || sortBy !== 'popular') && (
                            <button
                                onClick={handleClearFilters}
                                className="mt-4 text-sm text-red-500 font-medium flex items-center gap-1 hover:text-red-600"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* Quick Category Pills (when filters are hidden) */}
                {!showFilters && !categoryId && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === 'all'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
                                }`}
                        >
                            All Shops
                        </button>
                        {categories.slice(0, 6).map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id?.toString())}
                                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${selectedCategory === cat.id?.toString()
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Results Header */}
                <div className="flex items-center justify-between">
                    <div>
                        {!loading && (
                            <p className="text-gray-600 font-medium">
                                <span className="text-emerald-600 font-bold">{filteredShops.length}</span>
                                {' '}shop{filteredShops.length !== 1 ? 's' : ''} found
                                {searchTerm && (
                                    <span className="text-gray-400"> for "{searchTerm}"</span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Quick Sort Dropdown (Desktop) */}
                    <div className="hidden sm:flex items-center gap-2">
                        <span className="text-sm text-gray-500">Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="popular">Popular</option>
                            <option value="rating">Top Rated</option>
                            <option value="newest">Newest</option>
                            <option value="name">Name</option>
                        </select>
                    </div>
                </div>

                {/* Shops Grid */}
                {loading ? (
                    <div className="grid-shops">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden animate-pulse shadow-sm">
                                <div className="h-32 sm:h-40 bg-gradient-to-br from-gray-200 to-gray-100" />
                                <div className="p-3 sm:p-4 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                                    <div className="flex gap-2">
                                        <div className="h-3 bg-gray-200 rounded-full w-16" />
                                        <div className="h-3 bg-gray-200 rounded-full w-20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredShops.length === 0 ? (
                    <div className="text-center py-12 sm:py-16 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mb-4">
                            <span className="text-5xl sm:text-6xl">🔍</span>
                        </div>
                        <h3 className="text-gray-800 text-lg sm:text-xl font-bold mb-2">No shops found</h3>
                        <p className="text-gray-500 text-sm sm:text-base mb-6 max-w-xs mx-auto">
                            {searchTerm
                                ? `We couldn't find any shops matching "${searchTerm}"`
                                : "Try a different category or search term"
                            }
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center px-6">
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors shadow-md"
                                >
                                    Clear Search
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/customer')}
                                className="px-6 py-2.5 border-2 border-emerald-500 text-emerald-600 rounded-xl font-semibold hover:bg-emerald-50 transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid-shops">
                        {filteredShops.map((shop) => (
                            <ShopCard key={shop.id} shop={shop} />
                        ))}
                    </div>
                )}

                {/* Bottom Spacer for BottomNav */}
                <div className="h-20 lg:h-0" />
            </div>
        </CustomerLayout>
    )
}
