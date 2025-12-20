
"use client";

import { AppUser, UserRole, UserStatus } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Eye, Trash2 } from "lucide-react";
import { Timestamp } from "firebase/firestore";

const getStatusBadgeVariant = (status?: UserStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'on_leave':
        return 'secondary';
      case 'terminated':
        return 'destructive';
      default:
        return 'outline';
    }
};

export const columns = (
    onEditTeacher: (teacher: AppUser) => void, 
    onDeleteTeacher: (teacherId: string) => void,
    onViewTeacher: (teacher: AppUser) => void,
    currentUser: AppUser | null
): ColumnDef<AppUser>[] => [
  {
    accessorKey: "displayName",
    header: "Display Name",
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }) => <div className="hidden md:table-cell">{row.original.username}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
        const { status } = row.original;
        return (
            <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
                {status?.replace('_', ' ') || 'Active'}
            </Badge>
        )
    }
  },
  {
    accessorKey: "academicYear",
    header: "Academic Year",
    cell: ({ row }) => {
        const { academicYear } = row.original;
        return <div className="hidden lg:table-cell text-xs">{academicYear || 'N/A'}</div>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const teacher = row.original;
      const canManage = currentUser?.role === 'principal' || currentUser?.role === 'admin';

      return (
        <div>
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Manage</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onViewTeacher(teacher)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </DropdownMenuItem>
                {canManage && (
                    <>
                        <DropdownMenuItem onSelect={() => onEditTeacher(teacher)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Teacher
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onDeleteTeacher(teacher.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Teacher
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
];
