import { useState } from 'react'
import logo from '../assets/Logo.png'

export default function Header({ session, navigate, logout, showAdminMenu, onAdminMenuClick, adminMenuOpen }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const menuOpen = showAdminMenu ? adminMenuOpen : mobileNavOpen

  function toggleMenu() {
    if (showAdminMenu) {
      onAdminMenuClick()
      return
    }
    setMobileNavOpen((open) => !open)
  }

  function go(next) {
    setMobileNavOpen(false)
    navigate(next)
  }

  function signOut() {
    setMobileNavOpen(false)
    logout()
  }

  const menuClass = menuOpen ? (showAdminMenu ? ' admin-menu-open' : ' mobile-nav-open') : ''

  return (
    <header className={`site-header${menuClass}`}>
      <button className="brand" onClick={() => go('home')}>
        <img src={logo} alt="KFA logo" />
        <span>KFA Music Academy</span>
      </button>
      <button
        className="sidebar-toggle header-sidebar-toggle"
        type="button"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav>
        {session ? (
          <>
            <button onClick={() => go('home')}>Home</button>
            <button onClick={() => go(`${session.role}-dashboard`)}>Dashboard</button>
            <button onClick={() => go('enquiry')}>Enquiry</button>
            <button className="solid" onClick={signOut}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => go('home')}>Home</button>
            <button onClick={() => go('enquiry')}>Enquiry</button>
            <button onClick={() => go('register-student')}>Student Register</button>
            <button onClick={() => go('ladmin')}>Admin</button>
            <button className="solid" onClick={() => go('login')}>Student / Staff Login</button>
          </>
        )}
      </nav>
    </header>
  )
}
