"use client";

import { Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminCategoriesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Manage product categories</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-1">Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Category management will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
