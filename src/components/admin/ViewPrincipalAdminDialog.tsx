
"use client";

import React, { useRef, useState } from 'react';
import { AppUser } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '../ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ViewPrincipalAdminDialogProps {
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

export const ViewPrincipalAdminDialog: React.FC<ViewPrincipalAdminDialogProps> = ({ isOpen, onOpenChange, user }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!user) {
    return null;
  }
  
  const handleDownloadPdf = async () => {
    const elementToCapture = contentRef.current;
    if (!elementToCapture) return;

    setIsDownloading(true);

    const captureContainer = document.createElement('div');
    captureContainer.style.position = 'absolute';
    captureContainer.style.top = '-9999px';
    captureContainer.style.left = '0';
    document.body.appendChild(captureContainer);
    
    const clonedElement = elementToCapture.cloneNode(true) as HTMLDivElement;
    
    const scrollableContent = clonedElement.querySelector('#details-section') as HTMLDivElement;
    if (scrollableContent) {
      scrollableContent.style.maxHeight = 'none';
      scrollableContent.style.overflowY = 'visible';
    }

    clonedElement.style.width = '800px';
    clonedElement.style.backgroundColor = 'white';
    
    captureContainer.appendChild(clonedElement);
    
    try {
        const canvas = await html2canvas(clonedElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const imgRatio = imgProps.height / imgProps.width;
        const imgHeightInPdf = pdfWidth * imgRatio;

        let position = 0;
        let heightLeft = imgHeightInPdf;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = -heightLeft;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
            heightLeft -= pdfHeight;
        }

        pdf.save(`user-report-${user.username}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
    } finally {
        document.body.removeChild(captureContainer);
        setIsDownloading(false);
    }
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

        <div ref={contentRef} className="bg-background pt-6">
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
            </div>
            <div 
              id="details-section"
              className="max-h-[60vh] overflow-y-auto px-6 pb-6"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <DetailItem label="First Name" value={user.firstName} />
                            <DetailItem label="Last Name" value={user.lastName} />
                            <DetailItem label="Middle Name" value={user.middleName} />
                            <DetailItem label="Date of Birth" value={formatDate(user.dateOfBirth)} />
                            <DetailItem label="Gender" value={user.gender} />
                            <DetailItem label="Address" value={user.address} />
                            </div>
                        </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Professional Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {user.role === 'principal' && <DetailItem label="Years in Service" value={user.yearsInService} />}
                            <DetailItem label="Contact Number" value={user.contactNumber} />
                        </div>
                    </div>

                    <div className="space-y-4">
                         <Separator />
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
        <DialogFooter className="p-6 pt-4 border-t flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
           <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-[150px]">
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Download className="mr-2 h-4 w-4" /><span>Download PDF</span></>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
