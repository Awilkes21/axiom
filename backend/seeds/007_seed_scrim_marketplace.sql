-- Seed scrim marketplace posts and applications.
INSERT INTO scrim_posts (host_team_id, title_id, starts_at, ends_at, notes, status, created_by_account_id)
SELECT
    (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
    (SELECT title_id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1),
    TIMESTAMP '2026-03-10 19:00:00',
    TIMESTAMP '2026-03-10 21:00:00',
    'Looking for BO3 with server host.',
    'open',
    (SELECT id FROM accounts WHERE email = 'manager1@example.com')
WHERE NOT EXISTS (
    SELECT 1
    FROM scrim_posts sp
    WHERE sp.host_team_id = (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1)
      AND sp.starts_at = TIMESTAMP '2026-03-10 19:00:00'
);

INSERT INTO scrim_applications (scrim_post_id, requesting_team_id, requested_by_account_id, message, status)
SELECT
    sp.id,
    (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1),
    (SELECT id FROM accounts WHERE email = 'coach1@example.com'),
    'We can play that slot.',
    'pending'
FROM scrim_posts sp
WHERE sp.host_team_id = (SELECT id FROM teams WHERE name = 'Team Bravo' ORDER BY id LIMIT 1)
  AND sp.starts_at = TIMESTAMP '2026-03-10 19:00:00'
  AND NOT EXISTS (
    SELECT 1
    FROM scrim_applications sa
    WHERE sa.scrim_post_id = sp.id
      AND sa.requesting_team_id = (SELECT id FROM teams WHERE name = 'Team Alpha' ORDER BY id LIMIT 1)
  );
