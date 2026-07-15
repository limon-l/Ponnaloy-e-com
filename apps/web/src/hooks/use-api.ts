"use client";

import { useState, useCallback, useEffect } from "react";
import { api, type ApiResponse } from "@/lib/api";

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useApi<T>(endpoint: string, options: UseApiOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (customEndpoint?: string, token?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.get<ApiResponse<T>>(
          customEndpoint || endpoint,
          token
        );
        setData(result.data);
        options.onSuccess?.(result.data);
        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        options.onError?.(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, options]
  );

  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, []);

  return { data, loading, error, execute, setData };
}

export function useMutation<TInput, TOutput>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" = "POST"
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (body?: TInput, token?: string) => {
      setLoading(true);
      setError(null);
      try {
        let result: ApiResponse<TOutput>;
        switch (method) {
          case "POST":
            result = await api.post<ApiResponse<TOutput>>(endpoint, body, token);
            break;
          case "PUT":
            result = await api.put<ApiResponse<TOutput>>(endpoint, body, token);
            break;
          case "DELETE":
            result = await api.delete<ApiResponse<TOutput>>(endpoint, token);
            break;
        }
        setData(result.data);
        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method]
  );

  return { data, loading, error, mutate, setData };
}
