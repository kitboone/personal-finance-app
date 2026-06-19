-- Add an optional free-text remark to each retirement asset (max 50 chars),
-- e.g. "OCBC endowment, matures 2031". Existing rows default to an empty
-- string. The length cap is enforced in the app (validation) and here as a
-- backstop CHECK, mirroring the rest of the schema.

ALTER TABLE retirement_assets
  ADD COLUMN remarks TEXT NOT NULL DEFAULT '' CHECK (length(remarks) <= 50);
