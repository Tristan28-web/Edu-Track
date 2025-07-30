
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where, orderBy, startAt, endAt } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, AlertTriangle, User, FileText, Brain, ChevronRight } from "lucide-react";
import type { AppUser, CourseContentItem, UserRole } from "@/types";
import { mathTopics, type MathTopic } from "@/config/topics";
import { useAuth } from "@/contexts/AuthContext";
import Link from 'next/link';

type SearchType = 'users' | 'quizzes' | 'resources' | 'topics';

interface SearchResults {
  users: AppUser[];
  courseContent: CourseContentItem[];
  topics: MathTopic[];
}

export default function AdminSearchPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchType, setSearchType] = useState<SearchType>('users');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [results, setResults] = useState<SearchResults>({ users: [], courseContent: [], topics: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery && roleFilter === 'all' && topicFilter === 'all') {
      setError("Please enter a search query or select a filter.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResults({ users: [], courseContent: [], topics: [] });

    try {
      if (searchType === 'users') {
        const usersRef = collection(db, "users");
        let q = query(usersRef);

        if (roleFilter !== 'all') {
          q = query(q, where("role", "==", roleFilter));
        }
        if (searchQuery) {
          // Firestore does not support case-insensitive search natively.
          // This searches by display name prefix.
          q = query(q, orderBy("displayName"), startAt(searchQuery), endAt(searchQuery + '\uf8ff'));
        } else {
          q = query(q, orderBy("displayName"));
        }
        
        const querySnapshot = await getDocs(q);
        const fetchedUsers: AppUser[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
        setResults(prev => ({ ...prev, users: fetchedUsers }));

      } else if (searchType === 'quizzes' || searchType === 'resources') {
        const contentRef = collection(db, "courseContent");
        let q = query(contentRef, where("contentType", "==", searchType === 'quizzes' ? 'quiz' : 'lessonMaterial'));

        if (topicFilter !== 'all') {
          q = query(q, where("topic", "==", topicFilter));
        }
        if (searchQuery) {
          q = query(q, orderBy("title"), startAt(searchQuery), endAt(searchQuery + '\uf8ff'));
        } else {
          q = query(q, orderBy("title"));
        }
        
        const querySnapshot = await getDocs(q);
        const fetchedContent: CourseContentItem[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseContentItem));
        setResults(prev => ({ ...prev, courseContent: fetchedContent }));

      } else if (searchType === 'topics') {
        const filteredTopics = mathTopics.filter(topic => topic.title.toLowerCase().includes(searchQuery.toLowerCase()));
        setResults(prev => ({ ...prev, topics: filteredTopics }));
      }
    } catch (err: any) {
      console.error("Error performing search:", err);
      setError(`Search failed. You may need to create Firestore indexes for this query. Check the developer console for a link. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (searchParams.get("q")) {
      handleSearch();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  const noResults = hasSearched && !isLoading && results.users.length === 0 && results.courseContent.length === 0 && results.topics.length === 0;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            Search for users, course content, and topics across the entire platform.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card as="form" onSubmit={handleSearch}>
        <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input 
                    placeholder="Enter search term..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="md:col-span-2 text-base"
                />
                 <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="quizzes">Quizzes</SelectItem>
                        <SelectItem value="resources">Resources</SelectItem>
                        <SelectItem value="topics">Topics</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {/* Contextual Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchType === 'users' && (
                    <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | 'all')}>
                        <SelectTrigger><SelectValue placeholder="Filter by role..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="principal">Principal</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                )}
                {(searchType === 'quizzes' || searchType === 'resources') && (
                     <Select value={topicFilter} onValueChange={setTopicFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by topic..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Topics</SelectItem>
                            {mathTopics.map(topic => (
                                <SelectItem key={topic.slug} value={topic.slug}>{topic.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

             <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search
             </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {isLoading && (
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}
      
      {error && <Alert variant="destructive"><AlertTriangle className="h-5 w-5" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {noResults && (
        <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
                No results found for your query.
            </CardContent>
        </Card>
      )}

      {/* User Results */}
      {results.users.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User /> User Results</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {results.users.map(u => (
                          <TableRow key={u.id}>
                              <TableCell>{u.displayName}</TableCell>
                              <TableCell>{u.username}</TableCell>
                              <TableCell><Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'teacher' ? 'secondary' : 'default'} className="capitalize">{u.role}</Badge></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Results */}
      {results.courseContent.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText /> Content Results</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
             {results.courseContent.map(item => (
                <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">
                           <Badge variant="outline" className="capitalize mr-2">{item.contentType === 'lessonMaterial' ? 'Resource' : 'Quiz'}</Badge>
                           Topic: {mathTopics.find(t => t.slug === item.topic)?.title || item.topic}
                        </p>
                    </div>
                     <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href={item.contentType === 'quiz' ? `/teacher/quizzes/${item.id}` : `/student/lessons/${item.topic}`}>
                          View <ChevronRight className="ml-2 h-4 w-4"/>
                        </Link>
                     </Button>
                </div>
             ))}
          </CardContent>
        </Card>
      )}

      {/* Topic Results */}
      {results.topics.length > 0 && (
         <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Brain /> Topic Results</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
             {results.topics.map(topic => (
                <div key={topic.slug} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="font-semibold">{topic.title}</h4>
                        <p className="text-sm text-muted-foreground">{topic.description}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href={`/student/lessons/${topic.slug}`}>
                           Go to Topic <ChevronRight className="ml-2 h-4 w-4"/>
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
