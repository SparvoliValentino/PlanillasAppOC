/**
 * Persistence-agnostic repository errors.
 *
 * Every `FichaRepository` implementation (Google Sheets, ...)
 * throws these so the application and HTTP layers never depend on a
 * concrete adapter. `src/lib/http/respond.ts` maps them to HTTP responses.
 */

export class RepositoryNotFoundError extends Error {
  public readonly code = "FICHA_NO_ENCONTRADA";
  public constructor(public readonly numero: number) {
    super(`No se encontró la ficha ${numero}.`);
    this.name = "RepositoryNotFoundError";
  }
}

export class RepositoryConflictError extends Error {
  public readonly code = "FICHA_EN_CONFLICTO";
  public constructor(message: string) {
    super(message);
    this.name = "RepositoryConflictError";
  }
}

export class RepositoryStorageError extends Error {
  public readonly code = "REPOSITORIO_NO_DISPONIBLE";
  public constructor(message: string) {
    super(message);
    this.name = "RepositoryStorageError";
  }
}

export interface RepositoryValidationIssue {
  path: string;
  message: string;
}

/**
 * The storage backend rejected the payload as invalid. Rare, because the
 * application layer validates first; kept so the client still gets a 400.
 */
export class RepositoryValidationError extends Error {
  public readonly code = "FICHA_INVALIDA";
  public constructor(public readonly issues: RepositoryValidationIssue[]) {
    super("Los datos enviados no son válidos.");
    this.name = "RepositoryValidationError";
  }
}
