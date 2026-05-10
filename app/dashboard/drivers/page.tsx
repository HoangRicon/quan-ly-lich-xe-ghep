"use client";

import { Sidebar, Header, BottomNav } from "@/components/dashboard";
import DriverList from "@/components/driver-list";

export default function DriversPage() {
  return (
    <div className="page-wrapper">
      <Sidebar>
        <Header />
        <div className="scroll-wrapper">
          <div className="p-4 lg:p-6 pb-24 lg:pb-0">
            <DriverList />
          </div>
        </div>
      </Sidebar>
      <BottomNav />
    </div>
  );
}
