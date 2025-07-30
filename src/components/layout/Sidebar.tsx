
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
  sidebarMenuButtonVariants, // Import variants
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, ChevronDown, ChevronUp, Settings, UserCircle, Search } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { siteConfig } from '@/config/site';
import type { NavItem, UserRole } from '@/types';
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const { isMobile, setOpenMobile, state: sidebarState } = useSidebar();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const getCurrentRoleFromPath = (currentPathname: string): UserRole | null => {
    if (currentPathname.startsWith('/student')) return 'student';
    if (currentPathname.startsWith('/teacher')) return 'teacher';
    if (currentPathname.startsWith('/admin')) return 'admin';
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
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // Clear after search
      if (isMobile) {
        setOpenMobile(false);
      }
    }
  };

  return (
    <ShadcnSidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        {isMobile ? (
          <>
            <SheetTitle>Navigation Menu</SheetTitle>
            <div className="mt-1">
              <Logo size="sm" />
            </div>
          </>
        ) : (
          <Logo size="md" />
        )}
      </SidebarHeader>
      
      {currentRole === 'admin' && (
        <div className="p-2 group-data-[collapsible=icon]:hidden">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Global Search..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>
      )}

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
                      <span>{item.title}</span>
                    </div>
                    {openMenus[item.title] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </SidebarMenuButton>
                  {openMenus[item.title] && (
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                           <Link href={child.href} asChild>
                            <SidebarMenuSubButton
                              isActive={pathname === child.href}
                              onClick={handleLinkClick}
                              className={cn(child.isChild && "pl-6")} // Corrected typo here
                            >
                               {child.icon && <child.icon />}
                              <span>{child.title}</span>
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
                      <span>{item.title}</span>
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
      <SidebarFooter className="p-4">
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={logout}>
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
