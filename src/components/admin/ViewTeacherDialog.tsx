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


interface ViewTeacherDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: AppUser | null;
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

const ViewTeacherDialog: React.FC<ViewTeacherDialogProps> = ({ isOpen, onOpenChange, teacher }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!teacher) {
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
        
        pdf.save(`teacher-report-${teacher.username}.pdf`);
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
            <DialogTitle>Teacher Details: {teacher.displayName}</DialogTitle>
            <DialogDescription>A detailed view of the teacher's profile and information.</DialogDescription>
          </DialogHeader>
        </div>
        
        <div ref={contentRef} className="bg-background pt-6">
            <div className="flex flex-row items-center justify-between space-x-4 p-6">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 text-xl">
                      <AvatarImage src={teacher.avatarUrl || undefined} alt={teacher.displayName || 'Teacher'} />
                      <AvatarFallback>{getInitials(teacher.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold">{teacher.displayName}</h2>
                        <p className="text-md text-muted-foreground">{teacher.email}</p>
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
                            <DetailItem label="First Name" value={teacher.firstName} />
                            <DetailItem label="Last Name" value={teacher.lastName} />
                            <DetailItem label="Middle Name" value={teacher.middleName} />
                            <div className="space-y-4">
                                <DetailItem label="Date of Birth" value={formatDate(teacher.dateOfBirth)} />
                                <DetailItem label="Gender" value={teacher.gender} />
                            </div>
                            <div className="md:col-span-2">
                                <DetailItem label="Address" value={teacher.address} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-primary">Employment Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <DetailItem label="Qualifications" value={teacher.qualifications} />
                            <DetailItem label="Academic Year" value={teacher.academicYear} />
                            <DetailItem label="Contact Number" value={teacher.contactNumber} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Separator />
                        <h3 className="text-lg font-semibold text-primary">Account Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <DetailItem label="Username" value={teacher.username} />
                            <DetailItem label="Role" value={teacher.role} />
                             <DetailItem label="Status" value={<Badge variant={teacher.status === 'active' ? 'default' : 'secondary'} className="capitalize">{teacher.status?.replace('_', ' ') || 'Active'}</Badge>} />
                            <DetailItem label="Created At" value={formatTimestamp(teacher.createdAt)} />
                            <DetailItem label="Last Login" value={formatTimestamp(teacher.lastLogin)} />
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

export default ViewTeacherDialog;
