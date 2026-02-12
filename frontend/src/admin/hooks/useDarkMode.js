import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'tb-admin-dark-mode'

export function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored !== null) return stored === 'true'
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        } catch {
            return false
        }
    })

    useEffect(() => {
        const root = document.documentElement
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        try {
            localStorage.setItem(STORAGE_KEY, String(isDark))
        } catch { /* ignore */ }
    }, [isDark])

    const toggle = useCallback(() => setIsDark(prev => !prev), [])

    return { isDark, toggle }
}
