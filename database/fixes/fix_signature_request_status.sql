-- Fix signature request statuses
-- This updates any signature requests with 'draft' status to 'sent'
-- so they can be accessed via the /sign/[token] URL

-- Update signature requests from 'draft' to 'sent'
UPDATE signature_requests
SET
  status = 'sent',
  updated_at = NOW()
WHERE status = 'draft' OR status IS NULL;

-- Also update participant status to 'notified' if they are still 'pending'
UPDATE signature_participants
SET status = 'notified'
WHERE status = 'pending'
  AND request_id IN (
    SELECT id FROM signature_requests WHERE status IN ('sent', 'in_progress')
  );

-- Display the updated requests
SELECT
  sr.id,
  sr.title,
  sr.status as request_status,
  sp.email,
  sp.full_name,
  sp.status as participant_status,
  sp.access_token,
  CONCAT('/sign/', sp.access_token) as signing_url
FROM signature_requests sr
JOIN signature_participants sp ON sr.id = sp.request_id
WHERE sr.status IN ('sent', 'in_progress')
ORDER BY sr.created_at DESC;
