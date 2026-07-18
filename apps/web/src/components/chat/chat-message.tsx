"use client";

import { useState, useEffect } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatProductCard } from "./chat-product-card";
import { ChatComparison } from "./chat-comparison";
import { ChatSuggestions } from "./chat-suggestions";
import type { ChatMessage as ChatMessageType } from "@/types";

function Timestamp({ time }: { time: Date }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="px-1 text-[10px] text-muted-foreground">&nbsp;</span>;
  return (
    <span className="px-1 text-[10px] text-muted-foreground">
      {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestionSelect: (suggestion: string) => void;
  isLast?: boolean;
}

export function ChatMessage({
  message,
  onSuggestionSelect,
  isLast,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Text bubble */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            {message.isLoading ? (
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )}

        {/* Product cards */}
        {message.products && message.products.length > 0 && (
          <div className="flex w-full max-w-sm flex-col gap-1.5">
            {message.products.map((product) => (
              <ChatProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Comparison */}
        {message.comparison && message.comparison.length > 0 && (
          <div className="w-full max-w-sm rounded-lg border bg-card p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Comparison
            </p>
            <ChatComparison products={message.comparison} />
          </div>
        )}

        {/* Suggestions */}
        {isLast && message.suggestions && message.suggestions.length > 0 && (
          <ChatSuggestions
            suggestions={message.suggestions}
            onSelect={onSuggestionSelect}
          />
        )}

        {/* Timestamp */}
        <Timestamp time={message.timestamp} />
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
