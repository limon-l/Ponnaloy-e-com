"use client";

import { Image } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminBannersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Banners</h1>
        <p className="text-muted-foreground">Manage homepage banners</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-1">Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Banner management will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
