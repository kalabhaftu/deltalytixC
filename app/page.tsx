'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from '@/context/theme-provider'
import { useAuth } from '@/context/auth-provider'
import Features from './(landing)/components/features'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from "@/components/ui/toaster";
import Navbar from "./(landing)/components/navbar";
import Footer from "./(landing)/components/footer";
import { ThemeProvider } from "@/context/theme-provider";

export default function RootPage() {
    const { theme, effectiveTheme } = useTheme();
    const { isAuthenticated, session } = useAuth();
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setVideoLoaded(false);
        setVideoError(false);

        // Small delay to ensure theme has fully changed
        const timer = setTimeout(() => {
            if (videoRef.current) {
                const video = videoRef.current;
                // Clear current sources
                video.pause();
                video.currentTime = 0;
                // Remove all existing sources
                const sources = video.querySelectorAll('source');
                sources.forEach(source => source.remove());
                
                // Add new source based on theme
                const newSource = document.createElement('source');
                newSource.src = effectiveTheme === "dark" 
                    ? "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo-dark.mp4"
                    : "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo.mp4";
                newSource.type = "video/mp4";
                video.appendChild(newSource);
                
                // Force reload with new source
                video.load();
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [effectiveTheme]);

    const handleVideoLoad = () => {
        setVideoLoaded(true);
    };

    const handleVideoError = () => {
        setVideoError(true);
    };

    return (
        <ThemeProvider>
            <div className="min-h-screen bg-background text-foreground">
                <div className="px-2 sm:px-6 lg:px-32">
                    <Toaster />
                    <Navbar />
                    <div className="mt-8 sm:mt-20 max-w-screen-xl mx-auto">
                        <div className="flex flex-col min-h-[100dvh] transition-colors duration-300">
                        <main className="flex-1">
                            <section className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
                                <div className="container px-4 md:px-6 mx-auto">
                                    <div className="flex flex-col w-full gap-y-24">
                                        <div className="flex flex-col justify-center space-y-6 text-center animate-in fade-in duration-1000">
                                            <div className="space-y-4">
                                                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-foreground">
                                                    Master your trading journey.
                                                </h1>
                                                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
                                                    Deltalytix is a trading dashboard for futures traders to store, explore and understand their track-record.
                                                </p>
                                            </div>
                                            <div className="flex w-full justify-center pt-2">
                                                <Link href={isAuthenticated ? "/dashboard" : "/authentication"} className="group flex justify-center items-center px-8 py-3 h-12 bg-primary hover:bg-black dark:hover:bg-white shadow-lg hover:shadow-xl rounded-xl transition-all duration-300 hover:scale-105">
                                                    <span className="font-medium text-sm text-primary-foreground group-hover:text-white dark:group-hover:text-black transition-colors duration-300">{isAuthenticated ? "Go to Dashboard" : "Get Started"}</span>
                                                </Link>
                                            </div>
                                            {isAuthenticated && (
                                                <div className="text-center mt-4">
                                                    <p className="text-sm text-green-600 dark:text-green-400">
                                                        ✓ You are already logged in! Click above to access your dashboard.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex w-full items-center justify-center relative rounded-lg">
                                            <div className="relative w-full h-full">
                                                {!videoLoaded && !videoError && (
                                                    <div className="w-full aspect-video flex items-center justify-center bg-muted/50 rounded-2xl border border-border">
                                                        <Skeleton className="w-full aspect-video rounded-2xl" />
                                                    </div>
                                                )}
                                                {videoError && (
                                                    <div className="w-full aspect-video flex items-center justify-center bg-muted/50 rounded-2xl border border-border">
                                                        <p className="text-red-500">Failed to load video</p>
                                                    </div>
                                                )}
                                                <video
                                                    key={effectiveTheme}
                                                    ref={videoRef}
                                                    preload="metadata"
                                                    loop
                                                    muted
                                                    autoPlay
                                                    playsInline
                                                    className={`w-full h-full rounded-2xl border-2 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.5)] ${videoLoaded ? 'block' : 'hidden'}`}
                                                    onLoadedData={handleVideoLoad}
                                                    onError={handleVideoError}
                                                >
                                                    <track
                                                        src="/path/to/captions.vtt"
                                                        kind="subtitles"
                                                        srcLang="en"
                                                        label="English"
                                                    />
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <section id="features" className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                                    <Features />
                                </div>
                            </section>
                        </main>
                        </div>
                    </div>
                    <Footer />
                </div>
            </div>
        </ThemeProvider>
    )
}
