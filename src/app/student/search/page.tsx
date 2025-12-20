"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { collection, getDocs, query, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Search, Loader2, AlertTriangle, FileText, ChevronRight } from "lucide-react";
import type { CourseContentItem } from "@/types";
import { mathTopics } from "@/config/topics";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

interface SearchResults {
  courseContent: CourseContentItem[];
}

export default function StudentSearchPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResults>({ courseContent: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async (queryText: string) => {
    if (!queryText.trim()) {
      setResults({ courseContent: [] });
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const lowerCaseQuery = queryText.toLowerCase();
      const contentRef = collection(db, "courseContent");
      
      const q = query(
        contentRef,
        or(
          where("contentType", "==", 'quiz'),
          where("contentType", "==", 'lessonMaterial')
        )
      );
      
      const querySnapshot = await getDocs(q);
      const allContent: CourseContentItem[] = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as CourseContentItem));

      const filteredContent = allContent.filter(item => 
        item.title.toLowerCase().includes(lowerCaseQuery) ||
        (item.topic && item.topic.toLowerCase().includes(lowerCaseQuery))
      );
      
      setResults({ courseContent: filteredContent });

    } catch (err: any) {
      console.error("Error performing search:", err);
      setError("Search failed. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery]);

  const noResults = hasSearched && !isLoading && results.courseContent.length === 0;

  const getCourseContentTitle = () => {
    const count = results.courseContent.length;
    if (count === 0) return "";

    const hasQuizzes = results.courseContent.some(item => item.contentType === 'quiz');
    const hasResources = results.courseContent.some(item => item.contentType === 'lessonMaterial');
    const itemsFound = `(${count} item${count > 1 ? 's' : ''} found)`;

    if (hasQuizzes && hasResources) {
        return `Quizzes & Resources ${itemsFound}`;
    }
    if (hasQuizzes) {
        return `Quiz${count > 1 ? 'zes' : ''} ${itemsFound}`;
    }
    if (hasResources) {
        return `Resource${count > 1 ? 's' : ''} ${itemsFound}`;
    }
    return `Course Content ${itemsFound}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
            <Search className="h-8 w-8" /> Global Search
          </CardTitle>
          <CardDescription>
            {searchQuery ? `Search results for \"${searchQuery}\"` : "Search for quizzes and learning resources"}
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
            Enter a search term in the header search bar to find students and content.
          </CardContent>
        </Card>
      )}

      {noResults && searchQuery && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No quizzes or resources found for \"${searchQuery}\".
          </CardContent>
        </Card>
      )}

      {results.courseContent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText />
              {getCourseContentTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {results.courseContent.map(item => (
              <div key={item.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-2">{item.title}</h4>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                    <Badge variant={item.contentType === 'quiz' ? "default" : "secondary"} className="capitalize">
                      {item.contentType === 'lessonMaterial' ? 'Resource' : 'Quiz'}
                    </Badge>
                    {item.topic && (
                        <span>Topic: {mathTopics.find(t => t.slug === item.topic)?.title || item.topic}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm mt-2 text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link href={item.contentType === 'quiz' ? `/student/quizzes/view/${item.id}` : `/student/resources/view/${item.id}`}>
                        View <ChevronRight className="ml-2 h-4 w-4"/>
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
