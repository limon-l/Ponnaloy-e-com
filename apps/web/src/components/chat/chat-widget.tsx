"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendChatMessage } from "@/lib/chat-api";
import { ChatMessage } from "./chat-message";
import type { ChatMessage as ChatMessageType, ChatProduct } from "@/types";

function createWelcomeMessage(): ChatMessageType {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "Hi there! I'm Marvin, your shopping assistant. I can help you find products, compare options, check prices, and more. What are you looking for?",
    timestamp: new Date(0),
    suggestions: [
      "Show me today's deals",
      "Help me find a gift under $50",
      "What's trending?",
      "Show all categories",
    ],
  };
}

const QUICK_PROMPTS = [
  { icon: "🔥", label: "Deals", message: "Show me today's best deals" },
  { icon: "⭐", label: "Top Rated", message: "Show products with 4.5+ star ratings" },
  { icon: "🆕", label: "New Arrivals", message: "What are the new arrivals?" },
  { icon: "🎁", label: "Gift Ideas", message: "Recommend a birthday gift under $50" },
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>(() => [
    createWelcomeMessage(),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fix welcome message timestamp after hydration to match real time
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === "welcome" && m.timestamp.getTime() === 0
          ? { ...m, timestamp: new Date() }
          : m
      )
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text || inputValue).trim();
      if (!msg || isStreaming) return;

      const userMessage: ChatMessageType = {
        id: `user-${Date.now()}`,
        role: "user",
        content: msg,
        timestamp: new Date(),
      };

      // Create a loading assistant message
      const loadingId = `assistant-${Date.now()}`;
      const loadingMessage: ChatMessageType = {
        id: loadingId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);
      setInputValue("");
      setIsStreaming(true);

      let textContent = "";
      let products: ChatProduct[] | undefined;
      let comparison: ChatProduct[] | undefined;
      let suggestions: string[] | undefined;
      let newConversationId = conversationId;

      try {
        await sendChatMessage(msg, conversationId, null, {
          onText: (chunk) => {
            textContent += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? { ...m, content: textContent, isLoading: false }
                  : m
              )
            );
          },
          onProducts: (data) => {
            products = data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId ? { ...m, products: data } : m
              )
            );
          },
          onComparison: (data) => {
            comparison = data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId ? { ...m, comparison: data } : m
              )
            );
          },
          onSuggestions: (data) => {
            suggestions = data;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId ? { ...m, suggestions: data } : m
              )
            );
          },
          onDone: (id) => {
            newConversationId = id;
            setConversationId(id);
          },
          onError: (error) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === loadingId
                  ? {
                      ...m,
                      content: `Sorry, something went wrong: ${error}. Please try again.`,
                      isLoading: false,
                    }
                  : m
              )
            );
          },
        });
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  content: "Sorry, I couldn't process that. Please try again.",
                  isLoading: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [inputValue, isStreaming, conversationId]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105",
          isOpen
            ? "bg-destructive hover:bg-destructive/90"
            : "bg-primary hover:bg-primary/90"
        )}
        size="icon"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
        {/* Notification dot */}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500" />
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border bg-background shadow-2xl transition-all duration-300 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Marvin</h3>
            <p className="text-xs text-muted-foreground">
              Shopping Assistant
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-green-600">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "420px", minHeight: "300px" }}>
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSuggestionSelect={handleSuggestionSelect}
                isLast={i === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Prompts (shown when few messages) */}
        {messages.length <= 2 && (
          <div className="border-t px-4 py-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.message)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  <span>{prompt.icon}</span>
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about products, prices, deals..."
              disabled={isStreaming}
              className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputValue.trim() || isStreaming}
              className="h-9 w-9 shrink-0 rounded-full"
            >
              {isStreaming ? (
                <ShoppingCart className="h-4 w-4 animate-pulse" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
