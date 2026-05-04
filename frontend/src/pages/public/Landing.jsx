import { useState } from 'react'
import bgVideo from '../../assets/Bgvideo.mp4'
import SectionTitle from '../../components/SectionTitle'
import InlineEnquiry from '../../components/InlineEnquiry'

function mediaSrc(url) {
  if (!url) return ''
  if (url.startsWith('/uploads')) return `http://localhost:5000${url}`
  return url
}

function imageForCourse(courseName) {
  const name = courseName.toLowerCase()
  if (name.includes('vocal') || name.includes('carnatic')) return 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80'
  if (name.includes('keyboard') || name.includes('piano')) return 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=1200&q=80'
  if (name.includes('drum') || name.includes('percussion')) return 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=1200&q=80'
  if (name.includes('dance') || name.includes('bharatham')) return 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80'
  return 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80'
}

function CourseCard({ course }) {
  return (
    <article className="card">
      <img className="course-thumb" src={imageForCourse(course.course_name)} alt={`${course.course_name} class`} />
      <h3>{course.course_name}</h3>
      <p>{course.description}</p>
      <div className="meta-row">
        <span>{course.duration}</span>
        <strong>Rs. {Number(course.fees).toLocaleString('en-IN')}</strong>
      </div>
    </article>
  )
}

function MediaGallery({ media }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const shouldScroll = media.length > 3
  const scrollingMedia = shouldScroll ? [...media, ...media] : media

  return (
    <>
      <div className="media-scroll">
        <div className={`media-track${shouldScroll ? '' : ' media-track-static'}`}>
          {scrollingMedia.map((item, index) => (
            <button className="media-card" key={`${item.id}-${index}`} type="button" onClick={() => item.media_type === 'photo' && setSelectedPhoto(item)}>
              {item.media_type === 'video' ? (
                <iframe
                  title={item.title}
                  src={item.media_url}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <img src={mediaSrc(item.media_url)} alt={item.title} />
              )}
              <div>
                <span>{item.media_type}</span>
                <strong>{item.title}</strong>
              </div>
            </button>
          ))}
        </div>
      </div>
      {selectedPhoto && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setSelectedPhoto(null)}>
          <button className="lightbox-close" type="button" onClick={() => setSelectedPhoto(null)}>Close</button>
          <figure className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <img src={mediaSrc(selectedPhoto.media_url)} alt={selectedPhoto.title} />
            <figcaption>
              <span>{selectedPhoto.media_type}</span>
              <strong>{selectedPhoto.title}</strong>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  )
}

export default function Landing({ data, navigate, onEnquiry }) {
  const [activeCourse, setActiveCourse] = useState('All')
  const galleryItems = (data.class_media || []).filter((item) => item.media_url)
  const categories = ['All', 'Vocal', 'Instrument', 'Dance']
  const visibleCourses = data.courses.filter((course) => {
    const name = course.course_name.toLowerCase()
    if (activeCourse === 'All') return true
    if (activeCourse === 'Vocal') return name.includes('vocal')
    if (activeCourse === 'Instrument') return ['keyboard', 'piano', 'guitar', 'violin', 'drum'].some((word) => name.includes(word))
    return name.includes('dance')
  })

  return (
    <main>
      <section className="hero-section">
        <video className="hero-bg-video" autoPlay muted loop playsInline aria-hidden="true">
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="hero-video-overlay" aria-hidden="true"></div>
        <div className="hero-copy">
          <span className="eyebrow">Admissions open for 2026</span>
          <h1>Learn music, instruments, and dance with stage-ready training</h1>
          <p>KFA Music Academy helps children, teens, and adults build confidence through structured classes, expert faculty, personal attention, and regular performance practice.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate('enquiry')}>Book a Free Demo Class</button>
            <button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>View Courses</button>
          </div>
          <div className="trust-row">
            <span>Weekend and weekday batches</span>
            <span>Beginner to advanced levels</span>
            <span>Performance-focused learning</span>
          </div>
        </div>
        <div className="hero-stat"><strong>4+</strong><span>creative programs</span></div>
      </section>
      <section className="band about-grid">
        <div>
          <span className="eyebrow">About KFA</span>
          <h2>A focused academy for music, rhythm, and performance</h2>
        </div>
        <p>From first notes to confident stage presence, our classes blend technique, discipline, creativity, and guided practice. Parents and learners get clear schedules, updates, and progress visibility through the academy portal.</p>
      </section>
      <section className="section highlights">
        <article><strong>Personal coaching</strong><span>Small batches with attention to each learner</span></article>
        <article><strong>Certified curriculum</strong><span>Step-by-step training with practice targets</span></article>
        <article><strong>Stage exposure</strong><span>Recitals, showcases, and confidence building</span></article>
        <article><strong>Parent updates</strong><span>Attendance, fees, and schedule visibility</span></article>
      </section>
      <section className="section" id="courses">
        <SectionTitle label="Courses" title="Choose your creative path" />
        <div className="filter-tabs" aria-label="Course categories">
          {categories.map((category) => (
            <button className={activeCourse === category ? 'active' : ''} key={category} onClick={() => setActiveCourse(category)}>
              {category}
            </button>
          ))}
        </div>
        <div className="card-grid">
          {visibleCourses.map((course) => <CourseCard key={course.id} course={course} />)}
        </div>
      </section>
      {!!galleryItems.length && (
        <section className="band">
          <SectionTitle label="Class Gallery" title="Photos and videos from our learning spaces" />
          <MediaGallery media={galleryItems} />
        </section>
      )}
      <section className="band">
        <SectionTitle label="Faculty" title="Learn with experienced mentors" />
        <div className="faculty-list">
          {data.staff.map((staff) => (
            <article key={staff.id}>
              <strong>{staff.name}</strong>
              <span>{staff.specialization}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="section two-column">
        <div>
          <SectionTitle label="Testimonials" title="Loved by students and parents" />
          <blockquote>"KFA made learning music disciplined and joyful. The demo class helped us choose the right course, and the regular updates keep us involved."</blockquote>
          <div className="testimonial-name">- Parent of a keyboard student</div>
        </div>
        <InlineEnquiry onSubmit={onEnquiry} />
      </section>
      <section className="admission-banner">
        <div>
          <span className="eyebrow">New batches starting soon</span>
          <h2>Start with a free counselling and demo session</h2>
        </div>
        <button className="primary" onClick={() => navigate('enquiry')}>Enquire Now</button>
      </section>
      <section className="contact-strip">
        <span>Call: +91 90000 00000</span>
        <span>Email: admissions@kfaacademy.test</span>
        <span>Open: Mon-Sat, 9 AM-8 PM</span>
      </section>
    </main>
  )
}
