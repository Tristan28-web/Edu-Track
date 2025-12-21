"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, AlertTriangle, FileText, ChevronRight, Users, BookOpen, BarChart3, Eye, UserCheck, GraduationCap, Download } from "lucide-react";
import type { CourseContentItem, AppUser, QuizResult } from "@/types";
import { mathTopics } from "@/config/topics";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResults {
  users: AppUser[];
  courseContent: (CourseContentItem & { teacher?: AppUser })[];
}

interface ContentStats {
  totalAttempts?: number;
  averageScore?: number;
  totalDownloads?: number;
}

export default function PrincipalSearchPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResults>({ users: [], courseContent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [contentStats, setContentStats] = useState<Record<string, ContentStats>>({});

  const fetchContentStats = async (content: (CourseContentItem & { teacher?: AppUser })[]) => {
    try {
      const stats: Record<string, ContentStats> = {};
      
      // Fetch real statistics from Firestore
      for (const item of content) {
        if (item.contentType === 'quiz') {
          // Get quiz attempts and scores from students' subcollections
          let totalAttempts = 0;
          let totalScore = 0;
          
          // Get all students
          const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
          const studentsSnapshot = await getDocs(studentsQuery);
          
          for (const studentDoc of studentsSnapshot.docs) {
            const studentId = studentDoc.id;
            const quizResultsQuery = query(
              collection(db, `users/${studentId}/quizResults`),
              where("quizId", "==", item.id)
            );
            const quizResultsSnapshot = await getDocs(quizResultsQuery);
            
            totalAttempts += quizResultsSnapshot.docs.length;
            
            // Calculate total score
            quizResultsSnapshot.forEach(doc => {
              const result = doc.data() as QuizResult;
              totalScore += result.percentage || 0;
            });
          }
          
          const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
          
          stats[item.id] = {
            totalAttempts: totalAttempts,
            averageScore: averageScore,
          };
        } else {
          // Get resource download count from resourceDownloads collection if it exists
          let downloadCount = 0;
          try {
            const resourceStatsQuery = query(
              collection(db, "resourceDownloads"),
              where("resourceId", "==", item.id)
            );
            const resourceStatsSnapshot = await getDocs(resourceStatsQuery);
            downloadCount = resourceStatsSnapshot.docs.length;
          } catch (err) {
            // If collection doesn't exist, check student progress for resource access
            const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
            const studentsSnapshot = await getDocs(studentsQuery);
            
            for (const studentDoc of studentsSnapshot.docs) {
              const studentData = studentDoc.data() as AppUser;
              const studentProgress = studentData.progress as Record<string, any> | undefined;
              
              // Check if student has any activity that might indicate resource access
              if (studentProgress && item.topic) {
                const topicProgress = studentProgress[item.topic];
                if (topicProgress && topicProgress.lastActivity) {
                  downloadCount++;
                }
              }
            }
          }
          
          stats[item.id] = {
            totalDownloads: downloadCount,
          };
        }
      }
      
      setContentStats(stats);
    } catch (err) {
      console.error("Error fetching content stats:", err);
      // Fallback to zero values if stats collection doesn't exist
      const fallbackStats: Record<string, ContentStats> = {};
      content.forEach(item => {
        if (item.contentType === 'quiz') {
          fallbackStats[item.id] = {
            totalAttempts: 0,
            averageScore: 0,
          };
        } else {
          fallbackStats[item.id] = {
            totalDownloads: 0,
          };
        }
      });
      setContentStats(fallbackStats);
    }
  };

  const performSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setError("Please enter a search query.");
      return;
    }
    if (!user) {
      setError("You must be logged in to search.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResults({ users: [], courseContent: [] });
    setContentStats({});

    try {
      const lowerCaseQuery = queryText.toLowerCase().trim();

      const userQuery = query(
        collection(db, "users"),
        where("role", "in", ["student", "teacher"])
      );
      const userSnapshot = await getDocs(userQuery);
      const allUsers: AppUser[] = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      
      // Filter users - only show if search term appears in relevant fields
      const filteredUsers = allUsers.filter(user => {
        const searchFields = [
          user.displayName,
          user.username,
          user.firstName,
          user.lastName
        ].filter((field): field is string => 
          field !== null && field !== undefined && typeof field === 'string'
        );
        
        return searchFields.some(field => 
          field.toLowerCase().includes(lowerCaseQuery)
        );
      });

      const contentQuery = query(collection(db, "courseContent"));
      const contentSnapshot = await getDocs(contentQuery);
      const allContent: CourseContentItem[] = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
      
      // Filter content - only show if search term appears in title or description
      const filteredContent = allContent.filter(item => {
        const searchFields = [
          item.title,
          item.description,
        ].filter((field): field is string => 
          field !== null && field !== undefined && typeof field === 'string'
        );
        
        return searchFields.some(field => 
          field.toLowerCase().includes(lowerCaseQuery)
        );
      });

      const enhancedContent = await Promise.all(
        filteredContent.map(async (item) => {
          try {
            if (item.teacherId) {
              const teacherDoc = await getDoc(doc(db, "users", item.teacherId));
              if (teacherDoc.exists()) {
                return { 
                  ...item, 
                  teacher: { id: teacherDoc.id, ...teacherDoc.data() } as AppUser 
                };
              }
            }
            return item;
          } catch (err) {
            console.error("Error fetching teacher data:", err);
            return item;
          }
        })
      );

      setResults({ 
        users: filteredUsers, 
        courseContent: enhancedContent 
      });

      await fetchContentStats(enhancedContent);

    } catch (err: any) {
      console.error("Error performing search:", err);
      setError(`An unexpected error occurred during the search. Please try again. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery);
    }
  }, [searchQuery, user]);

  const noResults = hasSearched && !isLoading && results.users.length === 0 && results.courseContent.length === 0;

  const getContentStatusBadge = (item: CourseContentItem) => {
    if (item.contentType === 'quiz') {
      return !item.isArchived ? 
        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge> :
        <Badge variant="secondary">Draft</Badge>;
    } else {
      return !item.isArchived ?
        <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Published</Badge> :
        <Badge variant="secondary">Unpublished</Badge>;
    }
  };

  const getActionButtonText = (item: CourseContentItem) => {
    return item.contentType === 'quiz' ? "View Analytics" : "View Usage";
  };

  const getActionButtonIcon = (item: CourseContentItem) => {
    return item.contentType === 'quiz' ? <BarChart3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            {searchQuery ? `Search results for "${searchQuery}"` : "Search across students, teachers, quizzes, and learning resources"}
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!searchQuery && !hasSearched && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Enter a search term in the header search bar to find students, teachers, and content.
          </CardContent>
        </Card>
      )}

      {noResults && searchQuery && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {`No students, teachers, or content found for "${searchQuery}".`}
          </CardContent>
        </Card>
      )}

      {/* USERS SECTION */}
      {results.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Users ({results.users.length} found)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {results.users.map(user => (
              <div key={user.id} className="p-4 border rounded-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <Avatar>
                    <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName || ''} />
                    <AvatarFallback>
                      {user.role === 'teacher' ? 
                        <UserCheck className="h-4 w-4" /> : 
                        <GraduationCap className="h-4 w-4" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{user.displayName}</h4>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>@{user.username}</span>
                      <Badge variant={user.role === 'teacher' ? "default" : "secondary"} className="capitalize">
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={
                    user.role === 'teacher' 
                      ? `/principal/teachers`
                      : `/principal/students`
                  }>
                    {user.role === 'teacher' ? 'Manage Teacher' : 'View Student'}
                    <ChevronRight className="ml-2 h-4 w-4"/>
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CONTENT SECTION */}
      {results.courseContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Learning Content ({results.courseContent.length} items found)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {results.courseContent.map(item => (
              <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {item.contentType === 'quiz' ? 
                        <FileText className="h-5 w-5 text-blue-500" /> : 
                        <BookOpen className="h-5 w-5 text-green-500" />
                      }
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                      
                      {item.teacher && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">
                            Created by: <strong>{item.teacher.displayName}</strong>
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Teacher
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant={item.contentType === 'quiz' ? "default" : "secondary"} className="capitalize">
                          {item.contentType === 'lessonMaterial' ? 'Resource' : 'Quiz'}
                        </Badge>
                        {getContentStatusBadge(item)}
                        <span className="text-sm text-muted-foreground">
                          Topic: {mathTopics.find(t => t.slug === item.topic)?.title || item.topic}
                        </span>
                      </div>

                      {contentStats[item.id] && (
                        <div className="flex flex-wrap gap-4 mt-2">
                          {item.contentType === 'quiz' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">Attempts:</span>
                                <span className="text-sm text-muted-foreground">
                                  {contentStats[item.id]?.totalAttempts || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">Avg Score:</span>
                                <span className="text-sm text-muted-foreground">
                                  {contentStats[item.id]?.averageScore || 0}%
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                <span className="text-sm font-medium">Downloads:</span>
                                <span className="text-sm text-muted-foreground">
                                  {contentStats[item.id]?.totalDownloads || 0}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
                  <Link href={item.contentType === 'quiz' ? `/principal/analytics/quizzes/${item.id}?q=${searchQuery}` : `/principal/analytics/resources/${item.id}?q=${searchQuery}`}>
                    {getActionButtonIcon(item)}
                    {getActionButtonText(item)}
                    <ChevronRight className="ml-2 h-4 w-4"/>
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
