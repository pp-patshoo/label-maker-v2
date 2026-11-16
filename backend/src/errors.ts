import type { z } from 'zod'

/** An error that is sent to the client as `{ error: code, ...extra }`. */
export class HttpError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly extra?: Record<string, unknown>

  constructor(statusCode: number, code: string, extra?: Record<string, unknown>) {
    super(code)
    this.statusCode = statusCode
    this.code = code
    this.extra = extra
  }
}

/** Validate input with zod; any problem becomes 400 `invalid_request`. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw new HttpError(400, 'invalid_request')
  return result.data
}
