CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "token" varchar(256) PRIMARY KEY,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp NULL
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");

-- keep updated_at current on updates
CREATE OR REPLACE FUNCTION set_refresh_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_tokens_set_updated_at ON "refresh_tokens";
CREATE TRIGGER refresh_tokens_set_updated_at
BEFORE UPDATE ON "refresh_tokens"
FOR EACH ROW EXECUTE FUNCTION set_refresh_tokens_updated_at();

