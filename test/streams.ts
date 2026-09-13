import { PassThrough } from "node:stream";
import type { InputStream, OutputStream } from "../src/runtime";

export function inputStream(isTTY: boolean): InputStream {
  const stream = new PassThrough();
  Object.defineProperty(stream, "isTTY", { value: isTTY });
  return stream as InputStream;
}

export function outputStream(isTTY: boolean, onWrite?: (chunk: string) => void): OutputStream {
  const stream = new PassThrough();
  Object.defineProperty(stream, "isTTY", { value: isTTY });
  if (onWrite) stream.on("data", (chunk: Buffer) => onWrite(chunk.toString()));
  return stream as OutputStream;
}
