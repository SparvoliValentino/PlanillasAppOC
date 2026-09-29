/**
 * HTTP helpers for the App Router routes.
 *
 * Routes catch every thrown value, route known `AppError` subclasses to a
 * typed JSON error response, and fall back to a generic 500 with no stack
 * trace to the client.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AppError,
  NotFoundError,
  StorageError,
  ValidationError,
} from "./errors";
import { RepositoryNotFoundError, RepositoryStorageError } from "@/features/fichas/infrastructure/mockFichaRepository";

interface ErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status: 201 });
}

export function errorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof ZodError) {
    const body: ErrorBody = {
      error: "VALIDACION_INVALIDA",
      message: "Los datos enviados no son válidos.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
    return NextResponse.json(body, { status: 400 });
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
        details: error.issues,
      },
      { status: error.status },
    );
  }

  if (error instanceof RepositoryNotFoundError) {
    const notFound = new NotFoundError("la ficha", error.numero);
    return NextResponse.json(
      { error: notFound.code, message: notFound.message },
      { status: notFound.status },
    );
  }

  if (error instanceof RepositoryStorageError) {
    const storage = new StorageError("El repositorio de fichas no está disponible.");
    return NextResponse.json(
      { error: storage.code, message: storage.message },
      { status: storage.status },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.status },
    );
  }

  // Unknown error: log server-side but do not leak details to the client.
  console.error("Unhandled error in API route:", error);
  return NextResponse.json(
    { error: "ERROR_INESPERADO", message: "Ocurrió un error inesperado." },
    { status: 500 },
  );
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError([
      { path: "<body>", message: "El cuerpo de la solicitud no es JSON válido." },
    ]);
  }
}
