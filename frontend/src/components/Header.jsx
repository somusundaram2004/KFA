import logo from '../assets/Logo.png'

export default function Header({ session, navigate, logout, showAdminMenu, onAdminMenuClick, adminMenuOpen }) {
  return (
    <header className={`site-header${adminMenuOpen ? ' admin-menu-open' : ''}`}>
      <button className="brand" onClick={() => navigate('home')}>
        <img src={logo} alt="KFA logo" />
        <span>KFA Music Academy</span>
      </button>
      {showAdminMenu && (
        <button
          className="sidebar-toggle header-sidebar-toggle"
          type="button"
          aria-label={adminMenuOpen ? 'Close admin menu' : 'Open admin menu'}
          aria-expanded={adminMenuOpen}
          onClick={onAdminMenuClick}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
      <nav>
        <button onClick={() => navigate('home')}>Website</button>
        <button onClick={() => navigate('enquiry')}>Enquiry</button>
        {session ? (
          <>
            <button onClick={() => navigate(`${session.role}-dashboard`)}>Dashboard</button>
            <button className="solid" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('ladmin')}>Admin</button>
            <button className="solid" onClick={() => navigate('login')}>Student / Staff Login</button>
          </>
        )}
      </nav>
    </header>
  )
}
