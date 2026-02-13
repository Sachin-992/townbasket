import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SignupPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const { signUp, resendConfirmationEmail } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        setError('')

        if (!name.trim()) {
            setError('Please enter your name')
            return
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address')
            return
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        const { data, error: signUpError } = await signUp(email, password, name)
        setLoading(false)

        if (signUpError) {
            setError(signUpError.message || 'Failed to create account')
        } else {
            setSuccess(true)
        }
    }

    const handleResendEmail = async () => {
        setResending(true)
        setError('')
        const { error: resendError } = await resendConfirmationEmail(email)
        setResending(false)

        if (resendError) {
            setError(resendError.message || 'Failed to resend email')
        } else {
            setError('')
            toast.success('Confirmation email sent! Please check your inbox and spam folder.')
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white grid lg:grid-cols-2 selection:bg-emerald-100">
                {/* Left Side: Visual Hero */}
                <div className="hidden lg:flex relative bg-emerald-600 overflow-hidden flex-col p-12 xl:p-16">
                    {/* Dynamic Background Elements */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                    </div>

                    {/* Logo Section */}
                    <div className="relative z-20 flex items-center gap-4 group">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/20 group-hover:scale-105 transition-transform duration-300">
                            <span className="text-emerald-600 text-3xl font-black">T</span>
                        </div>
                        <div>
                            <span className="text-3xl font-black tracking-tight text-white block">TownBasket</span>
                            <span className="text-emerald-200 text-sm font-medium tracking-widest uppercase">Community First</span>
                        </div>
                    </div>

                    {/* Main Hero Content */}
                    <div className="flex-1 flex flex-col justify-center relative z-10 text-white mt-8">
                        <h1 className="text-5xl xl:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                            Welcome to the<br />
                            <span className="text-emerald-300">family</span>, {name.split(' ')[0]}!
                        </h1>

                        <p className="text-emerald-100/90 text-xl max-w-lg font-medium leading-relaxed mb-8">
                            You're just one step away from connecting with your local community.
                        </p>
                    </div>

                    {/* Footer Links */}
                    <div className="relative z-10 pt-8 border-t border-emerald-500/50 text-white mt-auto">
                        <p className="text-sm font-medium opacity-60">© {new Date().getFullYear()} TownBasket. All rights reserved.</p>
                    </div>
                </div>

                {/* Right Side: Success Message */}
                <div className="flex flex-col justify-center items-center p-8 lg:p-12 bg-gray-50/30 overflow-y-auto">
                    <div className="w-full max-w-[480px] text-center space-y-6">
                        <div className="w-24 h-24 bg-emerald-100 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-emerald-500/10">
                            <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Account Created!</h2>
                            <p className="text-gray-500 text-lg font-medium">Verification email sent to:</p>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden text-left">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-12 -translate-y-12" />
                            <p className="font-black text-emerald-700 text-xl lg:text-2xl break-all mb-4 relative z-10">{email}</p>
                            <p className="text-gray-500 font-medium leading-relaxed text-sm">Please check your inbox (and spam folder) to activate your account. This secures your community experience.</p>
                        </div>

                        <div className="space-y-4 pt-4">
                            <Link
                                to="/login"
                                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <span>Proceed to Login</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>

                            <button
                                onClick={handleResendEmail}
                                disabled={resending}
                                className="w-full text-emerald-600 font-bold py-4 hover:bg-emerald-50 rounded-2xl transition-all disabled:opacity-50"
                            >
                                {resending ? 'Sending...' : 'Resend Verification Email'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white grid lg:grid-cols-2 selection:bg-emerald-100">
            {/* Left Side: Visual Hero */}
            <div className="hidden lg:flex relative bg-emerald-600 overflow-hidden flex-col p-12 xl:p-16">
                {/* Dynamic Background Elements */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
                </div>

                {/* Logo Section */}
                <div className="relative z-20 flex items-center gap-4 group">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/20 group-hover:scale-105 transition-transform duration-300">
                        <span className="text-emerald-600 text-3xl font-black">T</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black tracking-tight text-white block">TownBasket</span>
                        <span className="text-emerald-200 text-sm font-medium tracking-widest uppercase">Community First</span>
                    </div>
                </div>

                {/* Main Hero Content */}
                <div className="flex-1 flex flex-col justify-center relative z-10 text-white mt-8">
                    <h1 className="text-5xl xl:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                        Join the<br />
                        <span className="text-emerald-300">heart</span> of your<br />
                        town.
                    </h1>

                    <p className="text-emerald-100/90 text-xl max-w-lg font-medium leading-relaxed mb-8">
                        Become part of the most trusted town-first digital ecosystem. Local shops, fast delivery, no compromises.
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-4">
                        {['Fast Onboarding', 'Verified Shops', 'Secure Platform'].map((feature) => (
                            <div key={feature} className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold shadow-lg">
                                {feature}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Footer (Signup Specific) */}
                <div className="relative z-10 grid grid-cols-2 gap-12 pt-8 border-t border-emerald-500/50 text-white mt-auto">
                    <div className="space-y-1">
                        <p className="text-2xl font-black italic underline decoration-emerald-300">Town-First</p>
                        <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest">Our Promise</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-2xl font-black italic underline decoration-emerald-300">Trust-First</p>
                        <p className="text-emerald-200/80 text-xs font-bold uppercase tracking-widest">Our Value</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Authentication Form */}
            <div className="flex flex-col justify-center items-center p-8 lg:p-12 bg-gray-50/30 overflow-y-auto">
                <div className="w-full max-w-[480px] space-y-6">
                    {/* Header */}
                    <div className="text-center lg:text-left space-y-3">
                        {/* Mobile-only Logo */}
                        <div className="lg:hidden w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-emerald-200 mb-6">
                            <span className="text-white text-3xl font-black">T</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Create Account</h2>
                        <p className="text-gray-500 text-lg font-medium">Get started with TownBasket today.</p>
                    </div>

                    {/* Auth Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden group">
                        <form onSubmit={handleSignup} className="space-y-5 relative z-10">
                            <div className="space-y-2">
                                <label htmlFor="signup-name" className="text-sm font-bold text-gray-700 ml-1">Full Name</label>
                                <input
                                    id="signup-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    autoComplete="name"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="signup-email" className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="signup-password" className="text-sm font-bold text-gray-700 ml-1">Password</label>
                                    <input
                                        id="signup-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min 6 chars"
                                        autoComplete="new-password"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="signup-confirm" className="text-sm font-bold text-gray-700 ml-1">Confirm</label>
                                    <input
                                        id="signup-confirm"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Verify"
                                        autoComplete="new-password"
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none font-medium text-gray-900 shadow-inner"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email || !password || !name}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white h-14 rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Creating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Join TownBasket</span>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer Links */}
                    <div className="flex flex-col items-center gap-6">
                        <p className="text-gray-500 font-bold">
                            Already have an account?{' '}
                            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-4 decoration-2 transition-all">
                                Sign In
                            </Link>
                        </p>

                        <div className="flex items-center gap-3">
                            <span className="w-8 h-px bg-gray-200" />
                            <div className="px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Town-First &bull; Trust-First</span>
                            </div>
                            <span className="w-8 h-px bg-gray-200" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
