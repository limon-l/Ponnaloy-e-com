import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, MessageSquare, Phone } from "lucide-react";

const faqs = [
  {
    question: "How do I track my order?",
    answer:
      "Once your order ships, you'll receive an email with a tracking number. You can also check your order status in the Orders section of your account.",
  },
  {
    question: "How do I return an item?",
    answer:
      "You can initiate a return within 30 days of delivery. Go to your Orders page, select the order, and click 'Return Item'. We'll provide a prepaid shipping label.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit/debit cards, digital wallets, and bank transfers. All payments are securely processed.",
  },
  {
    question: "How do I change or cancel my order?",
    answer:
      "Orders can be modified or cancelled within 1 hour of placement. After that, the order enters processing and cannot be changed.",
  },
  {
    question: "Do you offer international shipping?",
    answer:
      "Yes, we ship to over 50 countries. Shipping costs and delivery times vary by location and are calculated at checkout.",
  },
];

export default function HelpPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground mb-8">
          Find answers to common questions or get in touch with our support team.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="flex flex-col items-center p-6 border rounded-lg text-center">
            <HelpCircle className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">FAQ</h3>
            <p className="text-sm text-muted-foreground">
              Browse common questions
            </p>
          </div>
          <div className="flex flex-col items-center p-6 border rounded-lg text-center">
            <Mail className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Email</h3>
            <p className="text-sm text-muted-foreground">
              support@ponnaloy.com
            </p>
          </div>
          <div className="flex flex-col items-center p-6 border rounded-lg text-center">
            <Phone className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-1">Phone</h3>
            <p className="text-sm text-muted-foreground">+1 (555) 123-4567</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Can&apos;t find what you&apos;re looking for?
          </p>
          <Button asChild>
            <Link href="/contact">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
