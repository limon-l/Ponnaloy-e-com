"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User, Package, Heart, MapPin, Pencil, Trash2, Plus, Save, X, Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/contexts/wishlist-context";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "secondary" },
  CONFIRMED: { label: "Confirmed", variant: "default" },
  PROCESSING: { label: "Processing", variant: "default" },
  SHIPPED: { label: "Shipped", variant: "default" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", variant: "default" },
  DELIVERED: { label: "Delivered", variant: "outline" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  RETURNED: { label: "Returned", variant: "destructive" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
};

function AccountPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const { isAuthenticated, user, loading: authLoading, refreshUser } = useAuth();

  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    total: number;
    items: Array<{ quantity: number; unitPrice: number; product: { name: string; images: Array<{ url: string }> } }>;
  }>>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const [addresses, setAddresses] = useState<Array<{
    id: string; label: string; fullName: string; phone?: string;
    addressLine1: string; addressLine2?: string;
    city: string; state: string; zipCode: string; country: string;
    isDefault: boolean;
  }>>([]);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "", fullName: "", phone: "", addressLine1: "", addressLine2: "",
    city: "", state: "", zipCode: "", country: "US", isDefault: false,
  });
  const [showNewAddress, setShowNewAddress] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    setProfileForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    });

    // Fetch orders
    api.get<{ success: boolean; data: Array<{
      id: string; orderNumber: string; createdAt: string; status: string; total: number;
      items: Array<{ quantity: number; unitPrice: number; product: { name: string; images: Array<{ url: string }> } }>;
    }> }>("/api/orders").then((res) => {
      if (res.success) setOrders(res.data);
    }).catch(() => {});

    // Fetch addresses
    api.get<{ success: boolean; data: Array<{
      id: string; label: string; fullName: string; phone?: string;
      addressLine1: string; addressLine2?: string;
      city: string; state: string; zipCode: string; country: string; isDefault: boolean;
    }> }>("/api/addresses").then((res) => {
      if (res.success) setAddresses(res.data);
    }).catch(() => {});
  }, [isAuthenticated, user]);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      await api.put("/api/user/profile", {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
      });
      await refreshUser();
      setEditingProfile(false);
    } catch {}
    setSavingProfile(false);
  };

  const handleAddressSave = async () => {
    try {
      if (editingAddress) {
        await api.put(`/api/addresses/${editingAddress}`, addressForm);
      } else {
        await api.post("/api/addresses", addressForm);
      }
      const res = await api.get<{ success: boolean; data: typeof addresses }>("/api/addresses");
      if (res.success) setAddresses(res.data);
      setEditingAddress(null);
      setShowNewAddress(false);
    } catch {}
  };

  const handleAddressDelete = async (id: string) => {
    try {
      await api.delete(`/api/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  const handleAddressCancel = () => {
    setEditingAddress(null);
    setShowNewAddress(false);
    setAddressForm({
      label: "", fullName: "", phone: "", addressLine1: "", addressLine2: "",
      city: "", state: "", zipCode: "", country: "US", isDefault: false,
    });
  };

  if (authLoading) {
    return (
      <div className="container py-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
        <div className="h-10 w-full bg-muted rounded animate-pulse mb-6" />
        <div className="h-64 w-full bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-16 text-center">
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sign in to your account</h1>
        <p className="text-muted-foreground mb-6">Manage your profile, orders, and preferences.</p>
        <Button asChild>
          <Link href="/sign-in?redirect=/account">Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, orders, and preferences</p>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="w-full justify-start h-auto flex-wrap">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4" />Orders</TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="h-4 w-4" />Wishlist
            {wishlistItems.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1">{wishlistItems.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2"><MapPin className="h-4 w-4" />Addresses</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your name, email, and phone number</CardDescription>
              </div>
              {!editingProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingProfile ? (
                <div className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <Input value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleProfileSave} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button variant="ghost" onClick={() => { setEditingProfile(false); setProfileForm({ firstName: user?.firstName || "", lastName: user?.lastName || "", phone: user?.phone || "" }); }}>
                      <X className="h-4 w-4 mr-2" />Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-sm text-muted-foreground">First Name</p><p className="font-medium">{user?.firstName || "-"}</p></div>
                    <div><p className="text-sm text-muted-foreground">Last Name</p><p className="font-medium">{user?.lastName || "-"}</p></div>
                  </div>
                  <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{user?.email}</p></div>
                  <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{user?.phone || "-"}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader><CardTitle>Order History</CardTitle><CardDescription>View and track your recent orders</CardDescription></CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <Button asChild className="mt-4"><Link href="/products">Start Shopping</Link></Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{order.orderNumber}</span>
                          <Badge variant={statusConfig[order.status]?.variant || "secondary"}>
                            {statusConfig[order.status]?.label || order.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.items.slice(0, 4).map((item, i) => (
                          <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                            <Image src={item.product.images?.[0]?.url || "https://picsum.photos/seed/product/600/600"} alt={item.product.name} fill className="object-cover" sizes="48px" />
                          </div>
                        ))}
                        <span className="text-sm text-muted-foreground">{order.items.length} item{order.items.length > 1 ? "s" : ""}</span>
                        <span className="ml-auto font-semibold">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wishlist Tab */}
        <TabsContent value="wishlist">
          <Card>
            <CardHeader><CardTitle>My Wishlist</CardTitle><CardDescription>Products you&apos;ve saved for later</CardDescription></CardHeader>
            <CardContent>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your wishlist is empty</p>
                  <Button asChild className="mt-4"><Link href="/products">Discover Products</Link></Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {wishlistItems.map((item) => (
                    <div key={item.productId} className="group border rounded-lg overflow-hidden">
                      <div className="relative aspect-square bg-muted">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                      </div>
                      <div className="p-3 space-y-2">
                        <Link href={`/product/${item.slug}`} className="text-sm font-medium line-clamp-2 hover:text-primary">{item.name}</Link>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{formatPrice(item.price)}</span>
                          {item.compareAtPrice && item.compareAtPrice > item.price && (
                            <span className="text-xs text-muted-foreground line-through">{formatPrice(item.compareAtPrice)}</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" asChild><Link href={`/product/${item.slug}`}>View</Link></Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeFromWishlist(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Saved Addresses</CardTitle>
                <CardDescription>Manage your shipping and billing addresses</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setShowNewAddress(true); setEditingAddress(null); setAddressForm({ label: "", fullName: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", zipCode: "", country: "US", isDefault: false }); }}>
                <Plus className="h-4 w-4 mr-2" />Add Address
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showNewAddress && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-medium">New Address</h4>
                  <AddressForm form={addressForm} onChange={setAddressForm} onSave={handleAddressSave} onCancel={handleAddressCancel} />
                </div>
              )}
              {addresses.length === 0 && !showNewAddress ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No addresses saved</p>
                </div>
              ) : (
                addresses.map((address) =>
                  editingAddress === address.id ? (
                    <div key={address.id} className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Edit Address</h4>
                      <AddressForm form={addressForm} onChange={setAddressForm} onSave={handleAddressSave} onCancel={handleAddressCancel} />
                    </div>
                  ) : (
                    <div key={address.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{address.label}</span>
                          {address.isDefault && <Badge variant="secondary">Default</Badge>}
                        </div>
                        <p className="text-sm">{address.fullName}</p>
                        <p className="text-sm text-muted-foreground">{address.addressLine1}</p>
                        {address.addressLine2 && <p className="text-sm text-muted-foreground">{address.addressLine2}</p>}
                        <p className="text-sm text-muted-foreground">{address.city}, {address.state} {address.zipCode}</p>
                        <p className="text-sm text-muted-foreground">{address.country}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAddress(address.id); setAddressForm({ ...address, phone: address.phone || "", addressLine2: address.addressLine2 || "" }); setShowNewAddress(false); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleAddressDelete(address.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="container py-8"><div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" /></div>}>
      <AccountPageContent />
    </Suspense>
  );
}

function AddressForm({ form, onChange, onSave, onCancel }: {
  form: { label: string; fullName: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; zipCode: string; country: string; isDefault: boolean };
  onChange: (val: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><label className="text-sm font-medium">Label</label><Input placeholder="e.g. Home, Office" value={form.label} onChange={(e) => onChange({ ...form, label: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">Full Name</label><Input value={form.fullName} onChange={(e) => onChange({ ...form, fullName: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><label className="text-sm font-medium">Phone</label><Input value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} /></div>
      <div className="space-y-1"><label className="text-sm font-medium">Street Address</label><Input value={form.addressLine1} onChange={(e) => onChange({ ...form, addressLine1: e.target.value })} /></div>
      <div className="space-y-1"><label className="text-sm font-medium">Apt / Suite (optional)</label><Input value={form.addressLine2} onChange={(e) => onChange({ ...form, addressLine2: e.target.value })} /></div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><label className="text-sm font-medium">City</label><Input value={form.city} onChange={(e) => onChange({ ...form, city: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">State</label><Input value={form.state} onChange={(e) => onChange({ ...form, state: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-sm font-medium">ZIP</label><Input value={form.zipCode} onChange={(e) => onChange({ ...form, zipCode: e.target.value })} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => onChange({ ...form, isDefault: e.target.checked })} className="rounded border-input" />
        <label htmlFor="isDefault" className="text-sm">Set as default address</label>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave}><Save className="h-4 w-4 mr-2" />Save</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
