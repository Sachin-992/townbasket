import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext({})

export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([])
    const [cartShop, setCartShop] = useState(null)
    const [isInitialized, setIsInitialized] = useState(false)

    // Load cart from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('townbasket_cart')
        if (saved) {
            const { items, shop } = JSON.parse(saved)
            setCartItems(items || [])
            setCartShop(shop || null)
        }
        setIsInitialized(true)
    }, [])

    // Save cart to localStorage on change
    useEffect(() => {
        if (!isInitialized) return
        localStorage.setItem('townbasket_cart', JSON.stringify({
            items: cartItems,
            shop: cartShop,
        }))
    }, [cartItems, cartShop, isInitialized])

    const addToCart = (product, shop) => {
        // Check if adding from different shop
        if (cartShop && cartShop.id !== shop.id && cartItems.length > 0) {
            if (!window.confirm(`Your cart has items from ${cartShop.name}. Clear cart and add from ${shop.name}?`)) {
                return false
            }
            setCartItems([])
        }

        setCartShop(shop)

        setCartItems(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { product, quantity: 1 }]
        })
        return true
    }

    const removeFromCart = (productId) => {
        setCartItems(prev => prev.filter(item => item.product.id !== productId))
    }

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId)
            return
        }
        setCartItems(prev =>
            prev.map(item =>
                item.product.id === productId
                    ? { ...item, quantity }
                    : item
            )
        )
    }

    const clearCart = () => {
        setCartItems([])
        setCartShop(null)
    }

    const getItemQuantity = (productId) => {
        const item = cartItems.find(item => item.product.id === productId)
        return item ? item.quantity : 0
    }

    const cartTotal = cartItems.reduce((sum, item) => {
        const price = item.product.discount_price || item.product.price
        return sum + (parseFloat(price) * item.quantity)
    }, 0)

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

    const value = {
        cartItems,
        cartShop,
        cartTotal,
        cartCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
    }

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    )
}
