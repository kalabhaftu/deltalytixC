'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from '@/context/theme-provider'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"



export default function Component() {
    const { theme, setTheme, effectiveTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [themeOpen, setThemeOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])




    const handleThemeChange = (value: string) => {
        setTheme(value as "light" | "dark" | "system")
        setThemeOpen(false)
    }

    const handleThemeSelect = (value: string) => {
        handleThemeChange(value)
    }



    const getThemeIcon = () => {
        // Always return the same icon until mounted to prevent hydration mismatch
        if (!mounted) {
            return <Laptop className="h-4 w-4" />;
        }
        
        // Client-side logic using effectiveTheme from context
        if (theme === 'light') return <Sun className="h-4 w-4" />;
        if (theme === 'dark') return <Moon className="h-4 w-4" />;
        if (theme === 'system') {
            return effectiveTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
        }
        return <Sun className="h-4 w-4" />; // Default fallback
    };


    return (
        <>
            <div className="h-14 fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md z-50"></div>
            <header className="max-w-7xl mx-auto fixed top-0 left-0 right-0 px-4 lg:px-6 h-14 flex items-center justify-between z-50 text-foreground">
                <Link href="/" className="flex items-center space-x-2">
                    <Logo className='w-6 h-6 fill-black dark:fill-white' />
                    <span className="font-bold text-xl">Deltalytix</span>
                </Link>

                <div className="flex items-center space-x-4">

                    <Popover open={themeOpen} onOpenChange={setThemeOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 px-0">
                                {getThemeIcon()}
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="end">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => handleThemeChange("light")}>
                                            <Sun className="mr-2 h-4 w-4" />
                                            <span>Light mode</span>
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleThemeChange("dark")}>
                                            <Moon className="mr-2 h-4 w-4" />
                                            <span>Dark mode</span>
                                        </CommandItem>
                                        <CommandItem onSelect={() => handleThemeChange("system")}>
                                            <Laptop className="mr-2 h-4 w-4" />
                                            <span>System theme</span>
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </header>
        </>
    )
}