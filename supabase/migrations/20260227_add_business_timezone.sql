-- Migration: Add timezone column to businesses table
-- Description: Adds a timezone column with America/Bogota as default.

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Bogota' NOT NULL;

-- Keep a record of the migration if there is a migrations log table (optional but good practice)
-- Assuming the system manages this via file names in the migrations folder.
