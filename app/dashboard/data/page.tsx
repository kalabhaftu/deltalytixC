'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TradeTable from "@/app/dashboard/data/components/data-management/trade-table"
import { DataManagementCard } from "@/app/dashboard/data/components/data-management/data-management-card"
import { useEffect } from "react"

export default function DashboardPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="container mx-auto px-6 py-6 max-w-full pr-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground">Manage your trading accounts and trades</p>
        </div>

        <Tabs defaultValue="accounts" className="w-full">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-6">
            <DataManagementCard />
          </TabsContent>
          <TabsContent value="trades" className="mt-6">
            <TradeTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}