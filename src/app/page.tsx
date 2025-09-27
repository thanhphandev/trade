"use client";

import { Sidebar } from "@/components/Sidebar";
import { GlobalHeader } from "@/components/global-header";
import { ChartArea } from "@/components/chart-area";
import { TradePanel } from "@/components/trade-panel";
import { ActiveOrdersTable } from "@/components/active-orders";
import { TradeHistoryPanel } from "@/components/trade-history";
import { ThemeInitializer } from "@/components/theme-controller";
import { NotificationCenter } from "@/components/notification-center";
import { usePriceFeed } from "@/lib/hooks/use-price-feed";

export default function Home() {
  usePriceFeed();

  return (
    <div className="min-h-dvh bg-background text-foreground lg:flex">
      <ThemeInitializer />
      <NotificationCenter />
      <Sidebar />
      <main className="flex flex-1 flex-col">
        <GlobalHeader />
        <div className="flex flex-1 flex-col gap-6 px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pb-10">
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1.15fr)_400px]">
            <div className="order-2 flex flex-col gap-6 lg:order-1">
              <ChartArea />
              <ActiveOrdersTable />
              <TradeHistoryPanel />
            </div>
            <div className="order-1 lg:order-2">
              <TradePanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
