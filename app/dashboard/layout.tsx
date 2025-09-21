import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { Toaster } from "@/components/ui/toaster";
import { ReactElement } from "react";
import Navbar from "./components/navbar";
import { AutoRefreshProvider } from "./components/auto-refresh-provider";


import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout({ children }: { children: ReactElement }) {

  return (
    <TooltipProvider>
      <DataProvider>
        <AutoRefreshProvider refreshInterval={30000}>
            <div className="min-h-screen flex flex-col">
                  <SonnerToaster/>
                  <Toaster />
                  <Navbar />
                  <div className="flex flex-1">
                    {children}
                  </div>
                  <Modals />
            </div>
        </AutoRefreshProvider>
      </DataProvider>
    </TooltipProvider>
  );
}