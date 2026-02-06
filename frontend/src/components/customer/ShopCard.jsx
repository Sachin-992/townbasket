import { Link } from 'react-router-dom'

export default function ShopCard({ shop }) {
    return (
        <Link
            to={`/customer/shop/${shop.id}`}
            className="block bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group"
        >
            {/* Shop Image */}
            <div className="relative h-28 sm:h-36 md:h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {shop.banner_url ? (
                    <img
                        src={shop.banner_url}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500">
                        <span className="text-4xl sm:text-5xl opacity-50">🏪</span>
                    </div>
                )}

                {/* Discount Badge */}
                {shop.discount && (
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-blue-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                        {shop.discount}% OFF
                    </div>
                )}

                {/* Status Badge */}
                <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${shop.is_open ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-white'
                    }`}>
                    {shop.is_open ? 'Open' : 'Closed'}
                </div>
            </div>

            {/* Shop Info */}
            <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg truncate group-hover:text-emerald-600 transition-colors">
                            {shop.name}
                        </h3>
                        <p className="text-gray-500 text-xs sm:text-sm truncate mt-0.5">
                            {shop.category_name || 'General Store'}
                        </p>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg flex-shrink-0">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-bold text-emerald-700">
                            {shop.rating || '4.2'}
                        </span>
                    </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
                    <span className="flex items-center gap-0.5 sm:gap-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate max-w-[60px] sm:max-w-none">{shop.town || 'Nearby'}</span>
                    </span>
                    <span className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-gray-300 rounded-full flex-shrink-0" />
                    <span className="flex items-center gap-0.5 sm:gap-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {shop.delivery_time || '20-30'} min
                    </span>
                </div>

                {/* Free Delivery Tag */}
                {shop.free_delivery && (
                    <div className="mt-2 sm:mt-3 inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Free Delivery
                    </div>
                )}
            </div>
        </Link>
    )
}
