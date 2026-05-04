export default function StatGrid({ stats }) {
  return (
    <div className="stats">
      {stats.map(([label, value]) => (
        <article key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </article>
      ))}
    </div>
  )
}
