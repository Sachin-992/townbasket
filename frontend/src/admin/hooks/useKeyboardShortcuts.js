import { useEffect } from 'react'

/**
 * Register global keyboard shortcuts for the admin panel.
 * @param {Object} shortcuts - Map of key combos to callbacks
 *   e.g. { 'meta+k': openPalette, 'meta+b': toggleSidebar }
 */
export function useKeyboardShortcuts(shortcuts) {
    useEffect(() => {
        function handler(e) {
            const key = []
            if (e.metaKey || e.ctrlKey) key.push('meta')
            if (e.shiftKey) key.push('shift')
            key.push(e.key.toLowerCase())
            const combo = key.join('+')

            const cb = shortcuts[combo]
            if (cb) {
                e.preventDefault()
                cb()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [shortcuts])
}
