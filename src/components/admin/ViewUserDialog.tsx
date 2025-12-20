"use client";

import React, { useRef } from 'react';
import { AppUser } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

interface ViewUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: AppUser | null;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <div className="text-base">{value || "N/A"}</div>
  </div>
);

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

export const ViewUserDialog: React.FC<ViewUserDialogProps> = ({ isOpen, onOpenChange, user }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  if (!user) {
    return null;
  }
  
  const handlePrint = () => {
    window.print();
  };

  const formatTimestamp = (timestamp: any) => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return format(timestamp.toDate(), 'PPP p');
    }
    return 'N/A';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0">
         <div className="sr-only">
          <DialogHeader>
            <DialogTitle>User Details: {user.displayName}</DialogTitle>
            <DialogDescription>A detailed view of the user's profile and information.</DialogDescription>
          </DialogHeader>
        </div>
        <div ref={printRef} className="printable-content">
            <div className="hidden print:block p-6 border-b">
              <h1 className="text-2xl font-bold">User Details: {user.displayName}</h1>
              <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP p')}</p>
            </div>

            <div className="flex flex-row items-center justify-between space-x-4 p-6">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 text-xl">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold">{user.displayName}</h2>
                        <p className="text-md text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                <div className="print-hidden">
                    <Button type="button" onClick={handlePrint} variant="outline">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                </div>
            </div>
            <div className={cn("max-h-[60vh] overflow-y-auto px-6 print:max-h-full print:overflow-visible pb-6")} id="details-section">
                <div className="space-y-6">
                    <div className="print:grid print:grid-cols-2 print:gap-x-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-primary">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                <DetailItem label="First Name" value={user.firstName} />
                                <DetailItem label="Last Name" value={user.lastName} />
                                <DetailItem label="Middle Name" value={user.middleName} />
                                <DetailItem label="Date of Birth" value={formatDate(user.dateOfBirth)} />
                                <DetailItem label="Gender" value={user.gender} />
                                <div className="md:col-span-2">
                                    <DetailItem label="Address" value={user.address} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6 print:mt-0">
                            <h3 className="text-lg font-semibold text-primary">Professional Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                {user.role === 'teacher' && <DetailItem label="Years of Experience" value={user.yearsOfExperience} />}
                                {user.role === 'principal' && <DetailItem label="Years in Service" value={user.yearsInService} />}
                                <DetailItem label="Contact Number" value={user.contactNumber} />
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <DetailItem label="Username" value={user.username} />
                            <DetailItem label="Role" value={user.role} />
                             <DetailItem label="Status" value={<Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="capitalize">{user.status?.replace('_', ' ') || 'Active'}</Badge>} />
                            <DetailItem label="Created At" value={formatTimestamp(user.createdAt)} />
                            <DetailItem label="Last Login" value={formatTimestamp(user.lastLogin)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <DialogFooter className="p-6 pt-0 print-hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
