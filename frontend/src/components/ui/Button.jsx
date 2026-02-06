export default function Button({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    fullWidth = false,
    icon,
}) {
    const baseClasses = 'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100'

    const variants = {
        primary: 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg hover:shadow-xl',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg',
        danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg',
        outline: 'border-2 border-gray-200 text-gray-700 hover:border-gray-300',
        ghost: 'text-gray-600 hover:bg-gray-100',
    }

    const sizes = {
        sm: 'px-4 py-2 text-sm min-h-[40px]',
        md: 'px-6 py-3 text-base min-h-[48px]',
        lg: 'px-8 py-4 text-lg min-h-[56px]',
        xl: 'px-10 py-5 text-xl min-h-[64px]', // Elder-friendly large button
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
        >
            {loading ? (
                <>
                    <span className="animate-spin">⏳</span>
                    <span>Loading...</span>
                </>
            ) : (
                <>
                    {icon && <span>{icon}</span>}
                    {children}
                </>
            )}
        </button>
    )
}
