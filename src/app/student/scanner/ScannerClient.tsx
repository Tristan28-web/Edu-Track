
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { solveMathProblemFromImage, type SolveMathProblemFromImageOutput } from '@/ai/flows/solve-math-problem-from-image';
import { Loader2, Camera, ScanLine, Bot, Sparkles, RefreshCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import Image from 'next/image';

const formSchema = z.object({
  description: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

export function ScannerClient() {
  const [aiResponse, setAiResponse] = useState<SolveMathProblemFromImageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  const getCameraPermission = useCallback(async () => {
    // If permission has already been denied, don't ask again.
    if (hasCameraPermission === false) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setHasCameraPermission(false);
      setError("Camera access is required. Please enable camera permissions in your browser settings to use this feature.");
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings to use this app.',
      });
    }
  }, [hasCameraPermission]);

  useEffect(() => {
    getCameraPermission();
    
    // Cleanup function to stop the video stream when the component unmounts
    return () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [getCameraPermission]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUri);
        
        // Stop the camera stream after capturing
        if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setAiResponse(null);
    setError(null);
    form.reset();
    // Re-initialize the camera stream
    getCameraPermission();
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (!capturedImage) {
      setError("Please capture an image first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAiResponse(null);
    try {
      const response = await solveMathProblemFromImage({ 
          photoDataUri: capturedImage,
          description: data.description 
      });
      setAiResponse(response);
    } catch (err) {
      console.error("Error calling AI assistant:", err);
      setError("Sorry, I couldn't process your question right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        {!capturedImage ? (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                <Camera className="h-6 w-6" />
                Point Camera at Problem
              </CardTitle>
              <CardDescription>
                Position the math problem within the frame below and click "Scan Problem".
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video w-full max-w-2xl mx-auto bg-muted rounded-lg overflow-hidden border">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <p className="text-white text-center p-4">Camera access denied. Please enable permissions in your browser.</p>
                    </div>
                )}
                 {hasCameraPermission === null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCapture} disabled={hasCameraPermission !== true} className="w-full md:w-auto font-semibold">
                <ScanLine className="mr-2 h-4 w-4" />
                Scan Problem
              </Button>
            </CardFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <CardHeader>
                <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
                    <Sparkles className="h-6 w-6" />
                    Review and Solve
                </CardTitle>
                <CardDescription>
                    Review your captured image. Add any notes if needed, then click solve.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="w-full max-w-sm mx-auto">
                        <Image src={capturedImage} alt="Captured math problem" width={400} height={300} className="rounded-md border shadow-sm" />
                    </div>
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Textarea
                                placeholder="e.g., 'Please solve for x', or 'Focus on the factoring method.'"
                                className="min-h-[80px]"
                                disabled={isLoading || !!aiResponse}
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter className="flex-wrap gap-2">
                     <Button type="submit" disabled={isLoading || !!aiResponse} className="font-semibold">
                        {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Solving...
                        </>
                        ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Solve Problem
                        </>
                        )}
                    </Button>
                     <Button type="button" variant="outline" onClick={handleRetake} disabled={isLoading}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Retake Photo
                    </Button>
                </CardFooter>
            </form>
          </Form>
        )}
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {aiResponse && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-headline text-primary/90 flex items-center gap-2">
              <Bot className="h-6 w-6" />
              AI Generated Solution
            </CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="bg-secondary/20 p-4 rounded-md">
              <div
                className="whitespace-pre-wrap text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: aiResponse.solution.replace(/\n/g, '<br />') }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
