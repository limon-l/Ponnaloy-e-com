"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Package,
  Heart,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useWishlist } from "@/contexts/wishlist-context";

// --- Mock Data ---

const mockUser = {
  firstName: "Sarah",
  lastName: "Anderson",
  email: "sarah.anderson@example.com",
  phone: "+1 (555) 123-4567",
};

const mockOrders = [
  {
    id: "ORD-2024-001",
    date: "2024-12-15",
    status: "delivered" as const,
    total: 32998,
    items: [
      {
        name: "Wireless Earbuds Pro",
        image: "https://picsum.photos/seed/earbuds/600/600",
        price: 7999,
        quantity: 1,
      },
      {
        name: "Smart Watch Ultra",
        image: "https://picsum.photos/seed/watch/600/600",
        price: 24999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-002",
    date: "2024-12-20",
    status: "shipped" as const,
    total: 7999,
    items: [
      {
        name: "Leather Crossbody Bag",
        image: "https://picsum.photos/seed/bag/600/600",
        price: 7999,
        quantity: 1,
      },
    ],
  },
  {
    id: "ORD-2024-003",
    date: "2025-01-05",
    status: "pending" as const,
    total: 6498,
    items: [
      {
        name: "Cotton Crew Neck T-Shirt",
        image: "https://picsum.photos/seed/tshirt/600/600",
        price: 2499,
        quantity: 1,
      },
      {
        name: "Minimalist Desk Lamp",
        image: "https://picsum.photos/seed/lamp/600/600",
        price: 3999,
        quantity: 1,
      },
    ],
  },
];

const mockAddresses = [
  {
    id: "a1",
    label: "Home",
    name: "Sarah Anderson",
    street: "123 Maple Street",
    city: "Portland",
    state: "OR",
    zip: "97201",
    country: "US",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Office",
    name: "Sarah Anderson",
    street: "456 Business Ave, Suite 200",
    city: "Portland",
    state: "OR",
    zip: "97204",
    country: "US",
    isDefault: false,
  },
];

// --- Status Helpers ---

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  shipped: { label: "Shipped", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

// --- Page Component ---

function AccountPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";

  const [user, setUser] = useState(mockUser);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(mockUser);
  const { items: wishlistItems, removeItem: removeFromWishlist } = useWishlist();
  const [addresses, setAddresses] = useState(mockAddresses);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    isDefault: false,
  });
  const [showNewAddress, setShowNewAddress] = useState(false);

  const handleProfileSave = () => {
    setUser(profileForm);
    setEditingProfile(false);
  };

  const handleAddressEdit = (address: (typeof mockAddresses)[0]) => {
    setEditingAddress(address.id);
    setAddressForm(address);
    setShowNewAddress(false);
  };

  const handleAddressSave = () => {
    if (editingAddress) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingAddress ? { ...addressForm, id: editingAddress } : a))
      );
      setEditingAddress(null);
    } else {
      setAddresses((prev) => [
        ...prev,
        { ...addressForm, id: `a${Date.now()}` },
      ]);
      setShowNewAddress(false);
    }
    setAddressForm({
      label: "",
      name: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      isDefault: false,
    });
  };

  const handleAddressDelete = (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddressCancel = () => {
    setEditingAddress(null);
    setShowNewAddress(false);
    setAddressForm({
      label: "",
      name: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "US",
      isDefault: false,
    });
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, orders, and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="w-full justify-start h-auto flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="gap-2">
            <Heart className="h-4 w-4" />
            Wishlist
            {wishlistItems.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1">
                {wishlistItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            Addresses
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your name, email, and phone number
                </CardDescription>
              </div>
              {!editingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {editingProfile ? (
                <div className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleProfileSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileForm(user);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">First Name</p>
                      <p className="font-medium">{user.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Name</p>
                      <p className="font-medium">{user.lastName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                View and track your recent orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                  <Button asChild className="mt-4">
                    <Link href="/products">Start Shopping</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{order.id}</span>
                          <Badge variant={statusConfig[order.status].variant}>
                            {statusConfig[order.status].label}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(order.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="relative w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0"
                          >
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                        ))}
                        <span className="text-sm text-muted-foreground">
                          {order.items.length} item{order.items.length > 1 ? "s" : ""}
                        </span>
                        <span className="ml-auto font-semibold">
                          {formatPrice(order.total)}
                        </span>
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
            <CardHeader>
              <CardTitle>My Wishlist</CardTitle>
              <CardDescription>
                Products you&apos;ve saved for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              {wishlistItems.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Your wishlist is empty
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/products">Discover Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.productId}
                      className="group border rounded-lg overflow-hidden"
                    >
                      <div className="relative aspect-square bg-muted">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </div>
                      <div className="p-3 space-y-2">
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-sm font-medium line-clamp-2 hover:text-primary"
                        >
                          {item.name}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {formatPrice(item.price)}
                          </span>
                          {item.compareAtPrice && item.compareAtPrice > item.price && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatPrice(item.compareAtPrice)}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" asChild>
                            <Link href={`/product/${item.slug}`}>
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeFromWishlist(item.productId)}
                          >
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
                <CardDescription>
                  Manage your shipping and billing addresses
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setShowNewAddress(true);
                  setEditingAddress(null);
                  setAddressForm({
                    label: "",
                    name: "",
                    street: "",
                    city: "",
                    state: "",
                    zip: "",
                    country: "US",
                    isDefault: false,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Address Form */}
              {showNewAddress && (
                <div className="border rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold">New Address</h4>
                  <AddressForm
                    form={addressForm}
                    onChange={setAddressForm}
                    onSave={handleAddressSave}
                    onCancel={handleAddressCancel}
                  />
                </div>
              )}

              {/* Address List */}
              {addresses.length === 0 && !showNewAddress ? (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No addresses saved</p>
                </div>
              ) : (
                addresses.map((address) =>
                  editingAddress === address.id ? (
                    <div
                      key={address.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <h4 className="font-semibold">Edit Address</h4>
                      <AddressForm
                        form={addressForm}
                        onChange={setAddressForm}
                        onSave={handleAddressSave}
                        onCancel={handleAddressCancel}
                      />
                    </div>
                  ) : (
                    <div
                      key={address.id}
                      className="border rounded-lg p-4 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{address.label}</span>
                          {address.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm">{address.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.street}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} {address.zip}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.country}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleAddressEdit(address)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleAddressDelete(address.id)}
                        >
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
    <Suspense
      fallback={
        <div className="container py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse mb-8" />
          <div className="h-10 w-full bg-muted rounded animate-pulse mb-6" />
          <div className="h-64 w-full bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}

// --- Address Form Component ---

function AddressForm({
  form,
  onChange,
  onSave,
  onCancel,
}: {
  form: {
    label: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault: boolean;
  };
  onChange: (val: {
    label: string;
    name: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    isDefault: boolean;
  }) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Label</label>
          <Input
            placeholder="e.g. Home, Office"
            value={form.label}
            onChange={(e) => onChange({ ...form, label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Full Name</label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Street Address</label>
        <Input
          value={form.street}
          onChange={(e) => onChange({ ...form, street: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">City</label>
          <Input
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">State</label>
          <Input
            value={form.state}
            onChange={(e) => onChange({ ...form, state: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">ZIP</label>
          <Input
            value={form.zip}
            onChange={(e) => onChange({ ...form, zip: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={form.isDefault}
          onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
          className="rounded border-input"
        />
        <label htmlFor="isDefault" className="text-sm">
          Set as default address
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
