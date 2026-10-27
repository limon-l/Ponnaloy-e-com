import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { config } from "../config/env";

/**
 * Local disk storage driver.
 *
 * This is a real, working upload target for single-instance deployments and
 * development. It is deliberately separated from the route so that a durable
 * object-storage driver (R2/S3) can be added without changing the HTTP API.
 * Files are written under `UPLOAD_DIR` and served at `/uploads/<filename>`.
 */

export const UPLOAD_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isAllowedUpload(mimetype: string): boolean {
  return mimetype in UPLOAD_MIME_EXTENSIONS;
}

export interface StoredUpload {
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
}

export async function saveUpload(
  buffer: Buffer,
  mimetype: string
): Promise<StoredUpload> {
  const extension = UPLOAD_MIME_EXTENSIONS[mimetype];
  if (!extension) {
    throw new Error(`Unsupported upload type: ${mimetype}`);
  }
  if (buffer.byteLength === 0) {
    throw new Error("Uploaded file is empty");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded file exceeds the 10MB limit");
  }

  const directory = resolve(process.cwd(), config.uploads.dir);
  await mkdir(directory, { recursive: true });

  // Never trust the client filename for the stored path: generate a random
  // name and derive the extension from the validated MIME type.
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  await writeFile(join(directory, filename), buffer);

  const path = `/uploads/${filename}`;
  return {
    filename,
    path,
    url: path,
    mimetype,
    size: buffer.byteLength,
  };
}
