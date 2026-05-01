import { NextResponse } from "next/server";
import { ZodError } from "zod";

type SuccessResponse<T> = {
  message?: string;
  data?: T;
  status?: number;
  meta?: Record<string, unknown>;
};

type ErrorResponse = {
  message?: string;
  status?: number;
  errors?: unknown;
};

export function successResponse<T>({
  message = "Success",
  data,
  status = 200,
  meta,
}: SuccessResponse<T>) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    },
    { status },
  );
}

export function errorResponse({
  message = "Internal server error",
  status = 500,
  errors,
}: ErrorResponse) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    },
    { status },
  );
}

export function validationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
    { status: 422 },
  );
}
