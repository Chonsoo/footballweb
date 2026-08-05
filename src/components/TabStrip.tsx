import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getNavTabs, activeTabIndex } from '../lib/navTabs'

// Tira de pestañas horizontal, visible solo en móvil (en escritorio ya está
// todo el listado en el Navbar). Es la navegación "a la vista" que pedía el
// usuario en vez de depender solo del menú hamburguesa — y como cada pestaña
// se resalta al navegar (toque o swipe), sirve también de indicador de "en
// qué página estás", sin necesitar un título aparte.
export default function TabStrip() {
  const location = useLocation()
  const tabs = getNavTabs()
  const activeIndex = activeTabIndex(location.pathname)
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      className="flex gap-1.5 overflow-x-auto border-b border-white/10 bg-brand-900/40 px-3 py-2 backdrop-blur-md md:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {tabs.map((tab, i) => (
        <NavLink
          key={tab.path}
          ref={i === activeIndex ? activeRef : undefined}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
            }`
          }
        >
          <span>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
