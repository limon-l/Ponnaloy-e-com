import type { ChatProduct, ChatStreamEventType } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ChatStreamCallbacks {
  onText: (chunk: string) => void;
  onProducts: (products: ChatProduct[]) => void;
  onComparison: (products: ChatProduct[]) => void;
  onSuggestions: (suggestions: string[]) => void;
  onDone: (conversationId: string) => void;
  onError: (error: string) => void;
}

export async function sendChatMessage(
  message: string,
  conversationId: string | null,
  token: string | null,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ message, conversationId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    callbacks.onError(data?.error || `Request failed (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError("No response stream");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          // If we have a pending event+data pair, process it
          if (currentEvent && currentData) {
            processEvent(currentEvent, currentData, callbacks);
            currentEvent = "";
            currentData = "";
          }
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentData += line.slice(6);
        } else if (line === "" && currentEvent && currentData) {
          processEvent(currentEvent, currentData, callbacks);
          currentEvent = "";
          currentData = "";
        }
      }

      // Process any remaining event+data pair
      if (currentEvent && currentData) {
        processEvent(currentEvent, currentData, callbacks);
        currentEvent = "";
        currentData = "";
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function processEvent(
  event: string,
  data: string,
  callbacks: ChatStreamCallbacks
): void {
  try {
    const parsed = JSON.parse(data);

    switch (event as ChatStreamEventType) {
      case "text":
        callbacks.onText(parsed);
        break;
      case "products":
        callbacks.onProducts(parsed);
        break;
      case "comparison":
        callbacks.onComparison(parsed);
        break;
      case "suggestions":
        callbacks.onSuggestions(parsed);
        break;
      case "done":
        callbacks.onDone(parsed.conversationId);
        break;
      case "error":
        callbacks.onError(parsed.error || "Unknown error");
        break;
    }
  } catch {
    // Skip malformed events
  }
}
