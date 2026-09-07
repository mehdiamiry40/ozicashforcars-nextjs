ALTER TABLE quote_lead ADD COLUMN IF NOT EXISTS expected_price varchar(12);

-- migrate:split

DROP FUNCTION IF EXISTS accept_quote_lead(
  text, uuid, text, text, text, text, text, text, text, text, text,
  timestamptz, timestamptz, text, text, text, timestamptz, timestamptz,
  integer, integer, integer
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
  p_expected_price text,
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

  DELETE FROM quote_rate_bucket
   WHERE environment = p_environment
     AND expires_at < now() - interval '1 day';

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
    expected_price,
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
    NULLIF(p_expected_price, ''),
    p_source_path,
    p_consent_version,
    p_consented_at,
    'accepted',
    p_retention_until
  );

  RETURN QUERY SELECT 'accepted'::text, 'accepted'::text;
END;
$$;
