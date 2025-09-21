'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from '@/context/theme-provider'
import Features from './(landing)/components/features'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from "@/components/ui/toaster";
import Navbar from "./(landing)/components/navbar";
import Footer from "./(landing)/components/footer";
import { ThemeProvider } from "@/context/theme-provider";

export default function RootPage() {
    const { theme, effectiveTheme } = useTheme();
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setVideoLoaded(false);
        setVideoError(false);

        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [theme, effectiveTheme]);

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
                                                <Link href={"/authentication"} className="group flex justify-center items-center px-8 py-3 h-12 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl rounded-xl transition-all duration-300 hover:scale-105">
                                                    <span className="font-medium text-sm text-primary-foreground group-hover:text-primary-foreground/95">Get Started</span>
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex w-full items-center justify-center  relative  rounded-lg">
                                            <div className="relative w-full h-full">
                                                <span className="absolute inset-[-12px] md:inset-[-24px] bg-primary/10 dark:bg-primary/20 rounded-2xl -z-10 animate-glow-subtle"></span>
                                                <span className="absolute inset-[-4px] md:inset-[-8px] bg-primary/20 dark:bg-primary/30 rounded-2xl -z-20 animate-pulse"></span>
                                                <span className="absolute inset-0 shadow-2xl dark:shadow-primary/20 rounded-2xl -z-30"></span>
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
                                                    ref={videoRef}
                                                    preload="metadata"
                                                    loop
                                                    muted
                                                    autoPlay
                                                    playsInline
                                                    className={`w-full h-full rounded-2xl border border-border ${videoLoaded ? 'block' : 'hidden'}`}
                                                    onLoadedData={handleVideoLoad}
                                                    onError={handleVideoError}
                                                >
                                                    <source src={effectiveTheme === "dark" ? "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo-dark.mp4" : "https://fhvmtnvjiotzztimdxbi.supabase.co/storage/v1/object/public/assets/demo.mp4"} type="video/mp4" />
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
                                <Features />
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
