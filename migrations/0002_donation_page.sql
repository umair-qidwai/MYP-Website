-- Add an editable donation page without overwriting an existing /donate page.
WITH donation(doc) AS (
  SELECT json('{
    "title": "Donate",
    "intro": "Help protect, educate, and empower youth and strengthen families in our community.",
    "seo": {
      "title": "Donate | MY Project USA",
      "description": "Support MY Project USA. Give once or become a recurring donor using our secure donation form."
    },
    "blocks": [
      {
        "id": "donation-form",
        "type": "embed",
        "provider": "zeffy",
        "url": "https://www.zeffy.com/embed/donation-form/build-lasting-sustainability-with-my-project-usa",
        "title": "Donate to MY Project USA",
        "aspect": "form"
      },
      {
        "id": "donation-other-ways",
        "type": "buttons",
        "align": "center",
        "buttons": [{ "label": "Other ways to give", "href": "/donors", "style": "secondary" }]
      }
    ]
  }')
)
INSERT OR IGNORE INTO pages (id, path, title, status, draft_json, published_json, has_changes, published_at, created_at, updated_at)
SELECT 'page_donate', 'donate', 'Donate', 'published', doc, doc, 0,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM donation;

-- Change only the two existing general-giving destinations. Campaign-specific
-- Zakat, Iftar, Community Table and event links keep their current destinations.
UPDATE pages
SET draft_json = replace(replace(draft_json,
      '"https://www.zeffy.com/en-US/organizations/my-project-usa"', '"/donate"'),
      '"https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa"', '"/donate"'),
    published_json = replace(replace(published_json,
      '"https://www.zeffy.com/en-US/organizations/my-project-usa"', '"/donate"'),
      '"https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa"', '"/donate"'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE instr(draft_json, '"https://www.zeffy.com/en-US/organizations/my-project-usa"') > 0
   OR instr(draft_json, '"https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa"') > 0
   OR instr(published_json, '"https://www.zeffy.com/en-US/organizations/my-project-usa"') > 0
   OR instr(published_json, '"https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa"') > 0;

UPDATE settings
SET value_json = replace(replace(value_json,
      '"https://www.zeffy.com/en-US/organizations/my-project-usa"', '"/donate"'),
      '"https://www.zeffy.com/en-US/donation-form/build-lasting-sustainability-with-my-project-usa"', '"/donate"'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'quickLinks';
