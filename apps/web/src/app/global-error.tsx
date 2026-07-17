"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Something went wrong!
          </h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              cursor: "pointer",
              border: "1px solid #ccc",
              borderRadius: "0.5rem",
              background: "#fff",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
