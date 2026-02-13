import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ProductCard({ product, shop, viewMode = 'grid' }) {
    const { addToCart, switchShop, cartItems, updateQuantity, removeFromCart } = useCart()
    const confirm = useConfirm()
    const [isAdding, setIsAdding] = useState(false)

    const cartItem = cartItems.find(item => item.product.id === product.id)
    const quantity = cartItem?.quantity || 0

    const handleAdd = async () => {
        setIsAdding(true)
        const result = addToCart(product, shop)
        if (result?.needs_confirm) {
            const yes = await confirm(
                `Your cart has items from ${result.currentShop.name}. Clear cart and add from ${result.newShop.name}?`
            )
            if (yes) switchShop(product, shop)
        }
        setTimeout(() => setIsAdding(false), 300)
    }

    const handleIncrease = () => {
        updateQuantity(product.id, quantity + 1)
    }

    const handleDecrease = () => {
        if (quantity > 1) {
            updateQuantity(product.id, quantity - 1)
        } else {
            removeFromCart(product.id)
        }
    }

    const hasDiscount = product.discount_price && product.discount_price < product.price
    const discountPercent = hasDiscount
        ? Math.round((1 - product.discount_price / product.price) * 100)
        : 0
    const savings = hasDiscount ? (product.price - product.discount_price).toFixed(0) : 0

    // List view mode
    if (viewMode === 'list') {
        return (
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
                <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                                <span className="text-3xl opacity-40">📦</span>
                            </div>
                        )}
                        {discountPercent > 0 && (
                            <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {discountPercent}% OFF
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">{product.name}</h3>
                            <p className="text-gray-400 text-xs mt-0.5">{product.unit_quantity} {product.unit}</p>
                        </div>

                        <div className="flex items-end justify-between gap-2 mt-2">
                            <div>
                                <span className="text-base sm:text-lg font-bold text-gray-900">
                                    ₹{product.discount_price || product.price}
                                </span>
                                {hasDiscount && (
                                    <span className="text-xs text-gray-400 line-through ml-1">₹{product.price}</span>
                                )}
                            </div>

                            {product.in_stock !== false ? (
                                quantity === 0 ? (
                                    <button
                                        onClick={handleAdd}
                                        className="px-4 py-2 bg-emerald-500 text-white font-bold text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                                    >
                                        ADD
                                    </button>
                                ) : (
                                    <div className="flex items-center bg-emerald-500 text-white rounded-lg overflow-hidden">
                                        <button onClick={handleDecrease} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-600 font-bold">−</button>
                                        <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                                        <button onClick={handleIncrease} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-600 font-bold">+</button>
                                    </div>
                                )
                            ) : (
                                <span className="px-3 py-1.5 bg-gray-100 text-gray-500 font-medium rounded-lg text-xs">Out of Stock</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Grid view mode (default)
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            {/* Product Image */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl sm:text-3xl opacity-50">📦</span>
                        </div>
                    </div>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && (
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                        {discountPercent}% OFF
                    </div>
                )}

                {/* Out of Stock Overlay */}
                {!product.in_stock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-semibold bg-black/70 px-3 py-1.5 rounded-lg text-xs">
                            Out of Stock
                        </span>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="p-3">
                {/* Name */}
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 min-h-[32px] sm:min-h-[40px]">
                    {product.name}
                </h3>

                {/* Unit */}
                <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5">
                    {product.unit_quantity} {product.unit}
                </p>

                {/* Price Row - Fixed Layout */}
                <div className="mt-2 sm:mt-3">
                    {/* Prices on top */}
                    <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-sm sm:text-base font-bold text-gray-900">
                            ₹{product.discount_price || product.price}
                        </span>
                        {hasDiscount && (
                            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
                                ₹{product.price}
                            </span>
                        )}
                    </div>

                    {/* Savings text */}
                    {hasDiscount && (
                        <p className="text-[10px] text-emerald-600 font-medium mb-2">
                            You save ₹{savings}
                        </p>
                    )}

                    {/* Add Button - Full Width */}
                    {product.in_stock !== false && (
                        quantity === 0 ? (
                            <button
                                onClick={handleAdd}
                                disabled={isAdding}
                                className={`w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-lg transition-all ${isAdding ? 'scale-95' : ''}`}
                            >
                                ADD
                            </button>
                        ) : (
                            <div className="flex items-center justify-center bg-emerald-500 text-white rounded-lg overflow-hidden">
                                <button
                                    onClick={handleDecrease}
                                    className="flex-1 py-2 flex items-center justify-center hover:bg-emerald-600 font-bold text-sm"
                                >
                                    −
                                </button>
                                <span className="px-3 font-bold text-sm">
                                    {quantity}
                                </span>
                                <button
                                    onClick={handleIncrease}
                                    className="flex-1 py-2 flex items-center justify-center hover:bg-emerald-600 font-bold text-sm"
                                >
                                    +
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
