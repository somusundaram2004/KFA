import SectionTitle from '../components/SectionTitle'

export default function AccessDenied({ role, navigate }) {
  return (
    <main className="page">
      <SectionTitle label="Access control" title="This dashboard is protected" />
      <button className="primary" onClick={() => navigate(`${role}-dashboard`)}>Go to your dashboard</button>
    </main>
  )
}
