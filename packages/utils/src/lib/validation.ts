import { ZodError, type ZodSchema } from "zod";
import { AppError } from "./errors.js";

/**
 * Validates transport input and converts schema failures into standardized app errors.
 */
export const validateSchema = <Output>(schema: ZodSchema<Output>, payload: unknown): Output => {
  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError("VALIDATION_ERROR", "Input validation failed", 422, {
        issues: error.issues
      });
    }

    throw error;
  }
};

