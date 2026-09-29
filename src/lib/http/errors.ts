/**
 * Application-level errors that the HTTP layer knows how to translate.
 *
 * These classes are caught by the `respond.ts` helpers and mapped to JSON
 * responses with stable error codes that the UI can switch on without
 * parsing human-readable messages.
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  public readonly issues: { path: string; message: string }[];

  public constructor(issues: { path: string; message: string }[]) {
    super("Los datos enviados no son válidos.", 400, "VALIDACION_INVALIDA");
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class NotFoundError extends AppError {
  public constructor(public readonly resource: string, public readonly id: string | number) {
    super(`No se encontró ${resource} ${id}.`, 404, "NO_ENCONTRADO");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  public constructor(message: string) {
    super(message, 409, "CONFLICTO");
    this.name = "ConflictError";
  }
}

export class StorageError extends AppError {
  public constructor(message: string) {
    super(message, 503, "ALMACENAMIENTO_NO_DISPONIBLE");
    this.name = "StorageError";
  }
}
