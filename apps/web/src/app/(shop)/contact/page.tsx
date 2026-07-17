import { Mail, MapPin, Phone, Clock } from "lucide-react";

export default function ContactPage() {
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
          <form className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-1"
              >
                Subject
              </label>
              <input
                id="subject"
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-1"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Tell us more..."
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:opacity-90"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
