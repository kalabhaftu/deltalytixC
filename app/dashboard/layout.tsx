import { DataProvider } from "@/context/data-provider";
import { TemplateProvider } from "@/context/template-provider";
import { TagsProvider } from "@/context/tags-provider";
import Modals from "@/components/modals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactElement, Suspense } from "react";
import Navbar from "./components/navbar";
import { AutoRefreshProvider } from "./components/auto-refresh-provider";
import { SidebarLayout } from "./components/sidebar-layout";
import { MobileBottomNav } from "@/components/ui/mobile-nav";
import { QuickAddFAB } from "@/components/quick-add-fab";
import { CommandPalette } from "@/components/command-palette";

export default function RootLayout({ children }: { children: ReactElement }) {

  return (
    <TooltipProvider>
      <DataProvider>
        <TagsProvider>
          <TemplateProvider>
            {/* Data syncs via Supabase Realtime - no polling needed */}
            <AutoRefreshProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <div className="flex flex-1">
                  <Suspense fallback={<div className="flex flex-1" />}>
                    <SidebarLayout>
                      {/* Add bottom padding on mobile for nav */}
                      <div className="pb-24 lg:pb-0">
                        {children}
                      </div>
                    </SidebarLayout>
                  </Suspense>
                </div>
                <Modals />
                <MobileBottomNav />
                <QuickAddFAB />
                <CommandPalette />
              </div>
            </AutoRefreshProvider>
          </TemplateProvider>
        </TagsProvider>
      </DataProvider>
    </TooltipProvider>
  );
}