-- A constraint is needed for the upsert operation to identify existing records correctly
ALTER TABLE public.business_customers
ADD CONSTRAINT business_customers_business_id_nit_key UNIQUE (business_id, nit);
