import { z } from 'zod';
import { ErrorCode } from './error-code.js';

export const apiErrorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.object({
    code: z.enum(ErrorCode),
    message: z.string(),
    details: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional(),
  }),
  requestId: z.uuid(),
  timestamp: z.iso.datetime(),
  path: z.string(),
});
