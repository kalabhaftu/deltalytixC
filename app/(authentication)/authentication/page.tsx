'use client'

import Image from "next/image"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "../components/user-auth-form"
import { Logo } from "@/components/logo"
export default function AuthenticationPage() {

  // Theme is now handled by the root layout script, no client-side logic needed

  return (
    <div className="min-h-screen bg-background">
      <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
        <div className="relative hidden h-full flex-col bg-gray-900 p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 overflow-hidden">
          <Image src={"/auth-background.jpeg"} width={928} height={1232} className="opacity-35 w-full" alt="Auth abstract image background"></Image>
          </div>
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Link href="/" className="flex items-center gap-2">
              <Logo className="w-10 h-10 fill-white"/>
              Deltalytix
            </Link>
          </div>

        </div>
        <div className="p-4 lg:p-8 bg-background">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Create an account
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email below to create your account
              </p>
            </div>
            <UserAuthForm />

          </div>
        </div>
      </div>
    </div>
  )
}