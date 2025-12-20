"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !user?.role) return;

    let searchPath = "";
    if (user.role === 'admin') {
      searchPath = "/admin/search";
    } else if (user.role === 'student') {
      searchPath = "/student/search";
    } else if (user.role === 'teacher') {
      searchPath = "/teacher/search";
    } else if (user.role === 'principal') {
      searchPath = "/principal/search";
    }

    if (searchPath) {
      router.push(`${searchPath}?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!user?.role || !['admin', 'student', 'teacher', 'principal'].includes(user.role)) {
      return null;
  }

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
      <Input
        placeholder="Search platform..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-9 pr-10"
        aria-label="Search"
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="absolute inset-y-0 right-0 h-full px-3"
        aria-label="Submit search"
      >
        <Search className="h-4 w-4 text-muted-foreground" />
      </Button>
    </form>
  );
}
