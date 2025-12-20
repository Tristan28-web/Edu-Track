"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Loader2, Trash2, Check, CheckCheck } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


interface ChatInterfaceProps {
  currentUser: AppUser;
  otherUser: AppUser;
}

const formSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty.'),
});
type FormData = z.infer<typeof formSchema>;

export function ChatInterface({ currentUser, otherUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const getConversationId = (id1: string, id2: string) => {
    return [id1, id2].sort().join('_');
  };
  
  const conversationId = getConversationId(currentUser.id, otherUser.id);

  // Effect for fetching messages and marking them as read
  useEffect(() => {
    if (!conversationId) return;

    const messagesCollectionRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const msgs: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);

      // Mark messages as read
      const unreadMessages = msgs.filter(m => m.senderId === otherUser.id && !m.readBy?.includes(currentUser.id));
      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach(message => {
          const msgRef = doc(db, 'conversations', conversationId, 'messages', message.id);
          batch.update(msgRef, {
            readBy: [...(message.readBy || []), currentUser.id]
          });
        });
        await batch.commit();
      }
      
      // Update lastRead timestamp for current user
      const convRef = doc(db, 'conversations', conversationId);
      await setDoc(convRef, {
          [`lastRead.${currentUser.id}`]: Timestamp.now()
      }, { merge: true }).catch(err => console.error("Failed to update lastRead timestamp:", err));


    }, (error) => {
        console.error("Error fetching messages:", error);
        toast({
            title: "Error",
            description: "Could not load messages in real-time.",
            variant: "destructive",
        })
    });

    return () => unsubscribe();
  }, [conversationId, currentUser.id, otherUser.id]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const sendMessage: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    const textMessage = data.message.trim();
    if (!textMessage) {
        setIsLoading(false);
        return;
    }
    
    const messageTimestamp = Timestamp.now();
    
    // Create conversation doc if it doesn't exist
    const conversationRef = doc(db, 'conversations', conversationId);
    await setDoc(conversationRef, { 
        participants: [currentUser.id, otherUser.id],
        lastMessage: textMessage,
        lastUpdate: messageTimestamp
    }, { merge: true });

    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: textMessage,
        senderId: currentUser.id,
        timestamp: messageTimestamp,
        readBy: [currentUser.id], // Sender has obviously "read" it
      });

      reset();

    } catch (error) {
      console.error('Error sending message: ', error);
      toast({ title: "Send Error", description: "Your message could not be sent.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteMessage = (message: ChatMessage) => {
    setMessageToDelete(message);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    const messageRef = doc(db, 'conversations', conversationId, 'messages', messageToDelete.id);

    try {
      await deleteDoc(messageRef);
      toast({ title: "Message Deleted", description: "Your message has been removed." });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({ title: "Error", description: "Could not delete the message.", variant: "destructive" });
    } finally {
      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const getMessageStatusIcon = (msg: ChatMessage) => {
      if (msg.senderId !== currentUser.id) return null;
      
      const isSeen = msg.readBy && msg.readBy.includes(otherUser.id);
      
      if (isSeen) {
          return <CheckCheck className="h-4 w-4 text-blue-500" />;
      }
      // "Delivered" is implied if sent. For simplicity, we show a single check for sent/delivered.
      return <Check className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardContent className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => {
              const isSender = msg.senderId === currentUser.id;
              const userForAvatar = isSender ? currentUser : otherUser;
              const statusIcon = getMessageStatusIcon(msg);

              return (
                  <div key={msg.id} className={cn("flex items-end gap-2 group", isSender ? "justify-end" : "justify-start")}>
                       {isSender && (
                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => confirmDeleteMessage(msg)}>
                            <Trash2 className="h-4 w-4" />
                         </Button>
                       )}
                       {!isSender && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={userForAvatar.displayName || undefined} alt={userForAvatar.displayName || 'User'} />
                              <AvatarFallback>{getInitials(userForAvatar.displayName)}</AvatarFallback>
                          </Avatar>
                       )}
                      <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg")}>
                        <div className={cn("rounded-lg p-3", isSender ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                          <div className={cn("text-xs mt-1 flex items-center gap-1", isSender ? "justify-end" : "justify-start")}>
                              <span className={cn(isSender ? "text-muted-foreground" : "text-muted-foreground")}>
                                  {msg.timestamp ? formatDistanceToNowStrict(msg.timestamp.toDate(), { addSuffix: true }) : ''}
                              </span>
                              {isSender && statusIcon}
                          </div>
                      </div>
                       {isSender && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={userForAvatar.displayName || undefined} alt={userForAvatar.displayName || 'User'} />
                              <AvatarFallback>{getInitials(userForAvatar.displayName)}</AvatarFallback>
                          </Avatar>
                       )}
                  </div>
              )
          })}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit(sendMessage)} className="flex items-center gap-2">
             
              <div className="relative flex-grow">
                   <Input
                      {...register('message')}
                      placeholder="Type your message..."
                      autoComplete="off"
                      disabled={isLoading}
                  />
              </div>

              <Button type="submit" size="icon" disabled={isLoading || !formState.isValid}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
          </form>
        </div>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
