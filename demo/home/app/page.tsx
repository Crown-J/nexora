"use client"

import { useState } from "react"
import { Dock, MobileDock } from "@/components/dock"
import { TopBar } from "@/components/top-bar"
import { GreetingSection } from "@/components/greeting-section"
import { BulletinBoard } from "@/components/bulletin-board"
import { CalendarPanel } from "@/components/calendar-panel"
import { CalendarDetails } from "@/components/calendar-details"
import { MemoPanel } from "@/components/memo-panel"
import { TaskList } from "@/components/task-list"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/[0.015] rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Desktop Dock - Hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Dock />
      </div>

      {/* Main Layout */}
      <div className="lg:pl-24 relative">
        <TopBar />

        {/* Main Content */}
        <main className="p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Section 1: Greeting + Bulletin */}
            <section className="space-y-6">
              <GreetingSection />
              <BulletinBoard />
            </section>

            {/* Section 2: Calendar + Details */}
            <section className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
              <CalendarPanel
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              <CalendarDetails selectedDate={selectedDate} />
            </section>

            {/* Section 3: Memo + Task List */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MemoPanel />
              <TaskList />
            </section>
          </div>
        </main>
      </div>

      {/* Mobile Dock */}
      <MobileDock />
    </div>
  )
}
