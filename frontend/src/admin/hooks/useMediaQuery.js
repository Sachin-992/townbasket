import { useState, useEffect, useCallback } from 'react'

/**
 * SSR-safe media query hook with debounced resize.
 * @param {string} query - CSS media query string
 * @returns {boolean}
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia(query).matches
    })

    useEffect(() => {
        const mql = window.matchMedia(query)
        const handler = (e) => setMatches(e.matches)
        mql.addEventListener('change', handler)
        setMatches(mql.matches)
        return () => mql.removeEventListener('change', handler)
    }, [query])

    return matches
}

/** @returns {boolean} true when viewport < 768px */
export function useIsMobile() {
    return useMediaQuery('(max-width: 767px)')
}

/** @returns {boolean} true when viewport < 1024px */
export function useIsTablet() {
    return useMediaQuery('(max-width: 1023px)')
}
