import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactElement, Suspense } from "react";
import Navbar from "./components/navbar";
import { AutoRefreshProvider } from "./components/auto-refresh-provider";
import { SidebarLayout } from "./components/sidebar-layout";

export default function RootLayout({ children }: { children: ReactElement }) {

  return (
    <TooltipProvider>
      <DataProvider>
        <AutoRefreshProvider refreshInterval={30000}>
            <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <div className="flex flex-1">
                    <Suspense fallback={<div className="flex flex-1" />}>
                      <SidebarLayout>
                        {children}
                      </SidebarLayout>
                    </Suspense>
                  </div>
                  <Modals />
            </div>
        </AutoRefreshProvider>
      </DataProvider>
    </TooltipProvider>
  );
}