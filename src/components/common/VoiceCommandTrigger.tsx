
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { mathTopics } from '@/config/topics';

// Define the structure for our command map
interface Command {
  command: string; // The primary phrase to match against
  url: string;     // The Next.js route to navigate to
  feedback: string;// The text-to-speech feedback message
  role?: 'student'; // Optional: restrict command to a specific role
}

export function VoiceCommandTrigger() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();
  const { role } = useAuth();

  // --- Text-to-Speech Functionality ---
  const speak = useCallback((text: string) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Speech synthesis failed.", e);
    }
  }, []);

  // --- Command Definitions & Fuzzy Matching Setup ---
  const fuse = useMemo(() => {
    const allCommands: Command[] = [
      // --- STUDENT-ONLY Commands ---
      // Dashboard
      { command: "go to dashboard", url: "/student/dashboard", feedback: "Navigating to your dashboard.", role: "student" },
      { command: "open dashboard", url: "/student/dashboard", feedback: "Opening dashboard.", role: "student" },
      { command: "show dashboard", url: "/student/dashboard", feedback: "Showing your dashboard.", role: "student" },
      // Leaderboard
      { command: "open leaderboard", url: "/leaderboard", feedback: "Opening the leaderboard.", role: "student" },
      { command: "show leaderboard", url: "/leaderboard", feedback: "Showing the leaderboard.", role: "student" },
      { command: "check rankings", url: "/leaderboard", feedback: "Checking the rankings on the leaderboard.", role: "student" },
      // Messages
      { command: "open messages", url: "/student/messages", feedback: "Opening your messages.", role: "student" },
      { command: "show messages", url: "/student/messages", feedback: "Showing messages.", role: "student" },
      { command: "check messages", url: "/student/messages", feedback: "Checking messages.", role: "student" },
      // Quizzes
      { command: "open quizzes", url: "/student/quizzes", feedback: "Opening quizzes.", role: "student" },
      { command: "show lessons", url: "/student/quizzes", feedback: "Navigating to quizzes.", role: "student" },
      { command: "start quizzes", url: "/student/quizzes", feedback: "Going to quizzes.", role: "student" },
      // Resources
      { command: "open resources", url: "/student/resources", feedback: "Opening resources.", role: "student" },
      { command: "show resources", url: "/student/resources", feedback: "Showing resources.", role: "student" },
      { command: "access resources", url: "/student/resources", feedback: "Accessing resources.", role: "student" },
      // Progress Tracker
      { command: "show my progress", url: "/student/my-progress", feedback: "Showing your progress.", role: "student" },
      { command: "check progress", url: "/student/my-progress", feedback: "Checking your progress.", role: "student" },
      { command: "open progress tracker", url: "/student/my-progress", feedback: "Opening progress tracker.", role: "student" },
      // Achievements
      { command: "check achievements", url: "/student/achievements", feedback: "Checking your achievements.", role: "student" },
      { command: "show achievements", url: "/student/achievements", feedback: "Showing your achievements.", role: "student" },
      { command: "open achievements", url: "/student/achievements", feedback: "Opening achievements.", role: "student" },
      // AI Math Assistant
      { command: "open ai math assistant", url: "/student/assistant", feedback: "Opening the AI Math Assistant.", role: "student" },
      { command: "start ai math assistant", url: "/student/assistant", feedback: "Starting the AI assistant.", role: "student" },
      { command: "go to ai math assistant", url: "/student/assistant", feedback: "Going to the AI assistant.", role: "student" },
    ];
    
    // Add topic-specific commands dynamically for students
    mathTopics.forEach(topic => {
        allCommands.push({
            command: `go to ${topic.title}`,
            url: `/student/quizzes/${topic.slug}`,
            feedback: `Opening ${topic.title}.`,
            role: "student"
        });
        allCommands.push({
            command: `open ${topic.title}`,
            url: `/student/quizzes/${topic.slug}`,
            feedback: `Opening ${topic.title}.`,
            role: "student"
        });
    });

    const options = {
      keys: ['command'],
      includeScore: true,
      threshold: 0.4,
    };
    
    // Filter commands based on user role
    const filteredCommands = allCommands.filter(cmd => !cmd.role || cmd.role === role);

    return new Fuse(filteredCommands, options);
  }, [role]);

  // --- Setup Speech Recognition ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast({ title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser settings.", variant: "destructive"});
        } else if (event.error === 'no-microphone') {
          toast({ title: "No Microphone Found", description: "A microphone is required for voice commands.", variant: "destructive"});
        } else {
          toast({ title: "Voice Error", description: "An error occurred with voice recognition.", variant: "destructive"});
        }
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        const results = fuse.search(transcript);
    
        if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
            const commandToExecute = results[0].item;
            speak(commandToExecute.feedback);
            toast({ title: "Voice Command Recognized", description: commandToExecute.feedback });
            router.push(commandToExecute.url);
        } else {
            const notRecognizedMsg = "Sorry, I didn't recognize that command.";
            speak(notRecognizedMsg);
            toast({ title: "Command Not Recognized", description: `Heard: "${transcript}"`, variant: "destructive" });
        }
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }
  }, [fuse, router, speak]);


  const toggleListening = () => {
    if (isSupported === false) {
        toast({ title: "Unsupported Browser", description: "Voice commands are not available in your browser.", variant: "destructive"});
        return;
    }
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Could not start recognition:", error);
        if((error as DOMException).name === 'InvalidStateError') {
             // Already starting, do nothing.
        } else {
            toast({title: "Error", description: "Could not start voice recognition. Please check microphone permissions.", variant: "destructive"});
        }
      }
    }
  };
  
  // Only render the button if the user is a student.
  if (role !== 'student') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleListening}
      className={cn(
          "transition-colors",
          isListening && "bg-destructive/20 text-destructive animate-pulse"
      )}
      aria-label="Toggle Voice Commands"
    >
      {isListening ? <MicOff className="h-[1.2rem] w-[1.2rem]" /> : <Mic className="h-[1.2rem] w-[1.2rem]" />}
    </Button>
  );
}
