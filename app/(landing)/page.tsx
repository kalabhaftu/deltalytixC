'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from '@/context/theme-provider'
import Features from './components/features'

import { Skeleton } from '@/components/ui/skeleton'


export default function LandingPage() {
    const { theme, effectiveTheme } = useTheme();
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
        <div className="flex flex-col min-h-[100dvh] text-gray-900 dark:text-white transition-colors duration-300">
            <main className="flex-1">
                <section className="w-full py-14 md:py-12 lg:py-16 xl:py-24">
                    <div className="container px-4 md:px-6 mx-auto">
                        <div className="flex flex-col w-full gap-y-24">
                            <div className="flex flex-col  justify-center space-y-4 text-center">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                                        Master your trading journey.
                                    </h1>
                                    <p className="mx-auto max-w-[600px] text-gray-500 dark:text-gray-400 md:text-xl">
                                        Deltalytix is a trading dashboard for futures traders to store, explore and understand their track-record.
                                    </p>
                                </div>
                                <div className="flex w-full justify-center">
                                    <Link href={"/authentication"} className="flex justify-center items-center px-8 py-2.5 h-10 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl rounded-xl transition-all duration-200">
                                        <span className="font-medium text-sm text-white">Get Started</span>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex w-full items-center justify-center relative rounded-lg">
                                <div className="relative w-full h-full">
                                    {!videoLoaded && !videoError && (
                                        <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-black rounded-[14.5867px] border-[1.82333px] border-[#E5E7EB] dark:border-gray-800">
                                            <Skeleton className="w-full aspect-video rounded-[14.5867px]" />
                                        </div>
                                    )}
                                    {videoError && (
                                        <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-black rounded-lg">
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
                                        className={`w-full h-full rounded-[14.5867px] border-2 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.6)] ${videoLoaded ? 'block' : 'hidden'}`}
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
                    <Features />
                </section>

            </main>
        </div>
    )
}