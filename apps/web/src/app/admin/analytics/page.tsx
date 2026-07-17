"use client";

import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">View store performance</p>
        </div>
      </div>

      <div className="border rounded-lg p-12 text-center">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Analytics dashboard will be available in a future update.
        </p>
      </div>
    </div>
  );
}
