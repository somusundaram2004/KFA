export default function SectionTitle({ label, title }) {
  return (
    <div className="section-title">
      <span className="eyebrow">{label}</span>
      <h2>{title}</h2>
    </div>
  )
}
