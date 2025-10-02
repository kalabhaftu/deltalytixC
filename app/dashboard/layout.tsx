import { DataProvider } from "@/context/data-provider";
import Modals from "@/components/modals";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactElement } from "react";
import Navbar from "./components/navbar";
import { AutoRefreshProvider } from "./components/auto-refresh-provider";

export default function RootLayout({ children }: { children: ReactElement }) {

  return (
    <TooltipProvider>
      <DataProvider>
        <AutoRefreshProvider refreshInterval={30000}>
            <div className="min-h-screen flex flex-col">
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