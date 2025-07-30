
import type { LucideIcon } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin' | 'principal';

export type UserStatus = 'active' | 'dropped' | 'failed' | 'transferred' | 'on_leave' | 'deactivated';

export interface UserProgressTopic {
  mastery: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Content Viewed';
  lastActivity: Timestamp;
  lessonsCompleted?: number; 
  quizzesAttempted?: number;
  lastQuizScore?: number; // Percentage score for mastery calculation
  lastQuizCorrect?: number; // Raw number of correct answers
  lastQuizTotal?: number; // Raw total number of questions
}

export interface AppUser { // Renamed from User to AppUser to avoid conflict with FirebaseUser
  id: string; // Firebase Auth UID
  username: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt?: Timestamp | Date | string; 
  lastLogin?: Timestamp | Date | string;  
  status?: UserStatus;
  quarterStatus?: {
    q1: boolean;
    q2: boolean;
    q3: boolean;
    q4: boolean;
  };

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

  // Teacher-specific
  yearsOfExperience?: number;

  // Principal-specific
  yearsInService?: number;

  // Student-specific
  teacherId?: string; // Link to teacher's UID for students
  sectionId?: string;
  sectionName?: string;
  guardianFirstName?: string;
  guardianMiddleName?: string;
  guardianLastName?: string;
  guardianContact?: string;
  
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

export type QuestionType = 'multipleChoice' | 'identification' | 'enumeration';

export interface QuizQuestion {
  id: string; 
  text: string;
  questionType: QuestionType;
  options?: string[]; // For multiple choice
  correctAnswerIndex?: number; // For multiple choice
  answerKey?: string[]; // For identification (1 item) and enumeration (>1 items)
}

export interface QuizDetails {
  questions: QuizQuestion[];
  randomizeQuestions?: boolean;
  timeLimitMinutes?: number;
}

export interface LessonMaterialDetails {
  mainContent?: string;
}

export type CourseContentItemType = 'quiz' | 'lessonMaterial';

export interface CourseContentItem {
  id: string; 
  teacherId: string;
  title: string;
  description?: string;
  topic: string; 
  gradingPeriod?: string; // e.g., "1st Quarter", "Finals"
  contentType: CourseContentItemType;
  dueDate?: Timestamp; 
  scheduledOn?: Timestamp; // For lesson scheduling
  content: QuizDetails | LessonMaterialDetails;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isArchived?: boolean;
}

export interface TeacherActivity {
  id: string; // Firestore document ID
  teacherId: string;
  message: string;
  timestamp: Timestamp;
  type: 'quiz_completion' | 'quiz_created' | 'lesson_material_created' | 'student_registered' | 'content_viewed' | 'other';
  relatedItemId?: string; // e.g., quizId, studentId
  relatedItemTitle?: string; // e.g., "You created a new assignment: Algebra Basics"
  studentName?: string; // Optional, if activity relates to a specific student
  studentId?: string; // Optional, to link to student
  link?: string; // Optional deep link, e.g., to the student's submission or the created content
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
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

export interface GradeResult {
  title: string;
  topic: string;
  score: number | null;
  total: number | null;
}
