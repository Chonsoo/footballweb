import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { NAV_TABS, activeTabIndex } from '../lib/navTabs'

// Tira de pestañas horizontal, visible solo en móvil (en escritorio ya está
// todo el listado en el Navbar). Es la navegación "a la vista" que pedía el
// usuario en vez de depender solo del menú hamburguesa — y como cada pestaña
// se resalta al navegar (toque o swipe), sirve también de indicador de "en
// qué página estás", sin necesitar un título aparte.
export default function TabStrip() {
  const location = useLocation()
  const activeIndex = activeTabIndex(location.pathname)
  const activeRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  return (
    <div
      className="flex gap-1.5 overflow-x-auto border-b border-brand-100 bg-white px-3 py-2 md:hidden"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_TABS.map((tab, i) => (
        <NavLink
          key={tab.path}
          ref={i === activeIndex ? activeRef : undefined}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive ? 'bg-brand-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
