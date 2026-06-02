export const DEMO_INSTRUCTOR = {
  email: "nichols@calpoly.edu",
  name: "Lara Nichols-Brown",
  initials: "LN",
  role: "professor"
};

export const DEMO_USERS = [
  {
    email: "jwon04@calpoly.edu",
    name: "Jerry Won",
    initials: "JW",
    role: "student"
  },
  DEMO_INSTRUCTOR
];

export const CLASS_ENROLLMENT_DATES = {
  csc307: "1/14/2026",
  csc203: "1/10/2026"
};

export const CLASS_RESOURCES = [
  { id: "syllabus", label: "Course Syllabus" },
  { id: "assignments", label: "Assignment Guidelines" },
  { id: "project", label: "Project Requirements" }
];

export const CLASS_ANNOUNCEMENTS = {
  csc307: [
    {
      id: "ann-1",
      title: "Project 2 Deadline Extended",
      body: "The deadline for Project 2 has been extended to next Friday. Make sure to submit before 11:59 PM.",
      time: "2 days ago"
    },
    {
      id: "ann-2",
      title: "Extra Office Hours This Week",
      body: "I'll be holding extra office hours on Thursday from 2-4 PM to help with the midterm review.",
      time: "5 days ago"
    }
  ],
  csc203: [
    {
      id: "ann-3",
      title: "Midterm Review Session",
      body: "Bring practice problems to Wednesday's review session.",
      time: "1 week ago"
    }
  ]
};

export const CLASS_CATALOG = {
  CSC307: {
    id: "csc307",
    title: "Introduction to Software Engineering",
    code: "CSC 307",
    joinCode: "CSC307",
    instructor: "Lara Nichols-Brown",
    description:
      "Introduction to software development methodologies and practices."
  },
  CSC203: {
    id: "csc203",
    title: "Data Structures",
    code: "CSC 203",
    joinCode: "CSC203",
    instructor: "Lara Nichols-Brown",
    description: "Fundamental data structures and algorithms"
  }
};

/** Default enrollments for first-time visitors (persisted after login). */
export const INITIAL_ENROLLED_IDS = ["csc307", "csc203"];

export const DEFAULT_SETTINGS = {
  emailNotifications: true,
  queueUpdates: true,
  classAnnouncements: true
};

/** Attach display instructor name to API-backed class rows (by join code / course code). */
export function enrichClassWithInstructor(course) {
  if (!course) return course;
  const catalog = Object.values(CLASS_CATALOG).find(
    (entry) =>
      entry.joinCode === course.joinCode ||
      entry.code === course.code ||
      entry.id === course.id
  );
  return {
    ...course,
    instructor: catalog?.instructor ?? DEMO_INSTRUCTOR.name
  };
}
