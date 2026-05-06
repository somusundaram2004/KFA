import { useState } from 'react'
import { API_ORIGIN } from '../../utils/api'
import SectionTitle from '../../components/SectionTitle'
import InlineEnquiry from '../../components/InlineEnquiry'
import { defaultSiteContent } from '../../data/siteContent'

const bgVideo = 'https://res.cloudinary.com/drreokecb/video/upload/v1777871039/Bgvideo_exgier.mp4'

function mediaSrc(url) {
  if (!url) return ''
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`
  if (url.startsWith('uploads/')) return `${API_ORIGIN}/${url}`
  if (url.startsWith('http://localhost:5000')) return url.replace('http://localhost:5000', API_ORIGIN)
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

function imageForTeacher(staff, index) {
  if (staff.photo_url) return mediaSrc(staff.photo_url)
  const specialization = (staff.specialization || '').toLowerCase()
  if (specialization.includes('dance')) return 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=900&q=80'
  if (specialization.includes('keyboard') || specialization.includes('piano')) return 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=80'
  if (specialization.includes('guitar')) return 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=80'
  if (specialization.includes('drum')) return 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=900&q=80'
  const fallbackImages = [
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=900&q=80',
  ]
  return fallbackImages[index % fallbackImages.length]
}

function formatTime(value) {
  if (!value) return ''
  const [hourValue, minute = '00'] = String(value).split(':')
  const hour = Number(hourValue)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${suffix}`
}

function courseLevel(courseName) {
  const name = courseName.toLowerCase()
  if (name.includes('dance')) return 'Kids, teens, and adults'
  if (name.includes('keyboard') || name.includes('piano') || name.includes('guitar')) return 'Beginner to intermediate'
  return 'Beginner to advanced'
}

function CourseCard({ course, onSelect }) {
  return (
    <article className="card">
      <img className="course-thumb" src={imageForCourse(course.course_name)} alt={`${course.course_name} class`} />
      <h3>{course.course_name}</h3>
      <p>{course.description}</p>
      <div className="meta-row">
        <span>{course.duration}</span>
        <strong>Rs. {Number(course.fees).toLocaleString('en-IN')}</strong>
      </div>
      <button className="course-detail-button" type="button" onClick={() => onSelect(course)}>View Details</button>
    </article>
  )
}

function CourseDetailModal({ course, onClose, onEnquire, siteContent }) {
  if (!course) return null

  return (
    <div className="course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title" onClick={onClose}>
      <article className="course-modal-panel" onClick={(event) => event.stopPropagation()}>
        <button className="lightbox-close" type="button" onClick={onClose}>Close</button>
        <img src={imageForCourse(course.course_name)} alt={`${course.course_name} class`} />
        <div className="course-modal-copy">
          <span className="eyebrow">Course Details</span>
          <h2 id="course-modal-title">{course.course_name}</h2>
          <p>{course.description}</p>
          <div className="course-detail-grid">
            <span><strong>Duration</strong>{course.duration || 'Flexible batches'}</span>
            <span><strong>Fees</strong>Rs. {Number(course.fees || 0).toLocaleString('en-IN')}</span>
            <span><strong>Level</strong>{courseLevel(course.course_name)}</span>
            <span><strong>Demo</strong>Free counselling available</span>
          </div>
          <div className="hero-actions">
            <button className="primary" type="button" onClick={() => onEnquire(course)}>Enquire for this course</button>
            <a className="whatsapp-inline" href={`https://wa.me/${siteContent.contactWhatsappNumber}?text=${encodeURIComponent(`Hi KFA Music Academy, I want details for ${course.course_name}.`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </article>
    </div>
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
  const [selectedCourse, setSelectedCourse] = useState(null)
  const savedContent = typeof data.site_content === 'string' ? JSON.parse(data.site_content || '{}') : data.site_content || {}
  const siteContent = { ...defaultSiteContent, ...savedContent }
  const themeStyle = {
    '--site-primary': siteContent.sitePrimaryColor,
    '--site-secondary': siteContent.siteSecondaryColor,
    '--site-dark': siteContent.siteDarkColor,
    '--site-light': siteContent.siteLightColor,
    '--site-surface': siteContent.siteSurfaceColor,
    '--site-hero-title-size': siteContent.heroTitleSize,
    '--site-section-spacing': siteContent.sectionSpacing,
    '--site-card-radius': siteContent.cardRadius,
    '--site-animation-strength': siteContent.animationStrength,
  }
  const testimonials = [
    { quote: siteContent.testimonialOneQuote, name: siteContent.testimonialOneName },
    { quote: siteContent.testimonialTwoQuote, name: siteContent.testimonialTwoName },
    { quote: siteContent.testimonialThreeQuote, name: siteContent.testimonialThreeName },
  ].filter((item) => item.quote || item.name)
  const eventHighlights = [
    [siteContent.eventOneTitle, siteContent.eventOneText],
    [siteContent.eventTwoTitle, siteContent.eventTwoText],
    [siteContent.eventThreeTitle, siteContent.eventThreeText],
  ].filter(([title, text]) => title || text)
  const branchLocations = (data.branches || []).map((branch) => {
    const branchClassCourses = (data.classes || [])
      .filter((item) => String(item.branch_id || '') === String(branch.id || ''))
      .map((item) => item.course_name)
      .filter(Boolean)
    const courses = [...new Set(branchClassCourses.length ? branchClassCourses : (data.courses || []).map((course) => course.course_name))]
    return {
      name: branch.branch_name || 'KFA Branch',
      academy: branch.branch_name || 'KFA Music Academy',
      address: branch.location || 'Tamil Nadu',
      courses: courses.length ? courses : ['Music', 'Dance', 'Instrument training'],
    }
  })
  const galleryItems = (data.class_media || []).filter((item) => item.media_url)
  const categories = ['All', 'Vocal', 'Instrument', 'Dance']
  const featuredClasses = (data.classes || []).slice(0, 6)
  const visibleCourses = data.courses.filter((course) => {
    const name = course.course_name.toLowerCase()
    if (activeCourse === 'All') return true
    if (activeCourse === 'Vocal') return name.includes('vocal')
    if (activeCourse === 'Instrument') return ['keyboard', 'piano', 'guitar', 'violin', 'drum'].some((word) => name.includes(word))
    return name.includes('dance')
  })

  function enquireForCourse() {
    setSelectedCourse(null)
    navigate('enquiry')
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  return (
    <main className="site-home" style={themeStyle}>
      <section className="hero-section">
        <video className="hero-bg-video" autoPlay muted loop playsInline aria-hidden="true">
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="hero-video-overlay" aria-hidden="true"></div>
        <div className="hero-copy">
          <span className="eyebrow">{siteContent.heroEyebrow}</span>
          <h1>{siteContent.heroTitle}</h1>
          <p>{siteContent.heroText}</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => navigate('enquiry')}>{siteContent.heroPrimaryButton}</button>
            <button onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>{siteContent.heroSecondaryButton}</button>
          </div>
          <div className="trust-row">
            <span>{siteContent.trustOne}</span>
            <span>{siteContent.trustTwo}</span>
            <span>{siteContent.trustThree}</span>
          </div>
        </div>
        <div className="hero-stat"><strong>{siteContent.heroStatNumber}</strong><span>{siteContent.heroStatLabel}</span></div>
      </section>
      <section className="band about-grid">
        <div>
          <span className="eyebrow">{siteContent.aboutLabel}</span>
          <h2>{siteContent.aboutTitle}</h2>
        </div>
        <p>{siteContent.aboutText}</p>
      </section>
      <section className="section highlights">
        <article><strong>{siteContent.highlightOneTitle}</strong><span>{siteContent.highlightOneText}</span></article>
        <article><strong>{siteContent.highlightTwoTitle}</strong><span>{siteContent.highlightTwoText}</span></article>
        <article><strong>{siteContent.highlightThreeTitle}</strong><span>{siteContent.highlightThreeText}</span></article>
        <article><strong>{siteContent.highlightFourTitle}</strong><span>{siteContent.highlightFourText}</span></article>
      </section>
      <section className="section" id="courses">
        <SectionTitle label={siteContent.coursesLabel} title={siteContent.coursesTitle} />
        <div className="filter-tabs" aria-label="Course categories">
          {categories.map((category) => (
            <button className={activeCourse === category ? 'active' : ''} key={category} onClick={() => setActiveCourse(category)}>
              {category}
            </button>
          ))}
        </div>
        <div className="card-grid">
          {visibleCourses.map((course) => <CourseCard key={course.id} course={course} onSelect={setSelectedCourse} />)}
        </div>
      </section>
      <section className="band branch-courses">
        <SectionTitle label={siteContent.branchCoursesLabel} title={siteContent.branchCoursesTitle} />
        <div className="branch-course-grid">
          {branchLocations.map((branch) => (
            <article key={branch.name}>
              <span>{branch.name}</span>
              <h3>{branch.academy}</h3>
              <ul>
                {branch.courses.map((course) => <li key={course}>{course}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="section timetable-section">
        <SectionTitle label={siteContent.timingLabel} title={siteContent.timingTitle} />
        <div className="timetable-grid">
          <article className="timing-card">
            <strong>{siteContent.weekdayTitle}</strong>
            <span>{siteContent.weekdaySubtitle}</span>
            <p>{siteContent.weekdayTime}</p>
          </article>
          <article className="timing-card">
            <strong>{siteContent.weekendTitle}</strong>
            <span>{siteContent.weekendSubtitle}</span>
            <p>{siteContent.weekendTime}</p>
          </article>
          {featuredClasses.map((item) => (
            <article className="schedule-card" key={item.id}>
              <strong>{item.course_name}</strong>
              <span>{item.branch_name || 'KFA Branch'}</span>
              <p>{item.day_of_week} · {formatTime(item.start_time)} - {formatTime(item.end_time)}</p>
            </article>
          ))}
        </div>
      </section>
      {!!galleryItems.length && (
        <section className="band">
          <SectionTitle label={siteContent.galleryLabel} title={siteContent.galleryTitle} />
          <MediaGallery media={galleryItems} />
        </section>
      )}
      <section className="band">
        <SectionTitle label={siteContent.facultyLabel} title={siteContent.facultyTitle} />
        <div className="faculty-list">
          {data.staff.map((staff, index) => (
            <article className="teacher-card" key={staff.id} style={{ '--teacher-delay': `${index * 0.12}s` }}>
              <div className="teacher-card-copy">
                <strong>{staff.name}</strong>
                <span>{staff.specialization || 'Music Mentor'}</span>
                {staff.bio && <small>{staff.bio}</small>}
              </div>
              <img className="teacher-card-photo" src={imageForTeacher(staff, index)} alt={`${staff.name} teacher`} />
            </article>
          ))}
        </div>
      </section>
      <section className="section two-column">
        <div>
          <SectionTitle label={siteContent.testimonialsLabel} title={siteContent.testimonialsTitle} />
          <div className="testimonial-strip">
            {testimonials.map((item) => (
              <blockquote key={item.name}>
                "{item.quote}"
                <span>- {item.name}</span>
              </blockquote>
            ))}
          </div>
        </div>
        <InlineEnquiry onSubmit={onEnquiry} />
      </section>
      <section className="band event-highlights">
        <SectionTitle label={siteContent.eventsLabel} title={siteContent.eventsTitle} />
        <div className="event-grid">
          {eventHighlights.map(([title, text]) => (
            <article key={title}>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="admission-banner">
        <div>
          <span className="eyebrow">{siteContent.admissionEyebrow}</span>
          <h2>{siteContent.admissionTitle}</h2>
        </div>
        <div className="admission-actions">
          <button className="primary" onClick={() => navigate('register-student')}>Register Student</button>
          <button onClick={() => navigate('enquiry')}>{siteContent.admissionButton}</button>
        </div>
      </section>
      <section className="section branch-locations">
        <SectionTitle label={siteContent.branchesLabel} title={siteContent.branchesTitle} />
        <div className="branch-location-shell">
          {branchLocations.map((branch) => {
            const mapQuery = `${branch.academy}, ${branch.address}`
            return (
              <article className="branch-location-card" key={branch.name}>
                <div className="branch-map-copy">
                  <span className="branch-tag">{branch.name}</span>
                  <h3>{branch.academy}</h3>
                  <p>{branch.address}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
                <div className="branch-map-frame">
                  <iframe
                    title={`${branch.name} map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </article>
            )
          })}
        </div>
      </section>
      <section className="contact-strip">
        <span>Call / WhatsApp: {siteContent.contactPhoneDisplay}</span>
        <span>Email: {siteContent.contactEmail}</span>
        <span>Open: {siteContent.contactHours}</span>
      </section>
      <a className="floating-whatsapp" href={`https://wa.me/${siteContent.contactWhatsappNumber}?text=${encodeURIComponent(siteContent.whatsappMessage)}`} target="_blank" rel="noreferrer" aria-label="Enquire on WhatsApp">
        <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <path d="M16 3.4c-6.9 0-12.5 5.4-12.5 12.1 0 2.4.7 4.7 2.1 6.7l-1.4 6.4 6.6-1.5c1.6.8 3.4 1.2 5.2 1.2 6.9 0 12.5-5.4 12.5-12.1S22.9 3.4 16 3.4Zm0 22.8c-1.6 0-3.1-.4-4.5-1.2l-.5-.3-3.9.9.8-3.8-.3-.5c-1.2-1.7-1.8-3.7-1.8-5.8 0-5.5 4.6-10 10.2-10s10.2 4.5 10.2 10-4.6 10.7-10.2 10.7Zm5.8-7.4c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.8-1-2.4-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.8.2 1.4.2 2 .1.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.3-.2-.5-.3-.8-.4Z" />
        </svg>
      </a>
      <CourseDetailModal course={selectedCourse} onClose={() => setSelectedCourse(null)} onEnquire={enquireForCourse} siteContent={siteContent} />
    </main>
  )
}

