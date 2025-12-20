
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin' | 'principal';

export type UserStatus = 'active' | 'dropped' | 'failed' | 'transferred' | 'on_leave' | 'deactivated' | 'inactive';

export interface UserProgressTopic {
  mastery: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Content Viewed';
  lastActivity: Timestamp;
  lessonsCompleted?: number;
  quizzesAttempted?: number;
  lastQuizScore?: number; // Percentage score for mastery calculation
  lastQuizCorrect?: number; // Raw number of correct answers
  lastQuizTotal?: number; // Raw total number of questions
  materialsViewed?: boolean;
}

export interface QuizResult {
  id: number;
  quizId: string;
  topic: string;
  score: number;
  total: number;
  percentage: number;
  submittedAt: Timestamp;
  timeSpent: number;
  difficulty: string;
  studentId: string;
  gradeLevel?: string;
}


export interface AppUser {
  id: string; // Firebase Auth UID
  username: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string;
  role: UserRole;
  createdAt?: Timestamp | Date | string;
  lastLogin?: Timestamp | Date | string | null;
  status?: UserStatus;

  // --- Detailed Credentials ---
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string; // "YYYY-MM-DD"
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  contactNumber?: string;

  // Role-specific IDs
  student_id?: string; // For students
  employmentId?: string; // For teachers

  // Teacher-specific
  yearsOfExperience?: number;
  qualifications?: string;
  academicYear?: string;
  studentCount?: number; // Number of students assigned to this teacher

  // Principal-specific
  yearsInService?: number;

  // Student-specific
  gradeLevel?: string;
  teacherId?: string; // Link to teacher's UID for students
  sectionId?: string;
  sectionName?: string;
  guardianFirstName?: string;
  guardianMiddleName?: string;
  guardianLastName?: string;
  guardianContact?: string;
  totalPoints?: number; // For leaderboard

  // App data
  progress?: Record<string, UserProgressTopic>;
  unlockedAchievementIds?: string[];
}


export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  children?: NavItem[];
  role?: UserRole[];
  isChild?: boolean;
}

export interface RoleNavConfig {
  sidebarNav: NavItem[];
  userDropdownNav: NavItem[];
}


export type QuestionType = 'multipleChoice' | 'identification' | 'enumeration' | 'problem-solving';

export interface QuizQuestion {
  id: string;
  text: string;
  questionType: QuestionType;
  options?: string[]; // For multiple choice
  correctAnswerIndex?: number; // For multiple choice
  answerKey?: string[]; // For identification (1 item) and enumeration (>1 items)
  explanation?: string;
}

export interface QuizDetails {
  questions: QuizQuestion[];
  randomizeQuestions?: boolean;
  timeLimitMinutes?: number;
  passingScore?: number;
}

export interface LessonMaterialDetails {
  content: string; // Rich text content for the lesson or a description of the file
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export type CourseContentItemType = 'quiz' | 'lessonMaterial';

export interface CourseContentItem {
  isPublished: any;
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  topic?: string;
  gradeLevel?: string;
  gradingPeriod: string;
  contentType: CourseContentItemType;
  dueDate?: Timestamp;
  content: QuizDetails | LessonMaterialDetails;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived?: boolean;
  sectionId?: string;
}

export interface TeacherActivity {
  id: string; // Firestore document ID
  teacherId: string;
  principalId?: string; // ID of principal if they registered a teacher
  message: string;
  timestamp: Timestamp;
  type: 'quiz_completion' | 'quiz_created' | 'lesson_material_created' | 'student_registered' | 'teacher_registered' | 'content_viewed' | 'other';
  relatedItemId?: string; // e.g., quizId, studentId
  relatedItemTitle?: string; // e.g., "You created a new assignment: Algebra Basics"
  studentName?: string; // Optional, if activity relates to a specific student
  studentId?: string; // Optional, to link to student
  link?: string; // Optional deep link, to the student's submission or the created content
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    readBy?: string[]; // Array of user IDs who have read the message
}

// Represents the top-level conversation document
export interface Conversation {
    id: string;
    participants: string[];
    lastMessage: string;
    lastUpdate: Timestamp;
    lastRead?: { [userId: string]: Timestamp };
}

export interface ResourceDownload {
  resourceId: string;
  studentId: string;
  downloadedAt: Timestamp;
}
