"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ReactNode } from "react";
import { VoiceCommerce } from "../features/VoiceCommerce";

export const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
        {/* Global floating Voice Commerce button */}
        <VoiceCommerce />
      </div>
    </div>
  );
};
