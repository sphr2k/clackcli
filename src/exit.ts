export const EXIT_CODES = {
  success: 0,
  negative: 1,
  failure: 2,
  cancelled: 130,
} as const;

export type ExitStatus = keyof typeof EXIT_CODES;
export type ExitCode = (typeof EXIT_CODES)[ExitStatus];

export function exitCodeFor(status: ExitStatus): ExitCode {
  return EXIT_CODES[status];
}

export class UserCancelledError extends Error {
  constructor(message = "Operation cancelled") {
    super(message);
    this.name = "UserCancelledError";
  }
}

export function isUserCancelled(error: unknown): error is UserCancelledError {
  return error instanceof UserCancelledError;
}
