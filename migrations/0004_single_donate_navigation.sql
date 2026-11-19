-- Keep one primary Donate action, removing the former Donors menu entry.
INSERT INTO revisions (entity_type, entity_id, action, data_json, title, created_at)
SELECT 'setting', key, 'save', value_json, 'Navigation', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM settings WHERE key = 'navigation';

UPDATE settings
SET value_json = json_set(value_json, '$.main', json((
      SELECT json_group_array(json(value)) FROM (
        SELECT item.value FROM json_each(settings.value_json, '$.main') AS item
        WHERE NOT (
          json_extract(item.value, '$.href') IN ('/donate', '/donors')
          AND coalesce(json_array_length(item.value, '$.children'), 0) = 0
        )
        ORDER BY CAST(item.key AS INTEGER)
      )
    ))),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'navigation';
