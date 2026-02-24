-- Migration to add custom date format settings to collection_config

ALTER TABLE public.collection_config
ADD COLUMN IF NOT EXISTS input_date_format VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS output_date_format VARCHAR(50) DEFAULT 'DD-MM-AAAA';

COMMENT ON COLUMN public.collection_config.input_date_format IS 'Optional date format used to parse dates during invoice importing. If null, multiple formats are attempted.';
COMMENT ON COLUMN public.collection_config.output_date_format IS 'Preferred date format used to consistently display and process dates (e.g., DD-MM-AAAA)';
