
import type { NavItem, UserRole } from '@/types';
import { LayoutDashboard, UserCog, Settings, Target, List, Brain, Zap, Users, BookOpen, BookOpenCheck, Library, Award, TrendingUp, PieChart, BarChart3, Bookmark, Search, MessageSquare, GraduationCap, Activity, ShieldAlert, QrCode, Mic, Trophy } from 'lucide-react';

export interface RoleNavConfig {
  sidebarNav: NavItem[];
  userDropdownNav: NavItem[];
}

export interface SiteConfig {
  student: RoleNavConfig;
  teacher: RoleNavConfig;
  admin: RoleNavConfig;
  principal: RoleNavConfig;
}

const commonUserDropdownNav: NavItem[] = [
  {
    title: 'Profile',
    href: '/profile',
    icon: UserCog,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];


export const siteConfig: SiteConfig = {
  student: {
    sidebarNav: [
      {
        title: 'Dashboard',
        href: '/student/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Messages',
        href: '/student/messages',
        icon: MessageSquare,
      },
      {
        title: 'My Progress',
        href: '/student/my-progress', 
        icon: Target,
      },
      {
        title: 'Leaderboard',
        href: '/leaderboard',
        icon: Trophy,
      },
      {
        title: 'Quizzes',
        href: '/student/quizzes',
        icon: BookOpenCheck,
      },
       {
        title: 'Resources',
        href: '/student/resources',
        icon: Library,
      },
      {
        title: 'AI Assistant',
        href: '/student/assistant',
        icon: Brain,
      },
    ],
    userDropdownNav: commonUserDropdownNav,
  },
  teacher: {
    sidebarNav: [
      {
        title: 'Dashboard',
        href: '/teacher/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Messages',
        href: '/teacher/messages',
        icon: MessageSquare,
      },
      {
        title: 'Progress Overview',
        href: '/teacher/progress-overview',
        icon: TrendingUp,
      },
      {
        title: 'Leaderboard',
        href: '/leaderboard',
        icon: Trophy,
      },
      {
        title: 'Student Management',
        href: '/teacher/students',
        icon: Users,
      },
      {
        title: 'Section Management',
        href: '/teacher/sections',
        icon: Bookmark,
      },
      {
        title: 'Quiz Management', 
        href: '/teacher/quizzes',
        icon: BookOpenCheck, 
      },
      {
        title: 'Resource Management',
        href: '/teacher/materials',
        icon: Library,
      },
    ],
    userDropdownNav: commonUserDropdownNav,
  },
  admin: {
    sidebarNav: [
      {
        title: 'Dashboard',
        href: '/admin/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Progress Overview',
        href: '/admin/progress-overview',
        icon: TrendingUp,
      },
      {
        title: 'Leaderboard',
        href: '/leaderboard',
        icon: Trophy,
      },
      {
        title: 'Platform Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
      },
      {
        title: 'User Reports',
        href: '/admin/reports',
        icon: ShieldAlert,
      },
      {
        title: 'User Management',
        href: '/admin/users',
        icon: UserCog,
      },
      {
        title: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ],
    userDropdownNav: commonUserDropdownNav,
  },
  principal: {
    sidebarNav: [
      {
        title: 'Dashboard',
        href: '/principal/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Progress Overview',
        href: '/principal/progress-overview',
        icon: TrendingUp,
      },
      {
        title: 'Leaderboard',
        href: '/leaderboard',
        icon: Trophy,
      },
      {
        title: 'Teacher Management',
        href: '/principal/teachers',
        icon: UserCog,
      },
      {
        title: 'Student Details',
        href: '/principal/students',
        icon: Users,
      },
      {
        title: 'Teacher Activity Monitor',
        href: '/principal/activity-monitoring',
        icon: Activity,
      },
    ],
    userDropdownNav: commonUserDropdownNav,
  },
};
