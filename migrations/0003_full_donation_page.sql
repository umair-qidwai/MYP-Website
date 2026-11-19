-- Keep the original pages in revision history before consolidating them.
INSERT INTO revisions (entity_type, entity_id, action, data_json, title, created_at)
SELECT 'page', id, 'save', draft_json, title, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM pages WHERE path IN ('donors', 'donate') AND deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM pages WHERE path = 'donors' AND deleted_at IS NULL);

INSERT INTO revisions (entity_type, entity_id, action, data_json, title, created_at)
SELECT 'page', id, 'publish', published_json, title, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM pages WHERE path IN ('donors', 'donate') AND deleted_at IS NULL AND published_json IS NOT NULL
  AND EXISTS (SELECT 1 FROM pages WHERE path = 'donors' AND deleted_at IS NULL);

-- Retain the previous standalone form page in the bin and free the /donate path.
-- The original Donors row keeps its ID, history, media references, and drafts.
UPDATE pages
SET path = 'donate-previous-' || id, status = 'archived',
    deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE path = 'donate'
  AND EXISTS (SELECT 1 FROM pages WHERE path = 'donors' AND deleted_at IS NULL);

-- Transform drafts and published content separately, keeping unpublished edits private.
WITH documents AS (
  SELECT id, 'draft' AS version, draft_json AS doc FROM pages WHERE path = 'donors' AND deleted_at IS NULL
  UNION ALL
  SELECT id, 'published', published_json FROM pages WHERE path = 'donors' AND deleted_at IS NULL AND published_json IS NOT NULL
), parts AS (
  SELECT d.id, d.version, b.key AS position, b.value
  FROM documents d, json_each(d.doc, '$.blocks') b
  UNION ALL
  SELECT id, version, CASE WHEN json_extract(doc, '$.blocks[0].type') = 'hero' THEN 0.1 ELSE -2 END,
    '{"id":"donation-form","type":"embed","provider":"zeffy","url":"https://www.zeffy.com/embed/donation-form/build-lasting-sustainability-with-my-project-usa","title":"Donate to MY Project USA","aspect":"form"}'
  FROM documents
  UNION ALL
  SELECT id, version, CASE WHEN json_extract(doc, '$.blocks[0].type') = 'hero' THEN 0.2 ELSE -1 END,
    '{"id":"donation-all-campaigns","type":"buttons","align":"center","buttons":[{"label":"View all campaigns on Zeffy","href":"https://www.zeffy.com/en-US/organizations/my-project-usa","style":"secondary"}]}'
  FROM documents
), rebuilt AS (
  SELECT d.id, d.version, json_set(d.doc,
    '$.title', 'Donate',
    '$.seo.title', 'Donate | MY Project USA',
    '$.blocks', json((
      SELECT json_group_array(json(value)) FROM (
        SELECT replace(p.value, '"/donate"', '"#section-donation-form"') AS value
        FROM parts p WHERE p.id = d.id AND p.version = d.version ORDER BY p.position
      )
    ))
  ) AS doc FROM documents d
)
UPDATE pages
SET path = 'donate', title = 'Donate',
    draft_json = (SELECT doc FROM rebuilt WHERE id = pages.id AND version = 'draft'),
    published_json = (SELECT doc FROM rebuilt WHERE id = pages.id AND version = 'published'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE path = 'donors' AND deleted_at IS NULL;

-- Point existing internal links at the consolidated giving page.
UPDATE pages
SET draft_json = replace(draft_json, '"/donors"', '"/donate"'),
    published_json = replace(published_json, '"/donors"', '"/donate"'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE deleted_at IS NULL AND (instr(draft_json, '"/donors"') > 0 OR instr(published_json, '"/donors"') > 0);

UPDATE entries
SET draft_json = replace(draft_json, '"/donors"', '"/donate"'),
    published_json = replace(published_json, '"/donors"', '"/donate"'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE deleted_at IS NULL AND (instr(draft_json, '"/donors"') > 0 OR instr(published_json, '"/donors"') > 0);

UPDATE settings
SET value_json = replace(value_json, '"/donors"', '"/donate"'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE instr(value_json, '"/donors"') > 0;

UPDATE settings
SET value_json = replace(replace(value_json, '"DONORS"', '"DONATE"'), '"Donors"', '"Donate"'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'navigation';

UPDATE redirects SET to_path = '/donate' WHERE to_path = '/donors';
INSERT INTO redirects (from_path, to_path, status_code, source, created_at)
VALUES ('/donors', '/donate', 301, 'manual', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(from_path) DO UPDATE SET to_path = excluded.to_path, status_code = 301;
