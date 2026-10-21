import { nowIso } from "./util";

const KEEP = 50; // revisions kept per item

export async function addRevision(
  db: D1Database,
  entityType: "page" | "entry" | "setting",
  entityId: string,
  action: string,
  data: unknown,
  title: string | null,
  userId: string | null,
): Promise<void> {
  await db.batch([
    db
      .prepare("INSERT INTO revisions (entity_type, entity_id, action, data_json, title, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(entityType, entityId, action, JSON.stringify(data), title, userId, nowIso()),
    db
      .prepare(
        `DELETE FROM revisions WHERE entity_type = ?1 AND entity_id = ?2 AND id NOT IN
         (SELECT id FROM revisions WHERE entity_type = ?1 AND entity_id = ?2 ORDER BY id DESC LIMIT ?3)`,
      )
      .bind(entityType, entityId, KEEP),
  ]);
}

export async function listRevisions(db: D1Database, entityType: string, entityId: string) {
  const { results } = await db
    .prepare(
      `SELECT r.id, r.action, r.title, r.created_at, u.name AS user_name FROM revisions r
       LEFT JOIN users u ON u.id = r.created_by WHERE r.entity_type = ? AND r.entity_id = ? ORDER BY r.id DESC LIMIT 50`,
    )
    .bind(entityType, entityId)
    .all<{ id: number; action: string; title: string | null; created_at: string; user_name: string | null }>();
  return results.map((r) => ({ id: r.id, action: r.action, title: r.title, createdAt: r.created_at, userName: r.user_name }));
}

export async function getRevision(db: D1Database, entityType: string, entityId: string, revId: number) {
  return db
    .prepare("SELECT data_json FROM revisions WHERE id = ? AND entity_type = ? AND entity_id = ?")
    .bind(revId, entityType, entityId)
    .first<{ data_json: string }>();
}
