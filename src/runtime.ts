import type { Readable, Writable } from "node:stream";

// Readable and Writable preserve the operations needed by Bun's process streams and Clack.
export type InputStream = Readable & {
  readonly isTTY?: boolean;
};

export type OutputStream = Writable & {
  readonly isTTY?: boolean;
};

export interface RuntimeCapabilities {
  interactive: boolean;
  ci: boolean;
}

export interface Runtime {
  input: InputStream;
  stdout: OutputStream;
  stderr: OutputStream;
  capabilities: RuntimeCapabilities;
}

export interface RuntimeOptions {
  input?: InputStream;
  stdout?: OutputStream;
  stderr?: OutputStream;
  env?: Record<string, string | undefined>;
  capabilities?: Partial<RuntimeCapabilities>;
}

function isCI(env: Record<string, string | undefined>): boolean {
  const value = env.CI?.trim().toLowerCase();
  return value !== undefined && value !== "" && value !== "0" && value !== "false" && value !== "no";
}

export function createRuntime(options: RuntimeOptions = {}): Runtime {
  const input = options.input ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const env = options.env ?? process.env;
  const ci = options.capabilities?.ci ?? isCI(env);

  return {
    input,
    stdout,
    stderr,
    capabilities: {
      interactive: options.capabilities?.interactive ?? (Boolean(input.isTTY && stderr.isTTY) && !ci),
      ci,
    },
  };
}
