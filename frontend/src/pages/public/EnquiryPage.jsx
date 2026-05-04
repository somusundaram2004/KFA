import SectionTitle from '../../components/SectionTitle'
import InlineEnquiry from '../../components/InlineEnquiry'

export default function EnquiryPage({ onSubmit }) {
  return (
    <main className="page">
      <SectionTitle label="Admissions" title="Send an enquiry" />
      <InlineEnquiry onSubmit={onSubmit} />
    </main>
  )
}
