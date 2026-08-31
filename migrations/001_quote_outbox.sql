CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- migrate:split

CREATE TABLE IF NOT EXISTS quote_lead (
  environment varchar(32) NOT NULL,
  submission_id uuid NOT NULL,
  payload_fingerprint char(64) NOT NULL,
  name varchar(100) NOT NULL,
  phone varchar(30) NOT NULL,
  email varchar(160),
  suburb varchar(100) NOT NULL,
  vehicle varchar(160) NOT NULL,
  vehicle_condition varchar(1200),
  source_path varchar(300) NOT NULL,
  consent_version varchar(32) NOT NULL,
  consented_at timestamptz NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('accepted', 'sending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  last_attempt_at timestamptz,
  provider_message_id varchar(255),
  last_error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (environment, submission_id)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS quote_lead_due_idx
  ON quote_lead (environment, status, next_attempt_at, created_at);

-- migrate:split

CREATE INDEX IF NOT EXISTS quote_lead_expiry_idx ON quote_lead (expires_at);

-- migrate:split

CREATE TABLE IF NOT EXISTS quote_rate_bucket (
  environment varchar(32) NOT NULL,
  scope varchar(20) NOT NULL,
  subject_hash char(64) NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (environment, scope, subject_hash, window_start)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS quote_rate_bucket_expiry_idx ON quote_rate_bucket (expires_at);

-- migrate:split

CREATE TABLE IF NOT EXISTS quote_delivery_attempt (
  environment varchar(32) NOT NULL,
  submission_id uuid NOT NULL,
  attempt_no integer NOT NULL,
  outcome varchar(24) NOT NULL,
  provider_status integer,
  error_code varchar(80),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  PRIMARY KEY (environment, submission_id, attempt_no),
  FOREIGN KEY (environment, submission_id)
    REFERENCES quote_lead (environment, submission_id) ON DELETE CASCADE
);

-- migrate:split

CREATE OR REPLACE FUNCTION accept_quote_lead(
  p_environment text,
  p_submission_id uuid,
  p_payload_fingerprint text,
  p_name text,
  p_phone text,
  p_email text,
  p_suburb text,
  p_vehicle text,
  p_vehicle_condition text,
  p_source_path text,
  p_consent_version text,
  p_consented_at timestamptz,
  p_retention_until timestamptz,
  p_client_hash text,
  p_contact_hash text,
  p_global_hash text,
  p_window_start timestamptz,
  p_window_expires_at timestamptz,
  p_client_limit integer,
  p_contact_limit integer,
  p_global_limit integer
)
RETURNS TABLE (result_outcome text, result_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing_fingerprint text;
  v_existing_status text;
  v_client_count integer;
  v_contact_count integer;
  v_global_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_environment || ':' || p_submission_id::text, 0));

  SELECT lead.payload_fingerprint, lead.status
    INTO v_existing_fingerprint, v_existing_status
    FROM quote_lead AS lead
   WHERE lead.environment = p_environment
     AND lead.submission_id = p_submission_id;

  IF FOUND THEN
    IF v_existing_fingerprint <> p_payload_fingerprint THEN
      RETURN QUERY SELECT 'conflict'::text, v_existing_status;
    ELSE
      RETURN QUERY SELECT 'existing'::text, v_existing_status;
    END IF;
    RETURN;
  END IF;

  DELETE FROM quote_rate_bucket WHERE expires_at < now() - interval '1 day';

  INSERT INTO quote_rate_bucket AS bucket
    (environment, scope, subject_hash, window_start, request_count, expires_at)
  VALUES
    (p_environment, 'client', p_client_hash, p_window_start, 1, p_window_expires_at)
  ON CONFLICT (environment, scope, subject_hash, window_start)
  DO UPDATE SET
    request_count = bucket.request_count + 1,
    expires_at = GREATEST(bucket.expires_at, EXCLUDED.expires_at)
  RETURNING request_count INTO v_client_count;

  INSERT INTO quote_rate_bucket AS bucket
    (environment, scope, subject_hash, window_start, request_count, expires_at)
  VALUES
    (p_environment, 'contact', p_contact_hash, p_window_start, 1, p_window_expires_at)
  ON CONFLICT (environment, scope, subject_hash, window_start)
  DO UPDATE SET
    request_count = bucket.request_count + 1,
    expires_at = GREATEST(bucket.expires_at, EXCLUDED.expires_at)
  RETURNING request_count INTO v_contact_count;

  INSERT INTO quote_rate_bucket AS bucket
    (environment, scope, subject_hash, window_start, request_count, expires_at)
  VALUES
    (p_environment, 'global', p_global_hash, p_window_start, 1, p_window_expires_at)
  ON CONFLICT (environment, scope, subject_hash, window_start)
  DO UPDATE SET
    request_count = bucket.request_count + 1,
    expires_at = GREATEST(bucket.expires_at, EXCLUDED.expires_at)
  RETURNING request_count INTO v_global_count;

  IF v_client_count > p_client_limit THEN
    RAISE EXCEPTION 'quote_rate_limited:client' USING ERRCODE = 'P0001';
  END IF;
  IF v_contact_count > p_contact_limit THEN
    RAISE EXCEPTION 'quote_rate_limited:contact' USING ERRCODE = 'P0001';
  END IF;
  IF v_global_count > p_global_limit THEN
    RAISE EXCEPTION 'quote_rate_limited:global' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO quote_lead (
    environment,
    submission_id,
    payload_fingerprint,
    name,
    phone,
    email,
    suburb,
    vehicle,
    vehicle_condition,
    source_path,
    consent_version,
    consented_at,
    status,
    expires_at
  ) VALUES (
    p_environment,
    p_submission_id,
    p_payload_fingerprint,
    p_name,
    p_phone,
    NULLIF(p_email, ''),
    p_suburb,
    p_vehicle,
    NULLIF(p_vehicle_condition, ''),
    p_source_path,
    p_consent_version,
    p_consented_at,
    'accepted',
    p_retention_until
  );

  RETURN QUERY SELECT 'accepted'::text, 'accepted'::text;
END;
$$;
