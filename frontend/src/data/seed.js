export const seed = {
  branches: [
    { id: 1, branch_name: 'KFA Madambakkam Branch', location: 'Chennai - Madambakkam', phone: '9999999999' },
    { id: 2, branch_name: 'KFA Guduvanchery Branch', location: 'Chennai - Guduvanchery', phone: '8888888888' },
  ],
  courses: [
    { id: 1, course_name: 'Carnatic Vocals', description: 'Foundations, varnams, kritis, performance training', duration: '12 months', fees: 18000 },
    { id: 2, course_name: 'Keyboard and Piano', description: 'Notation, scales, harmony, stage practice', duration: '10 months', fees: 22000 },
    { id: 3, course_name: 'Guitar', description: 'Chords, rhythm, lead guitar, ensemble sessions', duration: '9 months', fees: 20000 },
    { id: 4, course_name: 'Classical Dance', description: 'Adavus, expression, repertoire, recital preparation', duration: '12 months', fees: 24000 },
  ],
  users: [
    { id: 1, name: 'Admin', dob: '1990-01-01', role: 'admin', email: 'admin@kfa.test', phone: '9000000001' },
    { id: 2, name: 'Ananya Rao', dob: '1992-05-12', role: 'staff', email: 'ananya@kfa.test', phone: '9000000002' },
    { id: 3, name: 'Rahul Nair', dob: '2005-05-20', role: 'student', email: 'rahul@kfa.test', phone: '9000000003' },
  ],
  staff: [{ id: 1, user_id: 2, name: 'Ananya Rao', specialization: 'Vocals and Keyboard', salary: 42000, branch_id: 1, branch_name: 'KFA Madambakkam Branch' }],
  students: [{ id: 1, user_id: 3, name: 'Rahul Nair', admission_date: '2026-04-01', parent_name: 'Meera Nair', branch_id: 1, branch_name: 'KFA Madambakkam Branch', account_status: 'active' }],
  classes: [
    { id: 1, course_id: 1, course_name: 'Carnatic Vocals', staff_id: 1, staff_name: 'Ananya Rao', branch_id: 1, branch_name: 'KFA Madambakkam Branch', day_of_week: 'Monday', start_time: '17:00', end_time: '18:00' },
    { id: 2, course_id: 2, course_name: 'Keyboard and Piano', staff_id: 1, staff_name: 'Ananya Rao', branch_id: 1, branch_name: 'KFA Madambakkam Branch', day_of_week: 'Wednesday', start_time: '18:00', end_time: '19:00' },
  ],
  enrollments: [{ id: 1, student_id: 1, student_name: 'Rahul Nair', course_id: 1, course_name: 'Carnatic Vocals', enrollment_date: '2026-04-01' }],
  attendance: [
    { id: 1, student_id: 1, student_name: 'Rahul Nair', class_id: 1, course_name: 'Carnatic Vocals', date: '2026-04-22', status: 'present' },
    { id: 2, student_id: 1, student_name: 'Rahul Nair', class_id: 1, course_name: 'Carnatic Vocals', date: '2026-04-24', status: 'absent' },
  ],
  fees: [{ id: 1, student_id: 1, student_name: 'Rahul Nair', branch_id: 1, branch_name: 'KFA Madambakkam Branch', fee_type: 'course', course_id: 1, course_name: 'Carnatic Vocals', total_amount: 18000, paid_amount: 0, due_amount: 18000, fee_frequency: 'monthly', billing_day: 1, due_day: 10, status: 'pending' }],
  payments: [],
  enquiries: [],
  notifications: [
    { id: 1, title: 'May batch timetable', message: 'Updated evening practice slots are live.', role: 'all', created_at: '2026-04-27' },
  ],
  class_media: [],
  programs: [
    { id: 1, program_name: 'Crayons', description: 'Creative foundation program for young learners', duration: '3 months', fees: 4500 },
    { id: 2, program_name: 'Oil Pastels', description: 'Color blending and artwork development program', duration: '4 months', fees: 6000 },
  ],
  grade_levels: [
    { id: 1, grade_name: 'Pre-Grade', level_order: 0, description: 'Introductory foundation level' },
    { id: 2, grade_name: 'Grade 1', level_order: 1, description: 'First formal grade level' },
    { id: 3, grade_name: 'Grade 2', level_order: 2, description: 'Intermediate grade level' },
  ],
  university_programs: [
    { id: 1, program_name: 'Diploma in Music', university_name: 'Music University', duration: '1 year', fees: 28000 },
  ],
  student_academics: [
    { id: 1, student_id: 1, student_name: 'Rahul Nair', program_id: 1, program_name: 'Crayons', grade_id: 1, grade_name: 'Pre-Grade', university_program_id: null, start_date: '2026-04-01', status: 'active' },
  ],
  grade_exams: [
    { id: 1, grade_id: 2, grade_name: 'Grade 1', exam_date: '2026-08-15' },
  ],
  university_exams: [
    { id: 1, university_program_id: 1, university_program_name: 'Diploma in Music', exam_name: 'Diploma Term 1', exam_date: '2026-09-10' },
  ],
  academic_results: [
    { id: 1, student_id: 1, student_name: 'Rahul Nair', grade_exam_id: 1, grade_name: 'Grade 1', university_exam_id: null, marks: 86, grade: 'A', result_status: 'pass' },
    { id: 2, student_id: 1, student_name: 'Rahul Nair', grade_exam_id: null, university_exam_id: 1, exam_name: 'Diploma Term 1', university_program_name: 'Diploma in Music', marks: 78, grade: 'B+', result_status: 'pass' },
  ],
  event_programs: [],
  event_program_items: [],
  event_program_teams: [],
  event_program_participants: [],
  event_program_charges: [],
}
