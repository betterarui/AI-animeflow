CREATE TABLE IF NOT EXISTS "invite_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code_hash" TEXT NOT NULL,
    "code_value" TEXT,
    "code_prefix" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "target_email" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_id" TEXT NOT NULL,
    "used_by_id" TEXT,
    "used_email" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invite_codes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invite_codes_used_by_id_fkey" FOREIGN KEY ("used_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_code_hash_key" ON "invite_codes"("code_hash");
CREATE INDEX IF NOT EXISTS "invite_codes_status_idx" ON "invite_codes"("status");
CREATE INDEX IF NOT EXISTS "invite_codes_target_email_idx" ON "invite_codes"("target_email");
CREATE INDEX IF NOT EXISTS "invite_codes_created_by_id_idx" ON "invite_codes"("created_by_id");
CREATE INDEX IF NOT EXISTS "invite_codes_used_by_id_idx" ON "invite_codes"("used_by_id");
CREATE INDEX IF NOT EXISTS "invite_codes_created_at_idx" ON "invite_codes"("created_at");
