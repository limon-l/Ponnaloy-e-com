"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Loader2, Store, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/auth-context";
import { useSeller } from "@/contexts/seller-context";
import { api } from "@/lib/api";

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function SellerApplyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    memberships,
    applications,
    loading,
    refresh,
  } = useSeller();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    registrationNumber: "",
    taxId: "",
    contactEmail: "",
    contactPhone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    description: "",
  });

  useEffect(() => {
    if (user?.email) {
      setForm((current) =>
        current.contactEmail ? current : { ...current, contactEmail: user.email }
      );
    }
  }, [user?.email]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/seller/apply", {
        businessName: form.businessName.trim(),
        businessType: form.businessType.trim() || undefined,
        registrationNumber: form.registrationNumber.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        address: {
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim() || undefined,
          postalCode: form.postalCode.trim(),
          country: form.country.trim().toUpperCase(),
        },
        description: form.description.trim() || undefined,
      });
      toast({
        title: "Application submitted",
        description: "An administrator will review your store details.",
        variant: "success",
      });
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit the application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading seller status…
      </p>
    );
  }

  const latestApplication = applications[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seller status</h1>
        <p className="text-muted-foreground">
          Apply to open a store or review the status of an existing
          application.
        </p>
      </div>

      {memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Your stores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{membership.seller.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Role: {membership.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {membership.seller.status}
                  </Badge>
                  {membership.seller.status === "APPROVED" && (
                    <Button asChild size="sm">
                      <Link href="/seller">Open dashboard</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {latestApplication && (
        <Card>
          <CardHeader>
            <CardTitle>Latest application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={statusStyles[latestApplication.status] ?? ""}
              >
                {latestApplication.status.replace(/_/g, " ")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Submitted{" "}
                {new Date(latestApplication.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm">
              <strong>{latestApplication.businessName}</strong>
            </p>
            {latestApplication.reviewNote && (
              <p className="rounded-md border bg-muted/50 p-3 text-sm">
                Reviewer note: {latestApplication.reviewNote}
              </p>
            )}
            {latestApplication.status === "APPROVED" ? (
              <p className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Approved. You can start publishing products after moderation.
              </p>
            ) : latestApplication.status === "REJECTED" ? (
              <p className="flex items-center gap-2 text-sm text-red-700">
                <XCircle className="h-4 w-4" />
                This application was rejected. Contact support if you believe
                this is an error.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                The marketplace team is reviewing your application.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {memberships.length === 0 &&
        (!latestApplication ||
          ["REJECTED", "CHANGES_REQUESTED"].includes(latestApplication.status)) && (
          <Card>
            <CardHeader>
              <CardTitle>Seller application</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                  >
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="business-name">Business / store name</Label>
                    <Input
                      id="business-name"
                      value={form.businessName}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessName: event.target.value,
                        }))
                      }
                      required
                      minLength={2}
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-type">Business type</Label>
                    <Input
                      id="business-type"
                      value={form.businessType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          businessType: event.target.value,
                        }))
                      }
                      placeholder="Sole trader, LLC…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration-number">
                      Registration number
                    </Label>
                    <Input
                      id="registration-number"
                      value={form.registrationNumber}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          registrationNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax-id">Tax ID</Label>
                    <Input
                      id="tax-id"
                      value={form.taxId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          taxId: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Contact phone</Label>
                    <Input
                      id="contact-phone"
                      value={form.contactPhone}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contactPhone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="contact-email">Contact email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contactEmail: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <fieldset className="space-y-4 rounded-lg border p-4">
                  <legend className="px-1 text-sm font-medium">
                    Business address
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-line1">Address line 1</Label>
                      <Input
                        id="address-line1"
                        value={form.line1}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            line1: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="address-line2">Address line 2</Label>
                      <Input
                        id="address-line2"
                        value={form.line2}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            line2: event.target.value,
                          }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-city">City</Label>
                      <Input
                        id="address-city"
                        value={form.city}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-state">State / region</Label>
                      <Input
                        id="address-state"
                        value={form.state}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-postal">Postal code</Label>
                      <Input
                        id="address-postal"
                        value={form.postalCode}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            postalCode: event.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-country">Country (ISO-2)</Label>
                      <Input
                        id="address-country"
                        value={form.country}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            country: event.target.value,
                          }))
                        }
                        required
                        minLength={2}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="space-y-2">
                  <Label htmlFor="application-description">
                    What will you sell?
                  </Label>
                  <Textarea
                    id="application-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    maxLength={2000}
                  />
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit application
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
