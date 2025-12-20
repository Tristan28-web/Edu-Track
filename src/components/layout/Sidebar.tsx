"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Sidebar as ShadcnSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  useSidebar,
  sidebarMenuButtonVariants,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, ChevronUp, Settings, UserCircle, Menu } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { siteConfig } from '@/config/site';
import type { NavItem, UserRole } from '@/types';
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const getCurrentRoleFromPath = (currentPathname: string): UserRole | null => {
    if (currentPathname.startsWith('/student')) return 'student';
    if (currentPathname.startsWith('/teacher')) return 'teacher';
    if (currentPathname.startsWith('/admin')) return 'admin';
    if (currentPathname.startsWith('/principal')) return 'principal';
    return null;
  };

  const currentRole = role || getCurrentRoleFromPath(pathname);
  const navItems = currentRole ? siteConfig[currentRole]?.sidebarNav || [] : [];

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleSubMenu = (title: string) => {
    setOpenMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <ShadcnSidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between p-4">
        {isMobile ? (
          <>
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription className="sr-only">Main navigation menu for the application.</SheetDescription>
          </>
        ) : (
          <>
            <span className="text-lg font-semibold pl-2 group-data-[state=collapsed]:hidden">Navigation</span>
            <SidebarTrigger />
          </>
        )}
      </SidebarHeader>

      <SidebarContent className="flex-grow">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              {item.children && item.children.length > 0 ? (
                <>
                  <SidebarMenuButton
                    onClick={() => toggleSubMenu(item.title)}
                    className={cn(
                      "justify-between",
                      pathname.startsWith(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                    tooltip={item.title}
                    isActive={pathname.startsWith(item.href)}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon && <item.icon />}
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </div>
                    {openMenus[item.title] ? <ChevronUp className="h-4 w-4 group-data-[state=collapsed]:hidden" /> : <ChevronDown className="h-4 w-4 group-data-[state=collapsed]:hidden" />}
                  </SidebarMenuButton>
                  {openMenus[item.title] && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                           <Link href={child.href} asChild>
                            <SidebarMenuSubButton
                              isActive={pathname === child.href}
                              onClick={handleLinkClick}
                              className={cn(child.isChild && "pl-6")}
                            >
                               {child.icon && <child.icon />}
                              <span className="group-data-[state=collapsed]:hidden">{child.title}</span>
                            </SidebarMenuSubButton>
                          </Link>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        sidebarMenuButtonVariants({ variant: 'default', size: 'default' }),
                        pathname === item.href && 'bg-sidebar-accent text-sidebar-accent-foreground'
                      )}
                      data-active={pathname === item.href} // Added for styling active state
                    >
                      {item.icon && <item.icon />}
                      <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className={cn(sidebarState === 'expanded' && isMobile === false && 'hidden')}
                  >
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </ShadcnSidebar>
  );
}
