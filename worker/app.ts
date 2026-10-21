import { Hono } from "hono";
import type { SessionUser } from "@shared/types";
import type { SessionRow } from "./lib/session";

export type AppEnv = {
  Bindings: Env;
  Variables: { user: SessionUser; session: SessionRow };
};

export const createApp = () => new Hono<AppEnv>();

export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 422 | 429 | 500,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
