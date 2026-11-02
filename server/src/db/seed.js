// npm run seed -> adds demo accounts and sample courses, so you can try every screen right away.
// Safe to run more than once: existing emails and course names are skipped.
// It uses the same models as the app, so passwords are hashed and every rule is applied.
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Lesson = require('../models/lessonModel');
const Enrollment = require('../models/enrollmentModel');
const Exam = require('../models/examModel');
const Progress = require('../models/progressModel');
const { closeDb } = require('./index');

const DEMO_USERS = [
  { name: 'Demo Admin', email: 'admin@lms.local', password: 'Admin123!', role: 'admin' },
  { name: 'Ayşe Yılmaz', email: 'ayse@lms.local', password: 'Student123!', role: 'student' },
  { name: 'Mehmet Demir', email: 'mehmet@lms.local', password: 'Student123!', role: 'student' },
  { name: 'Zeynep Kaya', email: 'zeynep@lms.local', password: 'Student123!', role: 'student' },
];

// Two published courses with three lessons each, plus a draft to show that drafts stay hidden.
// "students" lists who is assigned. Zeynep has no courses, to show the empty "My courses" screen.
// "exam" (Week 3) is a short multiple-choice exam.
// "activity" (Week 4) is sample progress, so the admin's report has something to show:
// Mehmet completed 2 lessons and took the exam. Ayşe has done nothing yet, so she's ready for a demo.
const DEMO_COURSES = [
  {
    title: 'Introduction to Web Development',
    description: 'How websites work, from HTML and CSS to the requests a browser sends.',
    status: 'published',
    students: ['ayse@lms.local', 'mehmet@lms.local'],
    lessons: [
      {
        title: 'How the web works',
        description: 'Browsers, servers and the requests between them.',
        content:
          'When you open a website, your browser sends a request to a server.\n\nThe server answers with a response: usually an HTML page, or data such as JSON.\n\nIn this course you will see what is inside those requests and responses.',
        // Sample link only; replace it with a real lesson video.
        videoUrl: 'https://www.youtube.com/results?search_query=how+the+web+works',
      },
      {
        title: 'HTML basics',
        description: 'The structure of a page.',
        content:
          'HTML describes the structure of a page with elements such as headings, paragraphs and links.\n\nExample:\n<h1>Hello</h1>\n<p>This is a paragraph.</p>',
      },
      {
        title: 'Styling with CSS',
        description: 'Colours, spacing and layout.',
        content:
          'CSS controls how HTML looks: colours, fonts, spacing and layout.\n\nA rule has a selector and declarations:\np { color: green; }',
      },
    ],
    exam: {
      title: 'Web basics quiz',
      questions: [
        { text: 'What does HTML describe?', optionA: 'Colours', optionB: 'The structure of a page', optionC: 'Server code', optionD: 'A database', correctOption: 'B' },
        { text: 'Which language styles a page?', optionA: 'CSS', optionB: 'SQL', optionC: 'Python', optionD: 'JSON', correctOption: 'A' },
        { text: 'What does a browser send to a server?', optionA: 'A stylesheet', optionB: 'A database', optionC: 'A request', optionD: 'A video', correctOption: 'C' },
      ],
    },
    activity: [{ email: 'mehmet@lms.local', lessonsCompleted: 2, examAnswers: ['B', 'A', 'A'] }],
  },
  {
    title: 'Databases with SQL',
    description: 'Store and query data with tables, keys and relationships.',
    status: 'published',
    students: ['ayse@lms.local'],
    lessons: [
      {
        title: 'Tables and rows',
        description: 'How a relational database stores data.',
        content: 'A table has columns (the kind of data) and rows (one record each).\n\nExample: a users table with id, name and email.',
      },
      {
        title: 'Writing SELECT queries',
        description: 'Reading data with SQL.',
        content: 'SELECT reads data from a table:\n\nSELECT name, email FROM users WHERE role = \'student\';',
      },
      {
        title: 'Keys and relationships',
        description: 'Primary keys, foreign keys and JOIN.',
        content:
          'A primary key identifies each row. A foreign key points to a row in another table.\n\nJOIN combines rows from related tables in one query.',
      },
    ],
  },
  {
    title: 'Working with Git (draft)',
    description: 'Still being prepared, so assigned students cannot see it yet.',
    status: 'draft',
    students: ['ayse@lms.local'],
    lessons: [{ title: 'What is version control?', content: 'Coming soon.' }],
  },
];

// "1 lesson" / "3 lessons", for the messages this script prints.
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Creates the demo accounts, skipping any email that already exists.
async function seedUsers() {
  for (const u of DEMO_USERS) {
    if (User.findByEmail(u.email)) {
      console.log(`skip    ${u.email} (already exists)`);
      continue;
    }
    await User.create(u);
    console.log(`created ${u.email} (${u.role})`);
  }
}

// Creates the demo courses with their lessons and assigned students,
// skipping any course name that already exists.
function seedCourses() {
  const existingTitles = new Set(Course.listAll().map((c) => c.title));
  for (const c of DEMO_COURSES) {
    if (existingTitles.has(c.title)) {
      console.log(`skip    course "${c.title}" (already exists)`);
      continue;
    }
    const course = Course.create({ title: c.title, description: c.description, status: c.status });
    for (const lesson of c.lessons) {
      Lesson.create(course.id, { description: '', videoUrl: '', ...lesson });
    }
    if (c.exam) {
      const exam = Exam.saveForCourse(course.id, c.exam.title);
      for (const question of c.exam.questions) Exam.addQuestion(exam.id, question);
    }
    for (const email of c.students) {
      const student = User.findByEmail(email);
      if (student) Enrollment.assign(student.id, course.id);
    }
    for (const a of c.activity ?? []) seedActivity(course.id, a);
    console.log(`created course "${c.title}" (${c.status}, ${plural(c.lessons.length, 'lesson')}, ${plural(c.students.length, 'student')}${c.exam ? ', 1 exam' : ''})`);
  }
}

// Sample progress for one student: completes the first N lessons and, if answers are given,
// saves an exam result scored the same way as the real submit route (correct / total * 100).
function seedActivity(courseId, { email, lessonsCompleted, examAnswers }) {
  const student = User.findByEmail(email);
  if (!student) return;
  for (const lesson of Lesson.listByCourse(courseId).slice(0, lessonsCompleted)) {
    Progress.complete(student.id, lesson.id);
  }
  const exam = Exam.findByCourse(courseId);
  if (exam && examAnswers) {
    const questions = Exam.listQuestions(exam.id);
    const correctCount = questions.filter((q, i) => examAnswers[i] === q.correct_option).length;
    const score = Math.round((correctCount / questions.length) * 100);
    Exam.saveResult(student.id, exam.id, { correctCount, totalQuestions: questions.length, score });
  }
}

// Runs everything in order, prints the demo logins, then closes the database.
async function seed() {
  await seedUsers();
  seedCourses();
  console.log('\nDemo logins:');
  console.log('  admin@lms.local / Admin123!');
  console.log('  ayse@lms.local  / Student123!  (2 courses + a draft she can\'t see; nothing done yet: use her for demos)');
  console.log('  mehmet@lms.local / Student123! (1 course; 2 lessons done, exam taken: sample data for the report)');
  console.log('  zeynep@lms.local / Student123! (no courses yet)');
  closeDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
