CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'creator',
    "status" TEXT NOT NULL DEFAULT 'active',
    "daily_quota" INTEGER NOT NULL DEFAULT 100,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "aspect_ratio" TEXT NOT NULL,
    "duration_target" TEXT NOT NULL,
    "style_preset" TEXT NOT NULL,
    "creation_mode" TEXT NOT NULL,
    "current_step" TEXT NOT NULL DEFAULT 'script',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "scripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "original_idea" TEXT NOT NULL DEFAULT '',
    "script_content" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT,
    "audio_url" TEXT,
    "metadata_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "assets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "storyboards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "shot_no" INTEGER NOT NULL,
    "scene_name" TEXT NOT NULL,
    "characters_json" JSONB NOT NULL,
    "visual_description" TEXT NOT NULL,
    "dialogue" TEXT NOT NULL DEFAULT '',
    "camera_movement" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "image_prompt" TEXT NOT NULL,
    "image_url" TEXT,
    "video_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "storyboards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "generation_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "generation_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "review_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "score" INTEGER NOT NULL,
    "risk_level" TEXT NOT NULL,
    "issues_json" JSONB NOT NULL,
    "suggestions_json" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "projects"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "scripts_project_id_key" ON "scripts"("project_id");
CREATE INDEX IF NOT EXISTS "assets_project_id_idx" ON "assets"("project_id");
CREATE INDEX IF NOT EXISTS "storyboards_project_id_idx" ON "storyboards"("project_id");
CREATE INDEX IF NOT EXISTS "generation_tasks_project_id_idx" ON "generation_tasks"("project_id");
CREATE INDEX IF NOT EXISTS "review_reports_project_id_idx" ON "review_reports"("project_id");
CREATE INDEX IF NOT EXISTS "exports_project_id_idx" ON "exports"("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invite_codes_code_hash_key" ON "invite_codes"("code_hash");
CREATE INDEX IF NOT EXISTS "invite_codes_status_idx" ON "invite_codes"("status");
CREATE INDEX IF NOT EXISTS "invite_codes_target_email_idx" ON "invite_codes"("target_email");
CREATE INDEX IF NOT EXISTS "invite_codes_created_by_id_idx" ON "invite_codes"("created_by_id");
CREATE INDEX IF NOT EXISTS "invite_codes_used_by_id_idx" ON "invite_codes"("used_by_id");
CREATE INDEX IF NOT EXISTS "invite_codes_created_at_idx" ON "invite_codes"("created_at");
