
import type { NavItem, RoleNavConfig } from '@/types';
import { LayoutDashboard, UserCog, Settings, Target, List, Brain, Zap, Users, BookOpen, BookOpenCheck, Library, Award, TrendingUp, PieChart, BarChart3, Bookmark, Search, MessageSquare, GraduationCap, Activity } from 'lucide-react';

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
        title: 'Interactive Lessons',
        href: '/student/lessons',
        icon: BookOpen,
      },
      {
        title: 'Progress Tracker',
        href: '/student/my-progress', 
        icon: Target,
      },
       {
        title: 'Grades',
        href: '/student/grades',
        icon: GraduationCap,
      },
      {
        title: 'Achievements', 
        href: '/student/achievements',
        icon: Award,
      },
      {
        title: 'Learning Resources',
        href: '/student/resources',
        icon: List,
      },
      {
        title: 'AI Math Assistant',
        href: '/student/assistant',
        icon: Brain,
      },
      {
        title: 'Challenge Problems',
        href: '/student/challenges',
        icon: Zap,
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
        title: 'Grades',
        href: '/teacher/grades',
        icon: GraduationCap,
      },
      {
        title: 'Progress Overview',
        href: '/teacher/progress-overview',
        icon: TrendingUp, // Or PieChart or BarChart3
      },
      {
        title: 'Manage Students',
        href: '/teacher/students',
        icon: Users,
      },
      {
        title: 'Manage Sections',
        href: '/teacher/sections',
        icon: Bookmark,
      },
      {
        title: 'Quizzes', 
        href: '/teacher/quizzes',
        icon: BookOpenCheck, 
      },
      {
        title: 'Content Library',
        href: '/teacher/content',
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
        title: 'User Management',
        href: '/admin/users',
        icon: UserCog,
      },
       {
        title: 'Platform Analytics',
        href: '/admin/analytics',
        icon: BarChart3,
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
        title: 'Teacher Activity',
        href: '/principal/activity-monitoring',
        icon: Activity,
      },
      {
        title: 'Manage Teachers',
        href: '/principal/teachers',
        icon: UserCog,
      },
      {
        title: 'Manage Students',
        href: '/principal/students',
        icon: Users,
      },
    ],
    userDropdownNav: commonUserDropdownNav,
  },
};
