# Database Schema Documentation

## Overview

**Database:** PostgreSQL (Supabase)  
**Project:** Apex Portfolio - Collection System  
**Generated:** February 2026  
**Last Validated:** February 26, 2026  

## Table of Contents

1. [Core Business Tables](#1-core-business-tables)
2. [Collection System Tables](#2-collection-system-tables)
3. [Email Reputation & Batching Tables](#3-email-reputation--batching-tables)
4. [Subscription & Billing Tables](#4-subscription--billing-tables)
5. [Notification & Feedback Tables](#5-notification--feedback-tables)
6. [System Configuration Tables](#6-system-configuration-tables)
7. [Custom Types (Enums)](#7-custom-types-enums)
8. [Database Functions & RPC](#8-database-functions--rpc)
9. [Triggers](#9-triggers)
10. [Views](#10-views)
11. [RLS Policies](#11-rls-policies)
12. [Relationships Diagram](#12-relationships-diagram)
13. [Discrepancias Encontradas](#13-discrepancias-encontradas-feb-2026)

---

## 1. Core Business Tables

### business_accounts

**Purpose:** Main tenant/account entity for organizations  
**Multi-tenant:** Yes (RLS by business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| company_name | VARCHAR(255) | NO | - | Company display name |
| tax_id | VARCHAR(50) | YES | NULL | NIT/RUT (Colombia tax ID) |
| legal_name | VARCHAR(255) | YES | NULL | Legal company name |
| billing_address | TEXT | YES | NULL | Billing street address |
| billing_city | VARCHAR(100) | YES | NULL | Billing city |
| billing_state | VARCHAR(100) | YES | NULL | Billing state/province |
| billing_postal_code | VARCHAR(20) | YES | NULL | Postal/ZIP code |
| billing_country | VARCHAR(2) | NO | 'CO' | ISO 3166-1 alpha-2 country code |
| contact_name | VARCHAR(255) | NO | - | Primary contact name |
| contact_email | VARCHAR(255) | NO | - | Primary contact email |
| contact_phone | VARCHAR(50) | YES | NULL | Contact phone number |
| subscription_plan | VARCHAR(50) | YES | 'trial' | Plan type: trial/free/basic/pro/enterprise |
| status | VARCHAR(50) | NO | 'trial' | Account status: active/suspended/cancelled/trial |
| trial_ends_at | TIMESTAMPTZ | YES | NULL | Trial expiration date |
| subscription_started_at | TIMESTAMPTZ | YES | NULL | When subscription began |
| subscription_expires_at | TIMESTAMPTZ | YES | NULL | When subscription ends |
| last_payment_at | TIMESTAMPTZ | YES | NULL | Last successful payment timestamp |
| payment_status | VARCHAR(50) | YES | 'none' | Payment status: none/active/pending/failed/cancelled/paused |
| plan_id | UUID | YES | NULL | FK → plans.id |
| billing_cycle | VARCHAR(50) | YES | NULL | monthly/yearly |
| mp_subscription_id | VARCHAR(255) | YES | NULL | MercadoPago subscription ID |
| mp_customer_id | VARCHAR(255) | YES | NULL | MercadoPago customer ID |
| payment_method_last4 | VARCHAR(4) | YES | NULL | Last 4 digits of card |
| payment_method_brand | VARCHAR(50) | YES | NULL | Card brand (visa/mastercard/etc) |
| custom_trial_days | INTEGER | YES | NULL | Custom trial period length |
| tutorial_started | BOOLEAN | NO | FALSE | Whether user started tutorial |
| tenant_name | TEXT | YES | NULL | Subdomain/tenant identifier |
| settings | JSONB | YES | NULL | Custom configuration JSON |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (tenant_name)

---

### businesses

**Purpose:** Individual business locations/subsidiaries under an account  
**Multi-tenant:** Yes (RLS by business_account_id → businesses)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| name | VARCHAR(255) | NO | - | Business location name |
| description | TEXT | YES | NULL | Business description |
| type | business_type | YES | NULL | Type: headquarters/branch/office/warehouse |
| address | TEXT | YES | NULL | Street address |
| city | VARCHAR(100) | YES | NULL | City |
| state | VARCHAR(100) | YES | NULL | State/province |
| phone_number | VARCHAR(50) | YES | NULL | Phone number |
| timezone | VARCHAR(100) | NO | 'America/Bogota' | Business local timezone |
| logo_url | TEXT | YES | NULL | Logo image URL |
| location | JSONB | YES | NULL | Geographic coordinates {lat, lng} |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)

---

### business_customers

**Purpose:** Customer entities associated with businesses  
**Multi-tenant:** Yes (RLS by business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| company_name | VARCHAR(255) | YES | NULL | Company name if B2B |
| nit | VARCHAR(50) | NO | - | Tax identification number |
| full_name | VARCHAR(255) | NO | - | Customer full name |
| emails | TEXT[] | NO | '{}' | Email addresses (one or more) |
| phone | VARCHAR(50) | YES | NULL | Phone number |
| status | VARCHAR(50) | NO | 'active' | active/inactive/vip/blocked |
| category | UUID | YES | NULL | FK → customer_categories.id |
| notes | TEXT | YES | NULL | Internal notes |
| preferences | TEXT | YES | NULL | Customer preferences |
| tags | TEXT[] | YES | NULL | Array of tag strings |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NO | NOW() | Last update timestamp |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_id)
- INDEX (nit)
- UNIQUE (business_id, nit)

---

### customer_categories

**Purpose:** Categorization of customers  
**Multi-tenant:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| name | VARCHAR(255) | NO | - | Category name |
| description | TEXT | YES | NULL | Category description |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

---

## 2. Collection System Tables

### collection_executions

**Purpose:** Email collection campaigns/executions  
**Multi-tenant:** Yes (RLS by business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| created_by | UUID | NO | - | User who created execution |
| name | VARCHAR(255) | NO | - | Execution name |
| description | TEXT | YES | NULL | Description |
| status | VARCHAR(50) | NO | 'pending' | pending/processing/completed/failed/paused |
| execution_mode | TEXT | NO | 'immediate' | immediate/scheduled |
| scheduled_at | TIMESTAMPTZ | YES | NULL | When to execute (if scheduled) |
| eventbridge_rule_name | TEXT | YES | NULL | AWS EventBridge rule name |
| email_template_id | UUID | YES | NULL | FK → collection_templates.id |
| sms_template_id | UUID | YES | NULL | FK → collection_templates.id |
| attachment_ids | UUID[] | NO | '{}' | Array of attachment IDs |
| fallback_enabled | BOOLEAN | NO | FALSE | Enable SMS/WhatsApp fallback |
| fallback_days | INTEGER | NO | 3 | Days before fallback |
| total_clients | INTEGER | NO | 0 | Total clients in execution |
| emails_sent | INTEGER | NO | 0 | Emails sent count |
| emails_delivered | INTEGER | NO | 0 | Emails delivered count |
| emails_opened | INTEGER | NO | 0 | Emails opened count |
| emails_bounced | INTEGER | NO | 0 | Emails bounced count |
| fallback_sent | INTEGER | NO | 0 | Fallback messages sent |
| open_rate | NUMERIC(5,2) | NO | 0.00 | Calculated open rate % |
| bounce_rate | NUMERIC(5,2) | NO | 0.00 | Calculated bounce rate % |
| delivery_rate | NUMERIC(5,2) | NO | 0.00 | Calculated delivery rate % |
| sqs_queue_url | TEXT | YES | NULL | AWS SQS queue URL |
| lambda_execution_arn | TEXT | YES | NULL | Lambda execution ARN |
| started_at | TIMESTAMPTZ | YES | NULL | When execution started |
| completed_at | TIMESTAMPTZ | YES | NULL | When execution completed |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_id)
- INDEX (status)
- INDEX (created_at)

---

### collection_clients

**Purpose:** Individual clients within a collection execution  
**Multi-tenant:** Yes (cascade from collection_executions)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| execution_id | UUID | NO | - | FK → collection_executions.id |
| customer_id | UUID | YES | NULL | FK → business_customers.id |
| invoices | JSONB | YES | NULL | Invoice data array |
| custom_data | JSONB | NO | '{}' | Custom variables for templates |
| status | VARCHAR(50) | NO | 'pending' | pending/queued/sent/delivered/opened/bounced/failed |
| email_template_id | UUID | YES | NULL | FK → collection_templates.id |
| threshold_id | UUID | YES | NULL | FK → notification_thresholds.id |
| email_sent_at | TIMESTAMPTZ | YES | NULL | When email was sent |
| email_delivered_at | TIMESTAMPTZ | YES | NULL | When email was delivered |
| email_opened_at | TIMESTAMPTZ | YES | NULL | When email was opened |
| email_bounce_type | VARCHAR(50) | YES | NULL | hard/soft/complaint |
| email_bounce_reason | TEXT | YES | NULL | Bounce reason description |
| fallback_required | BOOLEAN | NO | FALSE | Whether fallback is needed |
| fallback_sent_at | TIMESTAMPTZ | YES | NULL | When fallback was sent |
| fallback_type | VARCHAR(50) | YES | NULL | sms/whatsapp |
| fallback_status | VARCHAR(50) | YES | NULL | Fallback delivery status |
| ses_message_id | VARCHAR(255) | YES | NULL | AWS SES message ID |
| error_message | TEXT | YES | NULL | Error details if failed |
| retry_count | INTEGER | NO | 0 | Number of retry attempts |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (execution_id)
- INDEX (customer_id)
- INDEX (status)
- INDEX (ses_message_id)

---

### collection_templates

**Purpose:** Email/SMS/WhatsApp templates for collections  
**Multi-tenant:** Yes (business_account_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| name | VARCHAR(255) | NO | - | Template name |
| description | TEXT | YES | NULL | Template description |
| template_type | VARCHAR(50) | NO | 'email' | email/sms/whatsapp |
| subject | VARCHAR(500) | YES | NULL | Email subject line |
| content_html | TEXT | YES | NULL | HTML email body |
| content_plain | TEXT | NO | - | Plain text content |
| available_variables | JSONB | NO | '{}' | Available template variables |
| is_active | BOOLEAN | NO | TRUE | Whether template is active |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)
- INDEX (template_type)

---

### collection_attachments

**Purpose:** Documents/attachments for collection emails  
**Multi-tenant:** Yes

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| name | VARCHAR(255) | NO | - | Attachment name |
| description | TEXT | YES | NULL | Description |
| file_type | VARCHAR(50) | YES | NULL | MIME type |
| file_size_bytes | BIGINT | YES | NULL | File size in bytes |
| storage_path | TEXT | NO | - | Storage path in bucket |
| storage_bucket | VARCHAR(255) | NO | 'attachments' | Storage bucket name |
| document_type | VARCHAR(50) | YES | 'generic' | Document category |
| is_active | BOOLEAN | NO | TRUE | Whether active |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)

---

### collection_config

**Purpose:** Business-specific collection configuration  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id (UNIQUE) |
| email_from_address | VARCHAR(255) | NO | - | From email address |
| email_from_name | VARCHAR(255) | NO | - | From display name |
| email_reply_to | VARCHAR(255) | YES | NULL | Reply-to address |
| ses_configuration_set | VARCHAR(255) | YES | NULL | AWS SES config set |
| ses_region | VARCHAR(50) | NO | 'us-east-1' | AWS SES region |
| input_date_format | VARCHAR(50) | NO | - | Date format for parsing |
| output_date_format | VARCHAR(50) | NO | 'DD-MM-AAAA' | Date format for display |
| fallback_enabled | BOOLEAN | NO | FALSE | Enable fallback channels |
| fallback_default_days | INTEGER | NO | 3 | Days before fallback |
| sms_from_number | VARCHAR(50) | YES | NULL | SMS sender number |
| whatsapp_enabled | BOOLEAN | NO | FALSE | Enable WhatsApp |
| alert_on_high_bounce | BOOLEAN | NO | TRUE | Alert when bounce rate high |
| bounce_threshold_percent | NUMERIC(5,2) | NO | 10.00 | Bounce rate threshold |
| alert_recipients | TEXT[] | NO | '{}' | Alert email addresses |
| max_emails_per_execution | INTEGER | NO | 10000 | Max emails per campaign |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (business_id)

---

### collection_events

**Purpose:** Audit log of collection system events  
**Multi-tenant:** Cascade from collection_executions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| execution_id | UUID | NO | - | FK → collection_executions.id |
| client_id | UUID | YES | NULL | FK → collection_clients.id |
| event_type | VARCHAR(50) | NO | - | Type of event |
| event_status | VARCHAR(50) | NO | 'success' | success/error/pending |
| event_data | JSONB | NO | '{}' | Event payload |
| error_details | TEXT | YES | NULL | Error information |
| aws_request_id | VARCHAR(255) | YES | NULL | AWS Lambda request ID |
| lambda_function_name | VARCHAR(255) | YES | NULL | Lambda function name |
| timestamp | TIMESTAMPTZ | NO | NOW() | Event timestamp |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (execution_id)
- INDEX (client_id)
- INDEX (timestamp)

---

## 3. Email Reputation & Batching Tables

### email_reputation_profiles

**Purpose:** Per-domain email reputation tracking for SES  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| domain | VARCHAR(255) | NO | - | Email domain (e.g., bore.sas) |
| sending_ip | VARCHAR(45) | YES | NULL | Dedicated SES IP |
| is_warmed_up | BOOLEAN | NO | FALSE | Whether domain is warmed up |
| warmup_start_date | TIMESTAMPTZ | YES | NULL | When warm-up started |
| warmup_completed_date | TIMESTAMPTZ | YES | NULL | When warm-up completed |
| current_warmup_day | INTEGER | NO | 0 | Current day in warm-up process |
| total_emails_sent | INTEGER | NO | 0 | Historical total sent |
| total_emails_delivered | INTEGER | NO | 0 | Historical total delivered |
| total_emails_opened | INTEGER | NO | 0 | Historical total opened |
| total_emails_bounced | INTEGER | NO | 0 | Historical total bounced |
| total_complaints | INTEGER | NO | 0 | Historical total complaints |
| delivery_rate | NUMERIC(5,2) | NO | 0.00 | Calculated delivery rate |
| open_rate | NUMERIC(5,2) | NO | 0.00 | Calculated open rate |
| bounce_rate | NUMERIC(5,2) | NO | 0.00 | Calculated bounce rate |
| complaint_rate | NUMERIC(5,2) | NO | 0.00 | Calculated complaint rate |
| daily_sending_limit | INTEGER | NO | 50 | Current daily limit |
| max_sending_limit | INTEGER | NO | 200 | Maximum daily limit |
| current_strategy | VARCHAR(20) | NO | 'ramp_up' | ramp_up/batch/conservative |
| is_under_review | BOOLEAN | NO | FALSE | Under AWS review |
| has_reputation_issues | BOOLEAN | NO | FALSE | Has reputation problems |
| last_issue_date | TIMESTAMPTZ | YES | NULL | Last issue timestamp |
| required_open_rate | NUMERIC(5,2) | NO | 20.00 | Required open rate % |
| required_delivery_rate | NUMERIC(5,2) | NO | 95.00 | Required delivery rate % |
| provider | VARCHAR(50) | YES | NULL | Email provider: 'brevo', 'ses', etc |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (business_id, domain)
- INDEX (business_id)
- INDEX (domain)
- INDEX (is_warmed_up)

**Comment:** Perfiles de reputación de dominios para gestión de deliverability con SES. Métricas ACUMULADAS históricas de TODOS los envíos del dominio.

---

### delivery_strategies

**Purpose:** Email delivery strategy configurations  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | YES | NULL | FK → businesses.id |
| name | VARCHAR(100) | NO | - | Strategy name |
| description | TEXT | YES | NULL | Description |
| strategy_type | VARCHAR(20) | NO | - | ramp_up/batch/conservative/aggressive |
| is_default | BOOLEAN | NO | FALSE | Is default strategy |
| is_active | BOOLEAN | NO | TRUE | Is active |
| rampup_day_1_limit | INTEGER | NO | 50 | Day 1: 50 emails |
| rampup_day_2_limit | INTEGER | NO | 100 | Day 2: 100 emails |
| rampup_day_3_5_limit | INTEGER | NO | 150 | Days 3-5: 150 emails |
| rampup_day_6_plus_limit | INTEGER | NO | 200 | Day 6+: 200 emails |
| batch_size | INTEGER | NO | 100 | Emails per batch |
| batch_interval_minutes | INTEGER | NO | 60 | Minutes between batches |
| max_batches_per_day | INTEGER | NO | 50 | Max batches daily |
| concurrent_batches | INTEGER | NO | 1 | Simultaneous batches |
| min_open_rate_threshold | NUMERIC(5,2) | NO | 20.00 | Min open rate % required |
| min_delivery_rate_threshold | NUMERIC(5,2) | NO | 95.00 | Min delivery rate % required |
| max_bounce_rate_threshold | NUMERIC(5,2) | NO | 5.00 | Max bounce rate % allowed |
| max_complaint_rate_threshold | NUMERIC(5,2) | NO | 0.10 | Max complaint rate % allowed |
| pause_on_high_bounce | BOOLEAN | NO | TRUE | Pause if bounce > threshold |
| pause_on_complaint | BOOLEAN | NO | TRUE | Pause on complaint |
| auto_resume_after_minutes | INTEGER | NO | 360 | Auto-resume after N minutes |
| max_retry_attempts | INTEGER | NO | 3 | Max retry attempts |
| retry_interval_minutes | INTEGER | NO | 30 | Minutes between retries |
| respect_timezone | BOOLEAN | NO | TRUE | Respect recipient timezone |
| preferred_send_hour_start | INTEGER | NO | 9 | Optimal send start hour |
| preferred_send_hour_end | INTEGER | NO | 17 | Optimal send end hour |
| avoid_weekends | BOOLEAN | NO | TRUE | Avoid weekend sends |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |
| created_by | UUID | YES | NULL | FK → auth.users.id |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_id)
- INDEX (strategy_type)
- INDEX (is_active)
- UNIQUE (business_id) WHERE is_default = TRUE

---

### execution_batches

**Purpose:** Batched groups of clients for rate-limited sending  
**Multi-tenant:** Cascade from collection_executions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| execution_id | UUID | NO | - | FK → collection_executions.id |
| strategy_id | UUID | YES | NULL | FK → delivery_strategies.id |
| batch_number | INTEGER | NO | - | Sequential batch number |
| batch_name | VARCHAR(255) | YES | NULL | Batch display name |
| status | VARCHAR(20) | NO | 'pending' | pending/queued/processing/completed/failed/paused |
| total_clients | INTEGER | NO | - | Clients in this batch |
| client_ids | UUID[] | NO | - | Array of client IDs |
| scheduled_for | TIMESTAMPTZ | YES | NULL | When to process |
| processed_at | TIMESTAMPTZ | YES | NULL | When processing started |
| completed_at | TIMESTAMPTZ | YES | NULL | When completed |
| emails_sent | INTEGER | NO | 0 | Emails sent in batch |
| emails_delivered | INTEGER | NO | 0 | Emails delivered |
| emails_opened | INTEGER | NO | 0 | Emails opened |
| emails_bounced | INTEGER | NO | 0 | Emails bounced |
| emails_failed | INTEGER | NO | 0 | Emails failed |
| sqs_message_id | VARCHAR(255) | YES | NULL | AWS SQS message ID |
| sqs_receipt_handle | TEXT | YES | NULL | SQS receipt handle |
| error_message | TEXT | YES | NULL | Error details |
| retry_count | INTEGER | NO | 0 | Retry attempts |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (execution_id, batch_number)
- INDEX (execution_id)
- INDEX (status)
- INDEX (scheduled_for)
- INDEX (strategy_id)

---

### email_blacklist

**Purpose:** Stores emails that have bounced to prevent future sends and allow user management  
**Multi-tenant:** Yes (RLS by business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| email | VARCHAR(255) | NO | - | Blacklisted email address |
| bounce_type | VARCHAR(50) | YES | NULL | Type: 'hard', 'soft', 'complaint' |
| bounce_reason | TEXT | YES | NULL | Detailed reason from bounce event |
| source_customer_id | UUID | YES | NULL | FK → business_customers.id |
| source_execution_id | UUID | YES | NULL | FK → collection_executions.id |
| source_client_id | UUID | YES | NULL | FK → collection_clients.id |
| provider | VARCHAR(50) | YES | 'brevo' | Email provider: 'brevo', 'ses', etc. |
| bounced_at | TIMESTAMPTZ | YES | NOW() | When the bounce occurred |
| created_at | TIMESTAMPTZ | YES | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | YES | NOW() | Last update timestamp |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (business_id, email)
- INDEX (business_id)
- INDEX (email)
- INDEX (bounce_type)
- INDEX (bounced_at DESC)

**RLS Policies:**

```sql
-- View own blacklist
FOR SELECT USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)

-- Manage own blacklist
FOR ALL USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)
```

**Functions:**

- `add_to_blacklist(p_business_id, p_email, ...)` - Idempotent insert/update
- `is_email_blacklisted(p_business_id, p_email)` - Check if email is blacklisted
- `filter_blacklisted_emails(p_business_id, p_emails[])` - Filter array for blacklisted emails

---

### daily_sending_limits

**Purpose:** Daily sending quotas per domain for ramp-up control  
**Multi-tenant:** Cascade from email_reputation_profiles

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| reputation_profile_id | UUID | NO | - | FK → email_reputation_profiles.id |
| date | DATE | NO | - | Date (YYYY-MM-DD) |
| daily_limit | INTEGER | NO | - | Max allowed for this day |
| emails_sent | INTEGER | NO | 0 | Emails sent today |
| emails_delivered | INTEGER | NO | 0 | Emails delivered today |
| emails_opened | INTEGER | NO | 0 | Emails opened today |
| emails_bounced | INTEGER | NO | 0 | Emails bounced today |
| limit_reached | BOOLEAN | NO | FALSE | Whether limit hit |
| paused_until | TIMESTAMPTZ | YES | NULL | Paused until timestamp |
| pause_reason | VARCHAR(50) | YES | NULL | high_bounce/complaint/manual |
| day_open_rate | NUMERIC(5,2) | YES | NULL | Today's open rate |
| day_delivery_rate | NUMERIC(5,2) | YES | NULL | Today's delivery rate |
| day_bounce_rate | NUMERIC(5,2) | YES | NULL | Today's bounce rate |
| can_progress_to_next_day | BOOLEAN | NO | FALSE | Can increase limit tomorrow |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (reputation_profile_id, date)
- INDEX (reputation_profile_id)
- INDEX (date)
- INDEX (limit_reached)

---

### warmup_progression_rules

**Purpose:** Rules for day-by-day ramp-up progression  
**Multi-tenant:** Cascade from delivery_strategies

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| strategy_id | UUID | NO | - | FK → delivery_strategies.id |
| day_number | INTEGER | NO | - | Day in strategy (1,2,3...) |
| daily_limit | INTEGER | NO | - | Email limit for this day |
| required_min_opens | INTEGER | YES | NULL | Minimum opens required |
| required_open_rate | NUMERIC(5,2) | YES | NULL | Required open rate % |
| required_delivery_rate | NUMERIC(5,2) | YES | NULL | Required delivery rate % |
| max_bounce_rate | NUMERIC(5,2) | YES | NULL | Max bounce rate allowed |
| min_duration_hours | INTEGER | NO | 24 | Min hours at this level |
| is_final_day | BOOLEAN | NO | FALSE | Is final warm-up day |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (strategy_id, day_number)
- INDEX (strategy_id)

---

### batch_queue_messages

**Purpose:** SQS message tracking for batch processing  
**Multi-tenant:** Cascade from execution_batches

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| batch_id | UUID | NO | - | FK → execution_batches.id |
| sqs_queue_url | TEXT | NO | - | SQS queue URL |
| sqs_message_id | VARCHAR(255) | NO | - | SQS message ID |
| sqs_receipt_handle | TEXT | YES | NULL | SQS receipt handle |
| status | VARCHAR(20) | NO | 'queued' | queued/in_flight/processed/failed/dlq |
| payload | JSONB | YES | NULL | Message payload backup |
| sent_at | TIMESTAMPTZ | NO | NOW() | When sent to SQS |
| received_at | TIMESTAMPTZ | YES | NULL | When Lambda received |
| processed_at | TIMESTAMPTZ | YES | NULL | When Lambda finished |
| visible_at | TIMESTAMPTZ | YES | NULL | Visibility timeout |
| receive_count | INTEGER | NO | 0 | Times received |
| max_receives | INTEGER | NO | 3 | Max receives before DLQ |
| error_message | TEXT | YES | NULL | Last error |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (sqs_message_id, sqs_queue_url)
- INDEX (batch_id)
- INDEX (status)
- INDEX (sqs_message_id)
- INDEX (visible_at) WHERE status = 'in_flight'

---

### scheduler_locks

**Purpose:** Distributed locking for email scheduler  
**Multi-tenant:** Service role only

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | TEXT | NO | 'email_scheduler_lock' | Primary Key (single row) |
| locked_by | TEXT | NO | - | Worker ID holding lock |
| locked_at | TIMESTAMPTZ | NO | NOW() | When lock acquired |
| expires_at | TIMESTAMPTZ | YES | NULL | When lock expires |

**Constraints:**

- CHECK (id = 'email_scheduler_lock') - Ensures single row

---

### execution_audit_logs

**Purpose:** Control tower audit trail  
**Multi-tenant:** Service role access

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary Key |
| execution_id | UUID | NO | - | FK → collection_executions.id |
| batch_id | UUID | YES | NULL | Related batch ID |
| event | execution_event_type | NO | - | Event type enum |
| worker_id | TEXT | YES | NULL | Worker identifier |
| details | JSONB | NO | '{}' | Event details |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (execution_id)
- INDEX (created_at DESC)

---

## 4. Subscription & Billing Tables

### plans

**Purpose:** Subscription plans available  
**Multi-tenant:** No (global table)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| code | VARCHAR(50) | NO | - | Unique plan code |
| name | VARCHAR(255) | NO | - | Plan display name |
| description | TEXT | YES | NULL | Plan description |
| price_cents | INTEGER | NO | - | Base price in cents |
| billing_period | VARCHAR(20) | NO | - | monthly/yearly/lifetime |
| status | VARCHAR(20) | NO | 'active' | active/inactive/deprecated |
| max_businesses | INTEGER | NO | 1 | Max businesses allowed |
| max_users_per_business | INTEGER | NO | 5 | Max users per business |
| max_specialists_per_business | INTEGER | NO | 10 | Max specialists |
| features | JSONB | NO | '{}' | Plan features JSON |
| sort_order | INTEGER | NO | 0 | Display order |
| monthly_price_cents | INTEGER | NO | 0 | Monthly price |
| yearly_price_cents | INTEGER | NO | 0 | Yearly price |
| yearly_discount_percent | INTEGER | NO | 0 | Yearly discount % |
| mp_plan_monthly_id | VARCHAR(255) | YES | NULL | MercadoPago monthly plan ID |
| mp_plan_yearly_id | VARCHAR(255) | YES | NULL | MercadoPago yearly plan ID |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (code)

---

### plan_modules

**Purpose:** Available modules/features  
**Multi-tenant:** No (global table)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| code | VARCHAR(50) | NO | - | Module code |
| name | VARCHAR(255) | NO | - | Module name |
| description | TEXT | YES | NULL | Module description |
| icon_key | VARCHAR(50) | YES | NULL | Icon identifier |
| is_active | BOOLEAN | NO | TRUE | Is module active |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (code)

---

### plan_module_access

**Purpose:** Permissions per plan per module  
**Multi-tenant:** No

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| plan_id | UUID | NO | - | FK → plans.id |
| module_id | UUID | NO | - | FK → plan_modules.id |
| can_read | BOOLEAN | NO | TRUE | Read permission |
| can_write | BOOLEAN | NO | FALSE | Write permission |
| can_delete | BOOLEAN | NO | FALSE | Delete permission |
| custom_permissions | JSONB | YES | NULL | Custom permission JSON |
| features_metadata | JSONB | YES | NULL | Feature metadata |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (plan_id, module_id)

---

### payment_history

**Purpose:** Payment transaction history  
**Multi-tenant:** Yes (business_account_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| mp_payment_id | VARCHAR(255) | YES | NULL | MercadoPago payment ID |
| mp_subscription_id | VARCHAR(255) | YES | NULL | MercadoPago subscription ID |
| amount_cents | INTEGER | NO | - | Payment amount in cents |
| currency | VARCHAR(3) | NO | 'COP' | Currency code |
| status | VARCHAR(50) | NO | - | Payment status |
| status_detail | VARCHAR(255) | YES | NULL | Status detail |
| payment_type | VARCHAR(50) | YES | NULL | Payment method type |
| payment_method | VARCHAR(50) | YES | NULL | Payment method |
| installments | INTEGER | NO | 1 | Number of installments |
| description | TEXT | YES | NULL | Payment description |
| external_reference | VARCHAR(255) | YES | NULL | External reference |
| payer_email | VARCHAR(255) | YES | NULL | Payer email |
| failure_reason | TEXT | YES | NULL | Failure reason if failed |
| metadata | JSONB | YES | NULL | Additional metadata |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)
- INDEX (mp_payment_id)

---

### subscription_events

**Purpose:** MercadoPago webhook event log  
**Multi-tenant:** Service role

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| event_type | VARCHAR(100) | NO | - | Event type |
| mp_event_id | VARCHAR(255) | YES | NULL | MercadoPago event ID |
| mp_subscription_id | VARCHAR(255) | YES | NULL | Subscription ID |
| mp_payment_id | VARCHAR(255) | YES | NULL | Payment ID |
| business_account_id | UUID | YES | NULL | FK → business_accounts.id |
| payload | JSONB | NO | '{}' | Full webhook payload |
| processed | BOOLEAN | NO | FALSE | Whether processed |
| processed_at | TIMESTAMPTZ | YES | NULL | When processed |
| error_message | TEXT | YES | NULL | Processing error |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)
- INDEX (processed)

---

### saved_cards

**Purpose:** Stored payment cards  
**Multi-tenant:** Yes (business_account_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_account_id | UUID | NO | - | FK → business_accounts.id |
| mp_card_id | VARCHAR(255) | NO | - | MercadoPago card ID |
| mp_customer_id | VARCHAR(255) | NO | - | MercadoPago customer ID |
| last_four_digits | VARCHAR(4) | NO | - | Card last 4 digits |
| first_six_digits | VARCHAR(6) | NO | - | Card first 6 digits (BIN) |
| expiration_month | INTEGER | NO | - | Expiry month |
| expiration_year | INTEGER | NO | - | Expiry year |
| card_brand | VARCHAR(50) | NO | - | Card brand |
| card_type | VARCHAR(50) | NO | - | credit/debit |
| cardholder_name | VARCHAR(255) | NO | - | Cardholder name |
| is_default | BOOLEAN | NO | FALSE | Is default card |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_account_id)
- UNIQUE (business_account_id, mp_card_id)

---

## 5. Notification & Feedback Tables

### notifications

**Purpose:** User notifications  
**Multi-tenant:** Yes (user_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| user_id | UUID | NO | - | FK → auth.users.id |
| title | TEXT | NO | - | Notification title |
| body | TEXT | YES | NULL | Notification body |
| type | notification_type | NO | - | Type: booking/chat/promo/etc |
| source | notification_source | NO | 'internal' | Source: push/local/internal |
| is_read | BOOLEAN | NO | FALSE | Whether read |
| data | JSONB | YES | NULL | Additional payload |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| read_at | TIMESTAMPTZ | YES | NULL | When marked as read |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (is_read)
- INDEX (created_at DESC)

---

### notification_thresholds

**Purpose:** Days-overdue thresholds with template assignment  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| business_account_id | UUID | YES | NULL | FK → business_accounts.id (deprecated) |
| name | VARCHAR(255) | NO | - | Threshold name |
| description | TEXT | YES | NULL | Description |
| days_from | INTEGER | NO | - | Start day (inclusive) |
| days_to | INTEGER | YES | NULL | End day (inclusive) |
| email_template_id | UUID | YES | NULL | FK → collection_templates.id |
| is_active | BOOLEAN | NO | TRUE | Is active |
| display_order | INTEGER | NO | 0 | Display order |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_id)
- INDEX (business_id, is_active, days_from)

---

### attachment_rules

**Purpose:** Deterministic attachment assignment rules  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| attachment_id | UUID | NO | - | FK → collection_attachments.id |
| business_id | UUID | NO | - | FK → businesses.id |
| business_account_id | UUID | YES | NULL | FK → business_accounts.id (deprecated) |
| rule_type | VARCHAR(50) | NO | - | global/threshold/customer_category/customer/execution |
| rule_entity_id | UUID | YES | NULL | ID of entity based on rule_type |
| is_required | BOOLEAN | NO | FALSE | Is attachment required |
| display_order | INTEGER | NO | 0 | Display order |
| conditions | JSONB | NO | '{}' | JSON conditions (min_amount, max_amount) |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (attachment_id, rule_type, rule_entity_id)
- INDEX (business_id, rule_type, rule_entity_id)

---

### feedback

**Purpose:** User feedback and support tickets  
**Multi-tenant:** Yes (business_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| business_id | UUID | NO | - | FK → businesses.id |
| user_id | UUID | NO | - | User who submitted |
| type | VARCHAR(50) | NO | - | bug_report/feature_request/feedback/complaint |
| title | VARCHAR(255) | NO | - | Feedback title |
| description | TEXT | NO | - | Detailed description |
| severity | VARCHAR(20) | NO | 'medium' | low/medium/high/critical |
| status | VARCHAR(20) | NO | 'open' | open/in_progress/resolved/closed |
| priority | INTEGER | NO | 0 | Priority level |
| attachment_urls | TEXT[] | NO | '{}' | Array of attachment URLs |
| metadata | JSONB | NO | '{}' | Additional metadata |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |
| resolved_at | TIMESTAMPTZ | YES | NULL | When resolved |

**Indexes:**

- PRIMARY KEY (id)
- INDEX (business_id)
- INDEX (status)
- INDEX (created_at DESC)

---

## 6. System Configuration Tables

### system_settings

**Purpose:** Global system configuration  
**Multi-tenant:** No (admin only)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| key | VARCHAR(100) | NO | - | Setting key (UNIQUE) |
| value | JSONB | NO | '{}' | Setting value JSON |
| description | TEXT | YES | NULL | Description |
| created_at | TIMESTAMPTZ | NO | NOW() | - |
| updated_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (key)

**Default Settings:**

- `trial_config`: { default_trial_days: 14, post_trial_plan_code: 'free', ... }

---

### users_profile

**Purpose:** Extended user profile information  
**Multi-tenant:** Yes (user_id)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | gen_random_uuid() | Primary Key |
| user_id | UUID | NO | - | FK → auth.users.id |
| role | VARCHAR(50) | NO | 'user' | User role |
| profile_picture_url | TEXT | YES | NULL | Profile image URL |
| date_of_birth | DATE | YES | NULL | Date of birth |
| gender | VARCHAR(20) | YES | NULL | MALE/FEMALE/OTHER/PREFER_NOT_TO_SAY |
| language_preference | VARCHAR(10) | NO | 'es' | Language code |
| country | VARCHAR(2) | YES | NULL | Country code |
| state | VARCHAR(100) | YES | NULL | State/province |
| city | VARCHAR(100) | YES | NULL | City |
| identification_type | VARCHAR(50) | YES | NULL | ID type (CC/CE/PA/NIT) |
| identification_number | VARCHAR(50) | YES | NULL | ID number |
| prefers_newsletter_email | BOOLEAN | NO | FALSE | Opt-in newsletter |
| prefers_promo_push | BOOLEAN | NO | FALSE | Opt-in push promos |
| prefers_promo_sms | BOOLEAN | NO | FALSE | Opt-in SMS promos |
| prefers_account_updates_email | BOOLEAN | NO | TRUE | Account update emails |
| fcm_token | TEXT | YES | NULL | Firebase token |
| created_at | TIMESTAMPTZ | NO | NOW() | - |

**Indexes:**

- PRIMARY KEY (id)
- UNIQUE (user_id)
- INDEX (user_id)

---

## 7. Custom Types (Enums)

### business_type

```sql
CREATE TYPE business_type AS ENUM (
    'headquarters',  -- Main office
    'branch',        -- Branch office
    'office',        -- Regular office
    'warehouse'      -- Storage facility
);
```

### execution_event_type

```sql
CREATE TYPE execution_event_type AS ENUM (
    'ENQUEUED',      -- Added to queue
    'PICKED_UP',     -- Worker picked up
    'DEFERRED',      -- Deferred for later
    'PROCESSING',    -- Currently processing
    'COMPLETED',     -- Successfully completed
    'FAILED',        -- Failed with error
    'DLQ_SENT'       -- Sent to dead letter queue
);
```

### notification_type

```sql
CREATE TYPE notification_type AS ENUM (
    'booking',
    'chat',
    'promo',
    'system',
    'payment',
    'collection',
    'reminder'
);
```

### notification_source

```sql
CREATE TYPE notification_source AS ENUM (
    'push',      -- Push notification
    'local',     -- In-app notification
    'internal',  -- System internal
    'email',     -- Email notification
    'sms'        -- SMS notification
);
```

---

## 8. Database Functions & RPC

### Function Categories

- [Scheduler Lock Functions](#scheduler-lock-functions)
- [Collection & Email Functions](#collection--email-functions)
- [Threshold Functions](#threshold-functions)
- [Reconciliation Functions](#reconciliation-functions)
- [Blacklist Management Functions](#blacklist-management-functions)
- [Delivery Strategy Functions](#delivery-strategy-functions)
- [Subscription & Billing Functions](#subscription--billing-functions)
- [User Management Functions](#user-management-functions)
- [Plan & Module Functions](#plan--module-functions)
- [Timestamp Functions](#timestamp-functions)

### Scheduler Lock Functions

#### acquire_scheduler_lock(worker_id TEXT, ttl_seconds INTEGER DEFAULT 300)

**Returns:** BOOLEAN
**Purpose:** Acquire distributed lock for scheduler

```sql
SELECT acquire_scheduler_lock('worker-123', 300);
```

#### release_scheduler_lock(worker_id TEXT)

**Returns:** BOOLEAN
**Purpose:** Release distributed lock

```sql
SELECT release_scheduler_lock('worker-123');
```

---

### Collection & Email Functions

#### increment_execution_counters(execution_id UUID, column_name TEXT, increment_by INTEGER DEFAULT 1)

**Returns:** VOID
**Purpose:** Atomically increment execution counter (emails_sent, emails_delivered, etc)

```sql
SELECT increment_execution_counters('uuid-here', 'emails_sent', 1);
```

#### accumulate_email_metrics(client_id UUID, event_type TEXT, metadata JSONB DEFAULT '{}')

**Returns:** VOID
**Purpose:** Accumulate email metrics from webhook events (delivered, opened, bounced, complaint)

```sql
SELECT accumulate_email_metrics('client-uuid', 'delivered', '{"ses_message_id": "xxx"}');
```

#### calculate_execution_metrics(execution_id UUID)

**Returns:** TABLE (metric_name TEXT, value INTEGER)
**Purpose:** Calculate aggregated metrics for an execution

```sql
SELECT * FROM calculate_execution_metrics('execution-uuid');
```

---

### Threshold Functions

#### get_threshold_for_days(business_id UUID, days_overdue INTEGER)

**Returns:** TABLE (id, name, email_template_id)
**Purpose:** Get applicable threshold for days overdue

```sql
SELECT * FROM get_threshold_for_days('business-uuid', 15);
```

#### resolve_attachments_by_rules(

    business_id UUID,
    threshold_id UUID,
    customer_category_id UUID,
    customer_id UUID,
    days_overdue INTEGER,
    invoice_amount NUMERIC
)
**Returns:** TABLE with attachment details
**Purpose:** Resolve attachments based on deterministic rules

```sql
SELECT * FROM resolve_attachments_by_rules(
    'business-uuid',
    'threshold-uuid',
    'category-uuid',
    'customer-uuid',
    15,
    1000000
);
```

#### resolve_attachments_bulk(execution_id UUID)

**Returns:** TABLE with resolved attachments per client
**Purpose:** Bulk resolve attachments for all clients in an execution

```sql
SELECT * FROM resolve_attachments_bulk('execution-uuid');
```

---

### Reconciliation Functions

#### reconcile_execution_metrics(execution_id UUID)

**Returns:** TABLE (metric_name, old_value, new_value, updated)
**Purpose:** Sync collection_executions metrics from execution_batches

```sql
SELECT * FROM reconcile_execution_metrics('execution-uuid');
```

---

### Blacklist Management Functions

#### add_to_blacklist(p_business_id UUID, p_email TEXT, p_bounce_type TEXT, p_bounce_reason TEXT, p_source_customer_id UUID, p_source_execution_id UUID, p_source_client_id UUID, p_provider TEXT)

**Returns:** VOID
**Purpose:** Add email to blacklist (idempotent)

```sql
SELECT add_to_blacklist('business-uuid', 'email@test.com', 'hard', 'Mailbox not found', null, null, null, 'brevo');
```

#### is_email_blacklisted(p_business_id UUID, p_email TEXT)

**Returns:** BOOLEAN
**Purpose:** Check if email is blacklisted

```sql
SELECT is_email_blacklisted('business-uuid', 'email@test.com');
```

#### filter_blacklisted_emails(p_business_id UUID, p_emails TEXT[])

**Returns:** TEXT[]
**Purpose:** Filter out blacklisted emails from array

```sql
SELECT filter_blacklisted_emails('business-uuid', ARRAY['a@test.com', 'b@test.com']);
```

---

### Delivery Strategy Functions

#### create_default_delivery_strategies(business_id UUID)

**Returns:** VOID
**Purpose:** Creates two default delivery strategies for a new business
**Strategies created:**

- "Recuperación de Reputación" (conservative) - ID: Auto-generated
- "Ramp-Up Gradual Estándar" (ramp_up, default) - ID: Auto-generated

**Called by:** Trigger `create_default_strategies_on_business_insert`

```sql
SELECT create_default_delivery_strategies('business-uuid');
```

**Note:** IDs are auto-generated using `gen_random_uuid()` to ensure uniqueness per business

---

### Subscription & Billing Functions

#### calculate_trial_end_date(business_account_id UUID, custom_trial_days INTEGER)

**Returns:** TIMESTAMPTZ
**Purpose:** Calculate trial end date based on custom_trial_days or system default

```sql
SELECT calculate_trial_end_date('account-uuid', 14);
```

#### start_trial_for_account(business_account_id UUID, plan_code TEXT)

**Returns:** BOOLEAN
**Purpose:** Start trial period for a business account

```sql
SELECT start_trial_for_account('account-uuid', 'pro');
```

#### can_create_business_in_account(business_account_id UUID)

**Returns:** BOOLEAN
**Purpose:** Check if account can create more businesses (plan limit)

```sql
SELECT can_create_business_in_account('account-uuid');
```

#### count_account_businesses(business_account_id UUID)

**Returns:** INTEGER
**Purpose:** Count businesses in an account

```sql
SELECT count_account_businesses('account-uuid');
```

#### check_and_update_expired_trial()

**Returns:** INTEGER
**Purpose:** Check all trial accounts and update expired ones (called by cron)

```sql
SELECT check_and_update_expired_trial();
```

#### process_subscription_payment(payment_data JSONB)

**Returns:** JSONB
**Purpose:** Process subscription payment from MercadoPago

```sql
SELECT process_subscription_payment('{"mp_payment_id": "xxx", "amount": 9900}');
```

---

### User Management Functions

#### create_user_with_metadata(email TEXT, password TEXT, user_metadata JSONB, app_metadata JSONB)

**Returns:** UUID (user_id)
**Purpose:** Create auth user with custom metadata

```sql
SELECT create_user_with_metadata('user@test.com', 'password123', 
  '{"name": "John"}', '{"business_id": "xxx"}');
```

#### delete_auth_instance(user_id UUID)

**Returns:** BOOLEAN
**Purpose:** Delete auth user and related data

```sql
SELECT delete_auth_instance('user-uuid');
```

#### create_auth_instance(email TEXT, password TEXT, user_data JSONB)

**Returns:** JSONB
**Purpose:** Create complete auth instance with profile

```sql
SELECT create_auth_instance('user@test.com', 'password123', '{"role": "admin"}');
```

---

### Plan & Module Functions

#### get_plan_feature_limit(plan_code TEXT, feature_key TEXT)

**Returns:** INTEGER
**Purpose:** Get feature limit for a plan

```sql
SELECT get_plan_feature_limit('pro', 'max_businesses');
```

#### check_module_access(plan_code TEXT, module_code TEXT, permission_type TEXT)

**Returns:** BOOLEAN
**Purpose:** Check if plan has access to module/permission

```sql
SELECT check_module_access('pro', 'collections', 'write');
```

#### check_subscription_access(business_account_id UUID, feature_key TEXT)

**Returns:** BOOLEAN
**Purpose:** Check if subscription allows feature

```sql
SELECT check_subscription_access('account-uuid', 'advanced_analytics');
```

#### assign_modules_to_plan(plan_id UUID, module_ids UUID[])

**Returns:** VOID
**Purpose:** Assign modules to a plan

```sql
SELECT assign_modules_to_plan('plan-uuid', ARRAY['module1-uuid', 'module2-uuid']);
```

#### ensure_single_default_card(business_account_id UUID, card_id UUID)

**Returns:** VOID
**Purpose:** Ensure only one default card per account

```sql
SELECT ensure_single_default_card('account-uuid', 'card-uuid');
```

---

### Timestamp Functions

#### update_updated_at_column()

**Returns:** TRIGGER
**Purpose:** Auto-update updated_at timestamp
**Used in:** Multiple tables via triggers

---

## 9. Triggers

### Trigger Categories

- [Auto-update updated_at triggers](#auto-update-updated_at-triggers)
- [Business Creation Triggers](#business-creation-triggers)

### Auto-update updated_at triggers

Applied to all tables with `updated_at` column:

| Table | Trigger Name |
|-------|--------------|
| email_reputation_profiles | update_reputation_profiles_updated_at |
| delivery_strategies | update_delivery_strategies_updated_at |
| execution_batches | update_execution_batches_updated_at |
| batch_queue_messages | update_batch_queue_messages_updated_at |
| daily_sending_limits | update_daily_sending_limits_updated_at |
| notification_thresholds | update_notification_thresholds_updated_at |
| attachment_rules | update_attachment_rules_updated_at |

**Function:** `update_updated_at_column()`

---

### Business Creation Triggers

#### create_default_strategies_on_business_insert

**Table:** `businesses`
**Timing:** AFTER INSERT
**Function:** `trigger_create_default_delivery_strategies()`
**Purpose:** Automatically creates default delivery strategies when a new business is created

**Flow:**

```
INSERT INTO businesses → Trigger fires → create_default_delivery_strategies(NEW.id)
```

**Strategies created:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| Recuperación de Reputación | conservative | false | Ultra conservadora para dominios con problemas de reputación |
| Ramp-Up Gradual Estándar | ramp_up | true | Conservadora para nuevos dominios, incrementa volumen gradualmente |

---

## 10. Views

### email_reputation_summary

**Purpose:** Executive summary of domain reputation

```sql
SELECT * FROM email_reputation_summary;
```

**Columns:** All email_reputation_profiles columns + business_name

---

### execution_batch_progress

**Purpose:** Aggregated batch progress per execution

```sql
SELECT * FROM execution_batch_progress;
```

**Columns:**

- execution_id, execution_name, business_id
- total_batches, pending_batches, queued_batches, processing_batches, completed_batches, failed_batches
- total_clients, emails_sent, emails_delivered, emails_opened, emails_bounced
- delivery_rate, open_rate, bounce_rate
- completion_percentage

---

### execution_metrics_consistency_check

**Purpose:** Detect data inconsistencies between executions and batches

```sql
SELECT * FROM execution_metrics_consistency_check;
```

**Columns:**

- execution_id, execution_name
- exec_emails_sent/delivered/opened/bounced (from collection_executions)
- batch_emails_sent/delivered/opened/bounced (aggregated from batches)
- diff_* (differences)
- is_consistent (BOOLEAN)

**Alert:** Run periodically to detect data drift

---

### execution_summary

**Purpose:** Collection execution summary with calculated metrics

```sql
SELECT * FROM execution_summary;
```

**Columns:** All collection_executions columns + calculated rates and client counts

---

### v_plan_with_modules

**Purpose:** Plans with their modules and permissions

```sql
SELECT * FROM v_plan_with_modules;
```

---

## 11. RLS Policies

### email_reputation_profiles

```sql
-- View own profiles
FOR SELECT USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)

-- Manage own profiles
FOR ALL USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)
```

### email_blacklist

```sql
-- View own blacklist
FOR SELECT USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)

-- Manage own blacklist
FOR ALL USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)
```

### delivery_strategies

```sql
-- View own strategies
FOR SELECT USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)

-- Manage own strategies
FOR ALL USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid)

-- Service role bypass (required for trigger)
FOR ALL TO service_role USING (true) WITH CHECK (true)
```

### execution_batches

```sql
-- View batches of own executions
FOR SELECT USING (execution_id IN (
    SELECT id FROM collection_executions 
    WHERE business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
))

-- Manage batches of own executions
FOR ALL USING (execution_id IN (
    SELECT id FROM collection_executions 
    WHERE business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
))
```

### collection_config

```sql
-- View own config
FOR SELECT USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR business_id IN (
        SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
)

-- Create config
FOR INSERT WITH CHECK (auth.role() = 'authenticated')

-- Update own config
FOR UPDATE USING (
    business_id = (auth.jwt() -> 'user_metadata' ->> 'business_id')::UUID
    OR business_id IN (
        SELECT (jsonb_array_elements((auth.jwt() -> 'user_metadata' -> 'businesses'))::jsonb ->> 'id')::UUID
    )
)
```

---

## 12. Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE ENTITIES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

business_accounts (1)
    ├──► businesses (N) via business_account_id
    │       ├──► collection_config (1) via business_id
    │       ├──► collection_executions (N) via business_id
    │       ├──► business_customers (N) via business_id
    │       │       └──► email_blacklist (N) via source_customer_id
    │       ├──► email_reputation_profiles (N) via business_id
    │       ├──► delivery_strategies (N) via business_id
    │       ├──► notification_thresholds (N) via business_id
    │       ├──► attachment_rules (N) via business_id
    │       └──► email_blacklist (N) via business_id
    │
    ├──► business_customers (N) via business_account_id
    │       └──► customer_categories (N) via category
    │
    ├──► collection_templates (N) via business_account_id
    │       └──► notification_thresholds (N) via email_template_id
    │
    ├──► collection_attachments (N) via business_account_id
    │       └──► attachment_rules (N) via attachment_id
    │
    ├──► payment_history (N) via business_account_id
    ├──► saved_cards (N) via business_account_id
    │
    ├──► plans (1) via plan_id
    │       └──► plan_module_access (N) via plan_id
    │               └──► plan_modules (1) via module_id
    │
    └──► subscription_events (N) via business_account_id


┌─────────────────────────────────────────────────────────────────────────────┐
│                          COLLECTION SYSTEM                                   │
└─────────────────────────────────────────────────────────────────────────────┘

collection_executions (1)
    ├──► collection_clients (N) via execution_id
    │       ├──► business_customers (1) via customer_id
    │       ├──► collection_templates (1) via email_template_id
    │       └──► notification_thresholds (1) via threshold_id
    │
    ├──► collection_events (N) via execution_id
    │
    ├──► execution_batches (N) via execution_id
    │       ├──► delivery_strategies (1) via strategy_id
    │       ├──► batch_queue_messages (N) via batch_id
    │       └──► execution_audit_logs (N) via batch_id
    │
    └──► execution_audit_logs (N) via execution_id


┌─────────────────────────────────────────────────────────────────────────────┐
│                      EMAIL REPUTATION SYSTEM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

email_reputation_profiles (1)
    ├──► daily_sending_limits (N) via reputation_profile_id
    │       └──► Updated by Lambda daily
    │
    └──► Views:
            ├── email_reputation_summary (read-only)
            └── Used by delivery_strategies for limits

delivery_strategies (1)
    ├──► execution_batches (N) via strategy_id
    └──► warmup_progression_rules (N) via strategy_id


┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCHEDULER & CONTROL                                   │
└─────────────────────────────────────────────────────────────────────────────┘

scheduler_locks (singleton)
    ├── Used by: acquire_scheduler_lock(), release_scheduler_lock()
    └── RLS: Service role only

execution_audit_logs (N)
    ├── FK: execution_id → collection_executions
    ├── FK: batch_id → execution_batches
    └── RLS: Service role write, authenticated read


┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER MANAGEMENT                                     │
└─────────────────────────────────────────────────────────────────────────────┘

auth.users (Supabase Auth)
    └──► users_profile (1) via user_id
            └──► notifications (N) via user_id


┌─────────────────────────────────────────────────────────────────────────────┐
│                            SYSTEM TABLES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

system_settings (global)
    ├── Key: 'trial_config'
    └── RLS: Admin only

feedback (N) via business_id
    └── RLS: Business scoped
```

---

## Data Flow Architecture

### Email Campaign Execution Flow

```
1. User creates collection_execution
   ↓
2. System creates collection_clients (imported customers)
   ↓
3. Scheduler (Lambda) queries pending executions
   │   └── Uses scheduler_locks for distributed locking
   ↓
4. Creates execution_batches from clients
   │   └── Respects delivery_strategies limits
   ↓
5. Enqueues batches to SQS
   │   └── Creates batch_queue_messages records
   ↓
6. Lambda Worker consumes from SQS
   │   └── Creates execution_audit_logs
   ↓
7. Sends emails via AWS SES
   │   └── Updates execution_batches metrics
   ↓
8. SES Webhook events update metrics
   │   └── Updates email_reputation_profiles
   │   └── Updates daily_sending_limits
   ↓
9. Real-time updates via Supabase Realtime
   └── Client receives live updates
```

### Threshold-Based Template Assignment

```
collection_clients.days_overdue
   ↓
get_threshold_for_days(business_id, days_overdue)
   ↓
Returns: notification_thresholds record
   ↓
Uses: notification_thresholds.email_template_id
   ↓
For attachment resolution:
   resolve_attachments_by_rules(
       business_id,
       threshold_id,
       customer_category_id,
       customer_id,
       days_overdue,
       invoice_amount
   )
```

---

## Migration History

| Migration | Date | Description |
|-----------|------|-------------|
| 20250202000000 | 2025-02-02 | Email reputation & batching system |
| 20260204000000 | 2026-02-04 | Collection RPC functions |
| 20260210 | 2026-02-10 | Execution strategy (scheduler locks) |
| 20260211 | 2026-02-11 | Enable realtime for control tower |
| 20260219 | 2026-02-19 | Notification thresholds system |
| 20260220 | 2026-02-20 | Migrate thresholds to business_id |
| 20260220 | 2026-02-20 | Migrate collection_config to business_id |
| 20260220 | 2026-02-20 | Collection date formats |
| 20260223 | 2026-02-23 | Unique constraint on customer NIT |
| 20260224 | 2026-02-24 | Default delivery strategies trigger for new businesses |

---

## Notes

### Multi-tenancy Strategy

- **Primary tenant column:** `business_id` (businesses table)
- **Legacy tenant column:** `business_account_id` (being migrated)
- **RLS Pattern:** JWT metadata contains `business_id` for filtering

### Critical Consistency Rules

1. **collection_executions.metrics** = SUM(execution_batches.metrics) per execution_id
2. **email_reputation_profiles.total_***= SUM(daily_sending_limits.*) per reputation_profile_id
3. Use `execution_metrics_consistency_check` view to detect drift

### Performance Considerations

- All business-scoped tables have indexes on `business_id`
- Execution tables indexed by `status`, `created_at`, `scheduled_for`
- JSONB columns used for flexible data (invoices, custom_data, conditions)
- Arrays used for simple lists (attachment_ids, tags, alert_recipients)

### Real-time Tables

Enabled for Supabase Realtime:

- collection_executions
- collection_clients
- execution_audit_logs
- scheduler_locks

---

## 13. Discrepancias Encontradas (Feb 2026)

### Tablas que NO existen

| Tabla | Estado | Notas |
|-------|--------|-------|
| users_profile | NO EXISTE | La tabla no existe en la base de datos |

### Vistas que NO existen

| Vista | Estado | Notas |
|-------|--------|-------|
| execution_summary | NO EXISTE | La vista no existe en la base de datos |

### Funciones RPC - Estado Actual

Todas las funciones RPC documentadas en sección 8 SÍ existen EXCEPTO:

| Función | Estado | Notas |
|---------|--------|-------|
| increment_execution_counter | RENOMBRADA | Ahora se llama `increment_execution_counters` |
| increment_client_stats | NO EXISTE | Función no implementada |
| update_updated_at_column | NO VERIFICABLE | Es un trigger, no una función RPC callable |

### Funciones RPC adicionales no documentadas

Las siguientes funciones existen en la DB pero no están documentadas en sección 8:

| Función | Categoría |
|---------|-----------|
| accumulate_email_metrics | Collection & Email |
| add_to_blacklist | Blacklist |
| assign_modules_to_plan | Plan & Module |
| calculate_execution_metrics | Collection & Email |
| calculate_trial_end_date | Subscription |
| can_create_business_in_account | Subscription |
| check_and_update_expired_trial | Subscription |
| check_module_access | Plan & Module |
| check_subscription_access | Plan & Module |
| count_account_businesses | Subscription |
| create_auth_instance | User Management |
| create_user_with_metadata | User Management |
| delete_auth_instance | User Management |
| ensure_single_default_card | Plan & Module |
| filter_blacklisted_emails | Blacklist |
| get_account_businesses | Subscription |
| get_plan_feature_limit | Plan & Module |
| is_email_blacklisted | Blacklist |
| process_subscription_payment | Subscription |
| resolve_attachments_bulk | Threshold |
| start_trial_for_account | Subscription |
| trigger_create_default_delivery_strategies | Trigger |
| update_business_accounts_updated_at | Timestamp |
| update_business_customers_updated_at | Timestamp |
| update_email_blacklist_updated_at | Timestamp |
| update_payment_history_updated_at | Timestamp |
| update_plans_updated_at | Timestamp |
| update_saved_cards_updated_at | Timestamp |
| update_system_settings_updated_at | Timestamp |

### Columnas adicionales encontradas

| Tabla | Columna | Tipo | Notas |
|-------|---------|------|-------|
| email_reputation_profiles | provider | VARCHAR(50) | Proveedor de email (brevo/ses/etc) - AÑADIDA a documentación |

### Enum Types

Los siguientes tipos enum están documentados pero NO fueron verificados via API REST (son tipos de datos PostgreSQL, no tablas):

- business_type
- execution_event_type
- notification_type
- notification_source

---

*Document generated for Apex Portfolio Collection System*
*Last updated: February 26, 2026*
