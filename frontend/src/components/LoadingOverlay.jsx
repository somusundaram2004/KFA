import logo from '../assets/Logo.png'

export default function LoadingOverlay({ message = 'Loading' }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-mark" aria-hidden="true">
        <span></span>
        <img src={logo} alt="" />
      </div>
      <p>{message}</p>
    </div>
  )
}
