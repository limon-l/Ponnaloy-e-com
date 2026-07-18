"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="container py-16 text-center">
        <CheckCircle className="h-16 w-16 mx-auto text-primary mb-4" />
        <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Thank you for reaching out. We&apos;ll get back to you within 24 hours.
        </p>
        <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have a question or need assistance? We&apos;re here to help.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Mail className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Email</h3>
              <p className="text-muted-foreground">support@ponnaloy.com</p>
              <p className="text-sm text-muted-foreground mt-1">
                We reply within 24 hours
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Phone className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Phone</h3>
              <p className="text-muted-foreground">+1 (555) 123-4567</p>
              <p className="text-sm text-muted-foreground mt-1">
                Mon-Fri, 9am-6pm EST
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <MapPin className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Address</h3>
              <p className="text-muted-foreground">
                123 Commerce Street
                <br />
                Suite 100
                <br />
                New York, NY 10001
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 border rounded-lg">
            <Clock className="h-6 w-6 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold">Business Hours</h3>
              <p className="text-muted-foreground">
                Monday - Friday: 9am - 6pm
                <br />
                Saturday: 10am - 4pm
                <br />
                Sunday: Closed
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-8">
          <h2 className="text-xl font-bold mb-4">Send us a message</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="How can we help?"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={5}
                placeholder="Tell us more..."
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                required
              />
            </div>
            <Button type="submit">Send Message</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
