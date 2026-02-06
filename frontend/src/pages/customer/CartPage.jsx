import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import CustomerLayout from '../../components/customer/CustomerLayout'

export default function CartPage() {
    const navigate = useNavigate()
    const { cartItems, cartShop, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart()

    const deliveryFee = 0
    const platformFee = 0
    const grandTotal = cartTotal + deliveryFee + platformFee

    // Calculate savings
    const totalSavings = cartItems.reduce((sum, item) => {
        if (item.product.discount_price && item.product.discount_price < item.product.price) {
            return sum + (item.product.price - item.product.discount_price) * item.quantity
        }
        return sum
    }, 0)

    // Empty Cart State
    if (cartItems.length === 0) {
        return (
            <CustomerLayout title="Your Cart" showBack>
                <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center py-16 px-4">
                    <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-sm max-w-md w-full">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-5xl sm:text-6xl">🛒</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
                        <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet</p>
                        <Link
                            to="/customer"
                            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-emerald-500/25"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </CustomerLayout>
        )
    }

    return (
        <CustomerLayout title="Your Cart" showBack>
            <div className="bg-gray-50 min-h-screen">
                <div className="container-responsive py-4 pb-40 lg:pb-8">
                    {/* Shop Header */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                                    <span className="text-xl">🏪</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{cartShop?.name}</p>
                                    <p className="text-sm text-gray-500">{cartItems.length} item{cartItems.length > 1 ? 's' : ''} in cart</p>
                                </div>
                            </div>
                            <button
                                onClick={clearCart}
                                className="text-red-500 text-sm font-semibold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Clear</span>
                            </button>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden mb-4">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-700 text-sm">Cart Items</h3>
                        </div>

                        {cartItems.map((item, index) => (
                            <div key={item.product.id} className={`p-4 ${index > 0 ? 'border-t border-gray-100' : ''}`}>
                                <div className="flex gap-3 sm:gap-4">
                                    {/* Product Image */}
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                                        {item.product.image_url ? (
                                            <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                                                <span className="text-2xl opacity-50">📦</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">{item.product.name}</h3>
                                                <p className="text-gray-400 text-xs mt-0.5">
                                                    {item.product.unit_quantity} {item.product.unit}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Price and Quantity Row */}
                                        <div className="flex items-center justify-between mt-2">
                                            <div>
                                                <p className="text-emerald-600 font-bold">
                                                    ₹{((item.product.discount_price || item.product.price) * item.quantity).toFixed(0)}
                                                </p>
                                                {item.product.discount_price && item.product.discount_price < item.product.price && (
                                                    <p className="text-xs text-gray-400 line-through">
                                                        ₹{(item.product.price * item.quantity).toFixed(0)}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex items-center bg-emerald-500 text-white rounded-lg overflow-hidden shadow-md">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-emerald-600 font-bold text-lg transition-colors"
                                                >
                                                    −
                                                </button>
                                                <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-emerald-600 font-bold text-lg transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Savings Banner */}
                    {totalSavings > 0 && (
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 mb-4 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="text-xl">🎉</span>
                                </div>
                                <div>
                                    <p className="font-bold">You're saving ₹{totalSavings.toFixed(0)}!</p>
                                    <p className="text-sm text-white/80">Great deals on this order</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bill Details */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm overflow-hidden mb-4">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-semibold text-gray-700 text-sm">Bill Details</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Item Total</span>
                                <span className="font-medium text-gray-900">₹{cartTotal.toFixed(0)}</span>
                            </div>
                            {totalSavings > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Discount</span>
                                    <span className="font-medium text-emerald-600">-₹{totalSavings.toFixed(0)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Delivery Fee</span>
                                <span className="font-medium text-emerald-600">FREE</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Platform Fee</span>
                                <span className="font-medium text-emerald-600">FREE</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-gray-200">
                                <span className="font-bold text-gray-900">To Pay</span>
                                <span className="font-bold text-gray-900 text-lg">₹{grandTotal.toFixed(0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Add More Items Link */}
                    <Link
                        to={`/customer/shop/${cartShop?.id}`}
                        className="block bg-white rounded-xl p-4 text-center border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                    >
                        <span className="text-emerald-600 font-semibold group-hover:text-emerald-700 flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add More Items
                        </span>
                    </Link>
                </div>

                {/* Fixed Checkout Bar */}
                <div className="fixed bottom-14 sm:bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:p-4 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                    <div className="container-responsive">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-gray-500">{cartItems.length} item{cartItems.length > 1 ? 's' : ''}</p>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{grandTotal.toFixed(0)}</p>
                            </div>
                            <Link
                                to="/customer/checkout"
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/30"
                            >
                                <span>Checkout</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </CustomerLayout>
    )
}
