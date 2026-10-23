import { useEffect, useState } from 'react'

// Tiny History-API router: enough for this app's handful of pages, no dependency.
export function navigate(to, { replace = false } = {}) {
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useLocation() {
  const read = () => ({ pathname: window.location.pathname.replace(/\/+$/, '') || '/', search: window.location.search })
  const [loc, setLoc] = useState(read)
  useEffect(() => {
    const onChange = () => setLoc(read())
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return loc
}

/** routes: [{ path: '/slip/:publicId', component }]. Returns { component, params } or null. */
export function matchRoute(routes, pathname) {
  for (const route of routes) {
    const names = []
    const pattern = route.path.replace(/:([A-Za-z]+)/g, (_, name) => {
      names.push(name)
      return '([^/]+)'
    })
    const m = pathname.match(new RegExp(`^${pattern}$`))
    if (m) return { component: route.component, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) }
  }
  return null
}

export function Link({ to, children, onClick, ...props }) {
  const handle = (e) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || props.target === '_blank') return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} onClick={handle} {...props}>
      {children}
    </a>
  )
}
