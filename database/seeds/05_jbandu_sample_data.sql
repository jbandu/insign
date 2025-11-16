-- Sample data for jbandu@gmail.com testing
-- This creates a complete test scenario with documents, signature requests, and participants

DO $$
DECLARE
  org_id_var uuid := '00000000-0000-0000-0000-000000000001';
  admin_role_id uuid;
  manager_role_id uuid;
  user_role_id uuid;
  admin_user_id uuid;
  user1_id uuid;
  user2_id uuid;
  user3_id uuid;
  folder_id uuid;
  doc1_id uuid;
  doc2_id uuid;
  request1_id uuid;
  request2_id uuid;
  participant1_id uuid;
  participant2_id uuid;
  participant3_id uuid;
  field1_id uuid;
  field2_id uuid;
BEGIN
  -- 1. Create Organization
  INSERT INTO organizations (id, name, domain, subscription_tier, status)
  VALUES (
    org_id_var,
    'Acme Corporation',
    'acme.insign.app',
    'business',
    'active'
  );

  -- 2. Create Roles
  INSERT INTO roles (id, org_id, name, description, is_system)
  VALUES
    (gen_random_uuid(), org_id_var, 'Admin', 'Full system access', false)
  RETURNING id INTO admin_role_id;

  INSERT INTO roles (id, org_id, name, description, is_system)
  VALUES
    (gen_random_uuid(), org_id_var, 'Manager', 'Department management access', false)
  RETURNING id INTO manager_role_id;

  INSERT INTO roles (id, org_id, name, description, is_system)
  VALUES
    (gen_random_uuid(), org_id_var, 'User', 'Standard user access', false)
  RETURNING id INTO user_role_id;

  -- 3. Create Users
  -- Admin user (jbandu@gmail.com) - password: Test123!
  INSERT INTO users (id, org_id, email, password, first_name, last_name, role_id, email_verified, status)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    'jbandu@gmail.com',
    '$2a$10$rN8KN0p9XcGZHJZnQqZ9X.YfKQqZqN9QqZqN9QqZqN9QqZqN9QqZq',
    'John',
    'Bandu',
    admin_role_id,
    NOW(),
    'active'
  )
  RETURNING id INTO admin_user_id;

  -- Additional team members
  INSERT INTO users (id, org_id, email, first_name, last_name, role_id, email_verified, status)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    'sarah.johnson@acme.com',
    'Sarah',
    'Johnson',
    manager_role_id,
    NOW(),
    'active'
  )
  RETURNING id INTO user1_id;

  INSERT INTO users (id, org_id, email, first_name, last_name, role_id, email_verified, status)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    'mike.chen@acme.com',
    'Mike',
    'Chen',
    user_role_id,
    NOW(),
    'active'
  )
  RETURNING id INTO user2_id;

  INSERT INTO users (id, org_id, email, first_name, last_name, role_id, email_verified, status)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    'emma.wilson@acme.com',
    'Emma',
    'Wilson',
    user_role_id,
    NOW(),
    'active'
  )
  RETURNING id INTO user3_id;

  -- 4. Create Storage Quota
  INSERT INTO storage_quotas (org_id, total_bytes, used_bytes)
  VALUES (org_id_var, 53687091200, 25165824);

  -- 5. Create Folder
  INSERT INTO folders (id, org_id, name, path, created_by)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    'Contracts',
    '/contracts',
    admin_user_id
  )
  RETURNING id INTO folder_id;

  -- 6. Create Documents
  INSERT INTO documents (id, org_id, folder_id, name, file_path, mime_type, size_bytes, created_by)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    folder_id,
    'Employment_Agreement_2024.pdf',
    'https://example.com/docs/employment-agreement.pdf',
    'application/pdf',
    524288,
    admin_user_id
  )
  RETURNING id INTO doc1_id;

  INSERT INTO documents (id, org_id, folder_id, name, file_path, mime_type, size_bytes, created_by)
  VALUES (
    gen_random_uuid(),
    org_id_var,
    folder_id,
    'NDA_Template.pdf',
    'https://example.com/docs/nda-template.pdf',
    'application/pdf',
    327680,
    admin_user_id
  )
  RETURNING id INTO doc2_id;

  -- 7. Create Signature Requests with SENT status
  INSERT INTO signature_requests (
    id, org_id, document_id, title, message, status, workflow_type, created_by, expires_at
  )
  VALUES (
    gen_random_uuid(),
    org_id_var,
    doc1_id,
    'Employment Agreement - Sign Required',
    'Please review and sign the employment agreement. If you have any questions, feel free to reach out.',
    'sent',  -- IMPORTANT: Must be 'sent' or 'in_progress' for signing to work
    'sequential',
    admin_user_id,
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO request1_id;

  INSERT INTO signature_requests (
    id, org_id, document_id, title, message, status, workflow_type, created_by, expires_at
  )
  VALUES (
    gen_random_uuid(),
    org_id_var,
    doc2_id,
    'NDA for Review',
    'This is a standard non-disclosure agreement. Please sign to proceed.',
    'sent',  -- IMPORTANT: Must be 'sent' or 'in_progress' for signing to work
    'parallel',
    admin_user_id,
    NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO request2_id;

  -- 8. Create Signature Participants
  INSERT INTO signature_participants (
    id, request_id, user_id, email, full_name, role, order_index, status, access_token
  )
  VALUES (
    gen_random_uuid(),
    request1_id,
    user1_id,
    'sarah.johnson@acme.com',
    'Sarah Johnson',
    'signer',
    1,
    'notified',
    'RSSgKf5ao9xjagD30PJtCcFRpzJRdvVZ'
  )
  RETURNING id INTO participant1_id;

  INSERT INTO signature_participants (
    id, request_id, user_id, email, full_name, role, order_index, status, access_token
  )
  VALUES (
    gen_random_uuid(),
    request1_id,
    user2_id,
    'mike.chen@acme.com',
    'Mike Chen',
    'signer',
    2,
    'pending',
    'XYZabc123def456ghi789jkl012mno34'
  )
  RETURNING id INTO participant2_id;

  -- Participant for the second request using jbandu@gmail.com
  INSERT INTO signature_participants (
    id, request_id, email, full_name, role, order_index, status, access_token
  )
  VALUES (
    gen_random_uuid(),
    request2_id,
    'jbandu@gmail.com',
    'John Bandu',
    'signer',
    1,
    'notified',
    'TestToken123ForJBandu456XYZ'
  )
  RETURNING id INTO participant3_id;

  -- 9. Create Signature Fields
  -- Fields for first participant
  INSERT INTO signature_fields (
    id, request_id, participant_id, type, page_number, x, y, width, height, required, label
  )
  VALUES (
    gen_random_uuid(),
    request1_id,
    participant1_id,
    'signature',
    1,
    100.0,
    500.0,
    200.0,
    50.0,
    true,
    'Employee Signature'
  )
  RETURNING id INTO field1_id;

  INSERT INTO signature_fields (
    id, request_id, participant_id, type, page_number, x, y, width, height, required, label
  )
  VALUES (
    gen_random_uuid(),
    request1_id,
    participant1_id,
    'date',
    1,
    320.0,
    500.0,
    100.0,
    30.0,
    true,
    'Date'
  );

  -- Fields for second participant
  INSERT INTO signature_fields (
    id, request_id, participant_id, type, page_number, x, y, width, height, required, label
  )
  VALUES (
    gen_random_uuid(),
    request1_id,
    participant2_id,
    'signature',
    1,
    100.0,
    600.0,
    200.0,
    50.0,
    true,
    'Manager Signature'
  );

  -- Fields for jbandu participant
  INSERT INTO signature_fields (
    id, request_id, participant_id, type, page_number, x, y, width, height, required, label
  )
  VALUES (
    gen_random_uuid(),
    request2_id,
    participant3_id,
    'signature',
    1,
    150.0,
    450.0,
    200.0,
    50.0,
    true,
    'Signer Signature'
  )
  RETURNING id INTO field2_id;

  INSERT INTO signature_fields (
    id, request_id, participant_id, type, page_number, x, y, width, height, required, label
  )
  VALUES (
    gen_random_uuid(),
    request2_id,
    participant3_id,
    'initials',
    1,
    370.0,
    450.0,
    80.0,
    40.0,
    true,
    'Initials'
  );

  -- 10. Create audit log entries
  INSERT INTO signature_audit_logs (request_id, participant_id, action, metadata, ip_address)
  VALUES (
    request1_id,
    participant1_id,
    'request_sent',
    '{"method": "email"}'::jsonb,
    '192.168.1.100'::inet
  );

  INSERT INTO signature_audit_logs (request_id, participant_id, action, metadata, ip_address)
  VALUES (
    request1_id,
    participant1_id,
    'document_viewed',
    '{"timestamp": "2024-01-15T10:30:00Z"}'::jsonb,
    '192.168.1.100'::inet
  );

  RAISE NOTICE 'Sample data created successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Organization: Acme Corporation (acme.insign.app)';
  RAISE NOTICE 'Admin User: jbandu@gmail.com (Password: Test123!)';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Signature URLs:';
  RAISE NOTICE '1. Sarah Johnson: /sign/RSSgKf5ao9xjagD30PJtCcFRpzJRdvVZ';
  RAISE NOTICE '2. Mike Chen: /sign/XYZabc123def456ghi789jkl012mno34';
  RAISE NOTICE '3. John Bandu: /sign/TestToken123ForJBandu456XYZ';
  RAISE NOTICE '========================================';
END $$;
