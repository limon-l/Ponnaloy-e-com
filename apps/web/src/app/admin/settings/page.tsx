"use client";

import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage store settings</p>
        </div>
      </div>

      <div className="border rounded-lg p-12 text-center">
        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Settings management will be available in a future update.
        </p>
      </div>
    </div>
  );
}
