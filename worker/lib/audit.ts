import type { SessionUser } from "@shared/types";
import { nowIso } from "./util";

export async function audit(
  db: D1Database,
  user: Pick<SessionUser, "id" | "email"> | null,
  action: string,
  entityType?: string,
  entityId?: string,
  detail?: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO audit_log (user_id, user_email, action, entity_type, entity_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(user?.id ?? null, user?.email ?? null, action, entityType ?? null, entityId ?? null, detail?.slice(0, 1000) ?? null, nowIso())
    .run();
}
