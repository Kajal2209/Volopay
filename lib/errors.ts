export type AppErrorCode = "NOT_FOUND" | "LOCKED" | "EXPIRED" | "INVALID_STATE" | "VALIDATION" | "CONFLICT";

const STATUS: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  LOCKED: 409,
  EXPIRED: 410,
  INVALID_STATE: 409,
  VALIDATION: 400,
  CONFLICT: 409,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const notFound = (m: string) => new AppError("NOT_FOUND", m);
export const locked = (m: string) => new AppError("LOCKED", m);
export const expired = (m: string) => new AppError("EXPIRED", m);
export const invalidState = (m: string) => new AppError("INVALID_STATE", m);
export const conflict = (m: string) => new AppError("CONFLICT", m);
export const validation = (m: string) => new AppError("VALIDATION", m);
