-- Seed data for database


-- Upsert default owner
INSERT INTO owners (login, name, type, avatar_url, html_url)
VALUES (
  'gwizinc',
  'GWiZ Inc',
  'organization',
  NULL,
  'https://github.com/gwizinc'
)
ON CONFLICT (login)
DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  avatar_url = EXCLUDED.avatar_url,
  html_url = EXCLUDED.html_url,
  updated_at = now();


-- Upsert default repo for the owner above
INSERT INTO repos (
  owner_id,
  name,
  full_name,
  private,
  description,
  default_branch,
  html_url
)
VALUES (
  (SELECT id FROM owners WHERE login = 'gwizinc'),
  'tailz',
  'gwizinc/tailz',
  false,
  'Tailz monorepo scaffold',
  'main',
  'https://github.com/gwizinc/tailz'
)
ON CONFLICT (owner_id, name)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  private = EXCLUDED.private,
  description = EXCLUDED.description,
  default_branch = EXCLUDED.default_branch,
  html_url = EXCLUDED.html_url,
  updated_at = now();

