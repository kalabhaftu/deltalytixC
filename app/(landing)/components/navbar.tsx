'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Logo } from "@/components/logo"
import { Moon, Sun, Github, FileText, Cpu, Users, Layers, BarChart3, Calendar, BookOpen, Database, LineChart, Menu, Globe, Laptop } from "lucide-react"
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useTheme } from '@/context/theme-provider'
import { cn } from '@/lib/utils'
import { useRouter, usePathname } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"


const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & {
        title: string;
        icon?: React.ReactNode;
    }
>(({ className, title, children, icon, ...props }, ref) => {
    return (
        <li>
            <NavigationMenuLink asChild>
                <a
                    ref={ref}
                    className={`block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className}`}
                    {...props}
                >
                    <div className="text-sm font-medium leading-none flex items-center">
                        {icon}
                        <span className="ml-2">{title}</span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                        {children}
                    </p>
                </a>
            </NavigationMenuLink>
        </li>
    )
})
ListItem.displayName = "ListItem"

const MobileNavItem = ({ href, children, onClick, className, target }: { href: string; children: React.ReactNode; onClick?: () => void, className?: string, target?: string }) => (
    <li>
        <Link href={href} className={cn("block py-2 hover:text-primary transition-colors", className)} onClick={onClick} target={target}>
            {children}
        </Link>
    </li>
)

export default function Component() {
    const { theme, setTheme, effectiveTheme } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const [hoveredItem, setHoveredItem] = useState<string | null>(null)
    const [isVisible, setIsVisible] = useState(true)
    const [lastScrollY, setLastScrollY] = useState(0)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const pathname = usePathname()


    const toggleMenu = () => setIsOpen(!isOpen)
    const closeMenu = () => setIsOpen(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const controlNavbar = () => {
            if (typeof window !== 'undefined') {
                const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
                
                if (scrollPercent <= 25) {
                    setIsVisible(true)
                } else if (window.scrollY > lastScrollY) {
                    setIsVisible(false)
                } else {
                    setIsVisible(true)
                }

                setLastScrollY(window.scrollY)
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlNavbar)

            return () => {
                window.removeEventListener('scroll', controlNavbar)
            }
        }
    }, [lastScrollY])



    const [themeOpen, setThemeOpen] = useState(false)


    const handleThemeChange = (value: string) => {
        setTheme(value as "light" | "dark" | "system")
        setThemeOpen(false)
    }



    const getThemeIcon = () => {
        // Always return the same icon until mounted to prevent hydration mismatch
        if (!mounted) {
            return <Laptop className="h-5 w-5" />;
        }
        
        // Client-side logic using effectiveTheme from context
        if (theme === 'light') return <Sun className="h-5 w-5" />;
        if (theme === 'dark') return <Moon className="h-5 w-5" />;
        if (theme === 'system') {
            return effectiveTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
        }
        return <Sun className="h-5 w-5" />; // Default fallback
    };

    const MobileNavContent = ({ onLinkClick }: { onLinkClick: () => void }) => (
        <nav className="flex flex-col space-y-4">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="features">
                    <AccordionTrigger>Features</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="/#data-import" onClick={onLinkClick}>Data Import</MobileNavItem>
                            <MobileNavItem href="/#performance-visualization" onClick={onLinkClick}>Performance Visualization</MobileNavItem>
                            <MobileNavItem href="/#daily-performance" onClick={onLinkClick}>Daily Performance</MobileNavItem>
                            <MobileNavItem href="/#ai-journaling" onClick={onLinkClick}>AI-Powered Journaling</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="developers">
                    <AccordionTrigger>Developers</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="https://github.com/kalabhaftu/deltalytixC.git" onClick={onLinkClick} target="_blank">Open Source</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="updates">
                    <AccordionTrigger>Updates</AccordionTrigger>
                    <AccordionContent>
                        <ul className="space-y-2 list-none">
                            <MobileNavItem href="/updates" onClick={onLinkClick}>Product Updates</MobileNavItem>
                            <MobileNavItem href="/community" onClick={onLinkClick}>Community</MobileNavItem>
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Button asChild variant="outline" className="w-full" onClick={onLinkClick}>
                <Link href={"/authentication"}>Sign In</Link>
            </Button>
            <div className="py-4 border-t space-y-4">
                <Popover open={themeOpen} onOpenChange={setThemeOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start">
                            {getThemeIcon()}
                            <span className="ml-2">Change theme</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
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
        </nav>
    )

    return (
        <>
            <div className={`fixed inset-0 bg-background/80  backdrop-blur-sm z-40 transition-opacity duration-300 ${hoveredItem ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
            <div className={`h-14 fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}></div>
            <header className={`max-w-7xl mx-auto fixed top-0 left-0 right-0 px-4 lg:px-6 h-14 flex items-center justify-between z-50  text-foreground transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <Link href="/" className="flex items-center space-x-2">
                    <Logo className='w-6 h-6 fill-black dark:fill-white' />
                    <span className="font-bold text-xl">Deltalytix</span>
                </Link>
                <div className="hidden lg:block">
                    <NavigationMenu>
                        <NavigationMenuList className="list-none">
                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('features')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>Features</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr] list-none">
                                        <li className="row-span-3">
                                            <NavigationMenuLink asChild>
                                                <Link className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/">
                                                    <Logo className='w-6 h-6' />
                                                    <div className="mb-2 mt-4 text-lg font-medium">
                                                        Deltalytix
                                                    </div>
                                                    <p className="text-sm leading-tight text-muted-foreground">
                                                        Elevate your trading with comprehensive analytics and AI-powered insights.
                                                    </p>
                                                </Link>
                                            </NavigationMenuLink>
                                        </li>
                                        <ListItem href="/#data-import" title="Data Import" icon={<Database className="h-4 w-4" />}>
                                            Import data from various providers.
                                        </ListItem>
                                        <ListItem href="/#performance-visualization" title="Performance Visualization" icon={<LineChart className="h-4 w-4" />}>
                                            Visualize your trading performance.
                                        </ListItem>
                                        <ListItem href="/#daily-performance" title="Daily Performance" icon={<Calendar className="h-4 w-4" />}>
                                            Track your daily trading results with an intuitive calendar view.
                                        </ListItem>
                                        <div className='col-span-2'>
                                            <ListItem href="/#ai-journaling" title="AI-Powered Journaling" icon={<BookOpen className="h-4 w-4" />}>
                                                Improve your trading emotions with AI-assisted journaling.
                                            </ListItem>
                                        </div>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>


                            <NavigationMenuItem onMouseEnter={() => setHoveredItem('developers')} onMouseLeave={() => setHoveredItem(null)}>
                                <NavigationMenuTrigger className='bg-transparent'>Developers</NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <ul className="grid gap-3 p-4 w-[400px] list-none">
                                        <ListItem href="https://github.com/kalabhaftu/deltalytixC.git" title="Open Source" icon={<Github className="h-4 w-4" />} target="_blank">
                                            Explore our open-source projects and contribute.
                                        </ListItem>
                                    </ul>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                        <Separator orientation="vertical" className="h-6 mx-4" />
                        <Button variant="ghost" className="text-sm font-medium hover:text-accent-foreground" asChild>
                            <Link href={"/authentication"}>Sign In</Link>
                        </Button>
                    </NavigationMenu>
                </div>

                <div className="flex items-center space-x-4">

                    <Popover open={themeOpen} onOpenChange={setThemeOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="hidden lg:inline-flex h-9 w-9 px-0">
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
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="flex lg:hidden" onClick={toggleMenu}>
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[400px] lg:hidden">
                            <div className="flex flex-col h-full">
                                <div className="flex-grow overflow-y-auto py-6">
                                    <MobileNavContent onLinkClick={closeMenu} />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </header>
        </>
    )
}