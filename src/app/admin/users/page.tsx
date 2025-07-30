
"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, Timestamp, query, orderBy, updateDoc, where, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { auth as firebaseAuth, db, firebaseConfig } from "@/lib/firebase";
import type { AppUser, UserStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserCog, Edit, Loader2, UserPlus, AlertTriangle, MoreHorizontal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddUserDialog, type AddUserFormData } from "@/components/admin/AddUserDialog";
import { EditUserDialog, type EditUserFormData } from "@/components/admin/EditUserDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";


async function callCreateUserBackendFunction(data: { email: string; password: string }): Promise<{ success: boolean; uid?: string; error?: string }> {
  const tempAppName = `auth-worker-admin-${Date.now()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
    return { success: true, uid: userCredential.user.uid };
  } catch (error: any) {
    console.error("Error creating auth user via temp app:", error);
    return { success: false, error: error.message || "Failed to create authentication user." };
  } finally {
    await deleteApp(tempApp);
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const { user: authUserFromContext } = useAuth();
  
  const fetchUsersList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: AppUser[] = [];
      querySnapshot.forEach((docInstance) => {
        const data = docInstance.data();
        fetchedUsers.push({ 
          id: docInstance.id, 
          username: data.username,
          email: data.email || null,
          displayName: data.displayName || null,
          role: data.role || 'student', 
          createdAt: data.createdAt, 
          lastLogin: data.lastLogin,   
          status: data.status || 'active',
          ...(data as Partial<Omit<AppUser, 'id'>>) 
        });
      });
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      let detailedError = "Failed to load users. Please try again.";
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        detailedError += " This might be due to missing Firestore indexes. Check the browser console for a link to create them (e.g., on 'createdAt' for the 'users' collection).";
      } else {
        detailedError += ` Error: ${err.message}`;
      }
      setError(detailedError);
      toast({ title: "Error Loading Users", description: detailedError, variant: "destructive", duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authUserFromContext?.role === 'admin') {
      fetchUsersList();
    } else if (authUserFromContext && authUserFromContext.role !== 'admin') {
      setError("Accessing this page requires an admin login.");
      setUsers([]);
      setIsLoading(false);
    } else if (!authUserFromContext) {
      setIsLoading(false);
      setError("Please log in as an admin to manage users.");
      setUsers([]);
    }
  }, [authUserFromContext]);


  const handleAddUser = async (data: AddUserFormData) => {
    if (authUserFromContext?.role !== 'admin') {
        toast({ title: "Error", description: "Admin user details not found or invalid role. Cannot create user.", variant: "destructive" });
        throw new Error("Admin user details not available or invalid role.");
    }

    try {
      const usernameQuery = query(collection(db, "users"), where("username", "==", data.username));
      const usernameSnap = await getDocs(usernameQuery);
      if (!usernameSnap.empty) {
        throw new Error("Username is already taken.");
      }

      const email = `${data.username}@edu-track.local`;
      const authResponse = await callCreateUserBackendFunction({ email, password: data.password });

      if (!authResponse.success || !authResponse.uid) {
        throw new Error(authResponse.error || "Backend function failed to create user.");
      }
      
      const newUserForFirestore: AppUser = {
        id: authResponse.uid,
        username: data.username,
        email: email,
        displayName: `${data.firstName} ${data.lastName}`,
        role: data.role,
        status: 'active',
        createdAt: Timestamp.now(),
        lastLogin: null,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        contactNumber: data.contactNumber,
      };

      if (data.role === 'teacher') {
        newUserForFirestore.yearsOfExperience = data.yearsOfExperience;
      } else if (data.role === 'principal') {
        newUserForFirestore.yearsInService = data.yearsInService;
      }


      await setDoc(doc(db, "users", newUserForFirestore.id), newUserForFirestore);

      toast({
        title: "User Created",
        description: `${newUserForFirestore.displayName} (${data.role}) has been successfully created.`,
      });
      
      await fetchUsersList(); // Refetch the list
      setIsAddUserDialogOpen(false);

    } catch (err: any) {
      console.error("Error creating user:", err);
      const errorMessage = err.message || "Failed to create user. The email might already be in use or the password is too weak.";
      toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
      throw err;
    }
  };

  const handleEditUser = (userToEdit: AppUser) => {
    if (authUserFromContext?.role !== 'admin') {
        toast({ title: "Action Denied", description: "Only admins can edit users.", variant: "destructive"});
        return;
    }
    setEditingUser(userToEdit);
    setIsEditUserDialogOpen(true);
  };
  
  const handleUpdateUser = async (data: EditUserFormData) => {
    if (!editingUser) return;
    
    const userDocRef = doc(db, "users", editingUser.id);
    try {
        const updatePayload: Partial<AppUser> = {
            displayName: `${data.firstName} ${data.lastName}`,
            ...data,
        };
        
        await updateDoc(userDocRef, updatePayload as { [x: string]: any });

        setUsers(prevUsers => prevUsers.map(u => 
            u.id === editingUser.id ? { ...u, ...updatePayload } : u
        ));

        toast({
            title: "User Updated",
            description: `Details for ${updatePayload.displayName} have been saved.`,
        });
        setIsEditUserDialogOpen(false);
        setEditingUser(null);
    } catch (err: any) {
        console.error("Error updating user:", err);
        toast({
            title: "Update Failed",
            description: err.message || "Could not save user details.",
            variant: "destructive"
        });
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: UserStatus) => {
     if (!authUserFromContext || userId === authUserFromContext.id) {
       toast({ title: "Action Denied", description: "You cannot change your own status.", variant: "destructive"});
       return;
     }

     try {
       const userDocRef = doc(db, "users", userId);
       await updateDoc(userDocRef, { status: newStatus });
       toast({ title: "Status Updated", description: `User status has been updated.` });
       setUsers(prevUsers => prevUsers.map(u => 
           u.id === userId ? { ...u, status: newStatus } : u
       ));
     } catch (err: any) {
       console.error("Error updating user status:", err);
       toast({ title: "Update Failed", description: err.message || "Could not update user status.", variant: "destructive" });
     }
  };
  
  const canManageUsers = authUserFromContext?.role === 'admin';

  const getStatusBadgeVariant = (status?: UserStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active':
        return 'default';
      case 'on_leave':
        return 'secondary';
      case 'dropped':
      case 'failed':
      case 'deactivated':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusOptionsForRole = (role: UserRole): UserStatus[] => {
    switch (role) {
      case 'student':
        return ['active', 'dropped', 'failed', 'transferred'];
      case 'teacher':
        return ['active', 'on_leave', 'deactivated'];
      case 'principal':
        return ['active', 'deactivated'];
      default:
        return ['active'];
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="sm:flex sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
              <UserCog className="h-8 w-8" /> User Management
            </CardTitle>
            <CardDescription>
              View, add, edit, and manage user accounts on the Edu-Track platform.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddUserDialogOpen(true)} className="mt-4 sm:mt-0" disabled={!canManageUsers || isLoading}>
            <UserPlus className="mr-2 h-4 w-4" /> Add New User
          </Button>
        </CardHeader>
      </Card>

      <AddUserDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={handleAddUser}
      />
      
      <EditUserDialog
        isOpen={isEditUserDialogOpen}
        onOpenChange={setIsEditUserDialogOpen}
        user={editingUser}
        onUserUpdated={handleUpdateUser}
      />

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all registered users.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading users...</p>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && !authUserFromContext && (
             <Alert variant="default">
              <AlertTitle>Login Required</AlertTitle>
              <AlertDescription>Please ensure you are logged in as an admin to manage users.</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && authUserFromContext?.role === 'admin' && (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead className="hidden md:table-cell">Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id} className={user.status !== 'active' ? 'opacity-60' : ''}>
                        <TableCell>{user.displayName || "N/A"}</TableCell>
                        <TableCell className="hidden md:table-cell">{user.username}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full capitalize
                              ${user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300' : ''}
                              ${user.role === 'principal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300' : ''}
                              ${user.role === 'teacher' ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300' : ''}
                              ${user.role === 'student' ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' : ''}
                            `}
                          >
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize">
                            {user.status?.replace('_', ' ') || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {user.createdAt instanceof Timestamp ? user.createdAt.toDate().toLocaleDateString() : 
                          (user.createdAt ? new Date(user.createdAt as string).toLocaleDateString() : 'N/A')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!canManageUsers || user.id === authUserFromContext.id}>
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Manage</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                                {user.role !== 'admin' && (
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      Update Status
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                        {getStatusOptionsForRole(user.role).map((statusOption) => (
                                          <DropdownMenuItem
                                            key={statusOption}
                                            onSelect={() => handleUpdateStatus(user.id, statusOption)}
                                            className="capitalize"
                                          >
                                            {statusOption.replace('_', ' ')}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        No users found. Use the "Add New User" button to create users.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
