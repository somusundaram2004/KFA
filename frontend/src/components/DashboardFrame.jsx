export default function DashboardFrame({ title, role, children, fullScreen = false }) {
  return (
    <main className={fullScreen ? 'dashboard dashboard-full' : 'dashboard'}>
      {!fullScreen && (
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">{role}</span>
            <h1>{title}</h1>
          </div>
          <span className="status-pill">Live ERP</span>
        </div>
      )}
      {children}
    </main>
  )
}
