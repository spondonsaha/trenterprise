import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export class PermissionError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "PermissionError";
  }
}

export class StockError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? "Invalid input." };
  }
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { ok: false, error: "A record with that value already exists." };
    }
    if (error.code === "P2025") {
      return { ok: false, error: "The record could not be found." };
    }
    if (error.code === "P2003") {
      return { ok: false, error: "This record is still referenced by other records." };
    }
  }
  console.error("Unhandled action error:", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export function zodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
