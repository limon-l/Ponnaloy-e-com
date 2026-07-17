"use client";

import { Folder } from "lucide-react";

export default function AdminCategoriesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90">
          Add Category
        </button>
      </div>

      <div className="border rounded-lg p-12 text-center">
        <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground">
          Category management will be available in a future update.
        </p>
      </div>
    </div>
  );
}
