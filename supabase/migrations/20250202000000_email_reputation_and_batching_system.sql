-- ============================================================================
-- Sistema de Gestión de Reputación Email y Batching Inteligente
-- Para AWS SES - Prevención de Spam y Optimización de Deliverability
-- ============================================================================

-- ============================================================================
-- ARQUITECTURA DE MÉTRICAS - LECTURA OBLIGATORIA
-- ============================================================================
-- Este sistema utiliza MÚLTIPLES tablas con métricas similares pero con
-- PROPÓSITOS DIFERENTES. Es CRÍTICO entender estas diferencias:
--
-- 1. collection_executions (EXISTENTE - NO MODIFICAR):
--    - Propósito: Dashboard/UI - métricas AGREGADAS de toda la ejecución
--    - Alcance: Una campaña específica
--    - Uso: Queries rápidas sin joins para mostrar progreso general
--    - Ejemplo: "Campaña Febrero: 4200 enviados, 95% delivery"
--
-- 2. execution_batches (NUEVA):
--    - Propósito: Granularidad - métricas por GRUPO de clientes
--    - Alcance: Un batch específico (ej: Batch #1 de 84)
--    - Uso: Tracking detallado, reintentos por batch, debugging
--    - Ejemplo: "Batch 1: 50 enviados, 48 delivered, 24 opens"
--
-- 3. email_reputation_profiles (NUEVA):
--    - Propósito: Reputación DOMINIO - métricas ACUMULADAS históricas
--    - Alcance: TODAS las ejecuciones de un dominio desde su creación
--    - Uso: Decidir estrategia, progresión warm-up, alertas de reputación
--    - Ejemplo: "bore.sas: 15000 emails totales, 23% open rate histórico"
--
-- 4. daily_sending_limits (NUEVA):
--    - Propósito: Control de CUOTAS diarias - métricas por DÍA específico
--    - Alcance: Un día específico para un dominio
--    - Uso: Validar límites de ramp-up, decidir progresión al siguiente día
--    - Ejemplo: "2026-02-02: 150/150 enviados, 26% opens (puede progresar)"
--
-- RELACIÓN JERÁRQUICA:
-- daily_sending_limits (día) → email_reputation_profiles (dominio acumulado)
--     ↓
-- execution_batches (grupos) → collection_executions (ejecución agregada)
--
-- CONSISTENCIA:
-- - collection_executions.* = SUM(execution_batches.*) WHERE execution_id = X
-- - email_reputation_profiles.total_* = SUM(daily_sending_limits.*) 
--                                     WHERE reputation_profile_id = X
-- ============================================================================

-- ============================================================================
-- 1. Perfiles de Reputación por Dominio/IP
-- ============================================================================
-- Almacena el historial y estado de reputación de cada dominio o IP de envío.
-- Las métricas aquí son ACUMULADAS desde la creación del dominio (histórico).
-- Se actualizan automáticamente desde daily_sending_limits.
CREATE TABLE IF NOT EXISTS email_reputation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Identificación del remitente
    domain VARCHAR(255) NOT NULL, -- ej: bore.sas
    sending_ip VARCHAR(45), -- IP dedicada de SES (opcional)
    
    -- Estado de warm-up
    is_warmed_up BOOLEAN DEFAULT FALSE,
    warmup_start_date TIMESTAMPTZ,
    warmup_completed_date TIMESTAMPTZ,
    current_warmup_day INTEGER DEFAULT 0, -- Día actual en el proceso de warm-up
    
    -- Métricas ACUMULADAS desde la creación del dominio (histórico total)
    -- NOTA: Estas son sumas de TODOS los envíos de este dominio
    -- Fuente de verdad: SUM(daily_sending_limits.*) por reputation_profile_id
    total_emails_sent INTEGER DEFAULT 0, -- Total histórico de emails enviados
    total_emails_delivered INTEGER DEFAULT 0, -- Total histórico entregados exitosamente
    total_emails_opened INTEGER DEFAULT 0, -- Total histórico abiertos
    total_emails_bounced INTEGER DEFAULT 0, -- Total histórico rebotados
    total_complaints INTEGER DEFAULT 0, -- Total histórico de complaints
    
    -- Tasas calculadas sobre el total histórico
    -- delivery_rate = (total_emails_delivered / total_emails_sent) * 100
    delivery_rate DECIMAL(5,2) DEFAULT 0.00,
    open_rate DECIMAL(5,2) DEFAULT 0.00, 
    bounce_rate DECIMAL(5,2) DEFAULT 0.00,
    complaint_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Configuración de envío
    daily_sending_limit INTEGER DEFAULT 50, -- Límite diario actual (dinámico en ramp-up)
    max_sending_limit INTEGER DEFAULT 200, -- Límite máximo al que se puede llegar
    
    -- Estrategia actual
    current_strategy VARCHAR(20) DEFAULT 'ramp_up' CHECK (current_strategy IN ('ramp_up', 'batch', 'conservative')),
    
    -- Flags de alerta
    is_under_review BOOLEAN DEFAULT FALSE, -- Si AWS SES está revisando
    has_reputation_issues BOOLEAN DEFAULT FALSE, -- Si hay problemas de reputación
    last_issue_date TIMESTAMPTZ,
    
    -- Engagement thresholds para progresión
    required_open_rate DECIMAL(5,2) DEFAULT 20.00, -- 20% opens requerido para progresar
    required_delivery_rate DECIMAL(5,2) DEFAULT 95.00, -- 95% delivery requerido
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_domain_per_business UNIQUE (business_id, domain)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_reputation_profiles_business ON email_reputation_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_reputation_profiles_domain ON email_reputation_profiles(domain);
CREATE INDEX IF NOT EXISTS idx_reputation_profiles_warmed_up ON email_reputation_profiles(is_warmed_up);

-- Comentarios detallados
COMMENT ON TABLE email_reputation_profiles IS 
'Perfiles de reputación de dominios para gestión de deliverability con SES. 
ALCANCE: Métricas ACUMULADAS históricas de TODOS los envíos del dominio desde su creación.
RELACIÓN: Se actualiza automáticamente desde daily_sending_limits.
USO: Decidir estrategia, warm-up, alertas de reputación. NO usar para métricas de ejecución específica.';

COMMENT ON COLUMN email_reputation_profiles.total_emails_sent IS 
'Total histórico de emails enviados por este dominio (acumulado desde daily_sending_limits).
Ejemplo: Si hoy envió 50 y ayer 100, valor = 150';

COMMENT ON COLUMN email_reputation_profiles.total_emails_delivered IS 
'Total histórico de emails entregados exitosamente.
DIFERENCIA con emails_sent: sent incluye bounces, delivered solo exitosos.';

COMMENT ON COLUMN email_reputation_profiles.delivery_rate IS 
'Porcentaje de entrega exitosa = (total_delivered / total_sent) * 100.
Uso: Evaluar reputación general del dominio.';

-- ============================================================================
-- 2. Configuración de Estrategias de Entrega
-- ============================================================================
-- Define las reglas y parámetros para cada tipo de estrategia.
-- NOTA: Los negocios pueden tener múltiples estrategias pero solo una default.
CREATE TABLE IF NOT EXISTS delivery_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Información básica
    name VARCHAR(100) NOT NULL, -- ej: "Estrategia Conservadora", "Alta Volúmen"
    description TEXT,
    strategy_type VARCHAR(20) NOT NULL CHECK (strategy_type IN ('ramp_up', 'batch', 'conservative', 'aggressive')),
    is_default BOOLEAN DEFAULT FALSE, -- Estrategia por defecto para el negocio
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Parámetros de Ramp-Up (para estrategia ramp_up)
    rampup_day_1_limit INTEGER DEFAULT 50,    -- Día 1: 50 emails
    rampup_day_2_limit INTEGER DEFAULT 100,   -- Día 2: 100 emails
    rampup_day_3_5_limit INTEGER DEFAULT 150, -- Días 3-5: 150 emails
    rampup_day_6_plus_limit INTEGER DEFAULT 200, -- Día 6+: 200 emails
    
    -- Parámetros de Batch (para estrategia batch)
    batch_size INTEGER DEFAULT 100, -- Tamaño del batch (cuántos emails por grupo)
    batch_interval_minutes INTEGER DEFAULT 60, -- Intervalo entre batches (minutos)
    max_batches_per_day INTEGER DEFAULT 50, -- Máximo batches diarios
    concurrent_batches INTEGER DEFAULT 1, -- Batches simultáneos permitidos
    
    -- Umbrales de engagement para progresión
    min_open_rate_threshold DECIMAL(5,2) DEFAULT 20.00, -- 20% mínimo
    min_delivery_rate_threshold DECIMAL(5,2) DEFAULT 95.00, -- 95% mínimo
    max_bounce_rate_threshold DECIMAL(5,2) DEFAULT 5.00, -- 5% máximo
    max_complaint_rate_threshold DECIMAL(5,2) DEFAULT 0.10, -- 0.1% máximo
    
    -- Reglas de pausa automática
    pause_on_high_bounce BOOLEAN DEFAULT TRUE, -- Pausar si bounce > 10%
    pause_on_complaint BOOLEAN DEFAULT TRUE, -- Pausar si hay complaint
    auto_resume_after_minutes INTEGER DEFAULT 360, -- Auto-resume después de 6 horas
    
    -- Configuración de reintentos
    max_retry_attempts INTEGER DEFAULT 3,
    retry_interval_minutes INTEGER DEFAULT 30,
    
    -- Reglas de envío (horarios óptimos)
    respect_timezone BOOLEAN DEFAULT TRUE, -- Respetar zona horaria del destinatario
    preferred_send_hour_start INTEGER DEFAULT 9, -- 9 AM hora local
    preferred_send_hour_end INTEGER DEFAULT 17, -- 5 PM hora local
    avoid_weekends BOOLEAN DEFAULT TRUE, -- Evitar fines de semana
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
    
    -- Constraints
    -- NOTA: La constraint única parcial se crea como índice después (línea 196)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_delivery_strategies_business ON delivery_strategies(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_strategies_type ON delivery_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_delivery_strategies_active ON delivery_strategies(is_active);

-- Constraint única parcial: Solo permite un is_default = TRUE por negocio
-- Esto asegura que solo haya una estrategia por defecto por business
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_strategy_per_business 
ON delivery_strategies(business_id) 
WHERE is_default = TRUE;

COMMENT ON TABLE delivery_strategies IS 
'Configuración de estrategias de entrega: ramp_up, batch, conservative, aggressive.
ALCANCE: Reglas y parámetros para cómo distribuir emails.
RELACIÓN: Referenciada por execution_batches (cada batch usa una estrategia).
USO: Definir comportamiento de batching y límites de envío.';

-- ============================================================================
-- 3. Batches de Ejecución
-- ============================================================================
-- Grupos de clientes creados para envío batch organizado.
-- NOTA: Las métricas aquí son por GRUPO específICO, no agregadas.
-- Fuente de verdad: Actualizadas directamente por Lambda al procesar.
CREATE TABLE IF NOT EXISTS execution_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES collection_executions(id) ON DELETE CASCADE,
    strategy_id UUID REFERENCES delivery_strategies(id),
    
    -- Identificación del batch
    batch_number INTEGER NOT NULL, -- Número secuencial del batch (1, 2, 3...)
    batch_name VARCHAR(255), -- ej: "Batch 1 - Día 1 Ramp-Up"
    
    -- Estado del batch
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'paused')),
    
    -- Clientes incluidos
    total_clients INTEGER NOT NULL, -- Total de clientes en este batch
    client_ids UUID[] NOT NULL, -- Array de IDs de collection_clients
    
    -- Programación
    scheduled_for TIMESTAMPTZ, -- Cuándo debe ejecutarse (hora calculada por estrategia)
    processed_at TIMESTAMPTZ, -- Cuándo Lambda comenzó a procesar
    completed_at TIMESTAMPTZ, -- Cuándo Lambda terminó
    
    -- Métricas del batch (GRANULARES - de este grupo específico)
    -- NOTA: Estas son las fuentes de verdad que se agregan a collection_executions
    -- RELACIÓN: SUM(emails_sent) por execution_id = collection_executions.emails_sent
    emails_sent INTEGER DEFAULT 0, -- Cuántos se intentaron enviar en este batch
    emails_delivered INTEGER DEFAULT 0, -- Cuántos fueron entregados (recibieron messageId de SES)
    emails_opened INTEGER DEFAULT 0, -- Cuántos fueron abiertos (eventos de SES)
    emails_bounced INTEGER DEFAULT 0, -- Cuántos rebotaron (hard/soft bounces)
    emails_failed INTEGER DEFAULT 0, -- Cuántos fallaron (errores Lambda/SES)
    
    -- Referencias AWS
    sqs_message_id VARCHAR(255), -- ID del mensaje en SQS (para tracking)
    sqs_receipt_handle TEXT, -- Para confirmación de procesamiento (delete message)
    
    -- Error handling
    error_message TEXT, -- Si falló, qué error ocurrió
    retry_count INTEGER DEFAULT 0, -- Cuántas veces se ha reintentado
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_batch_number_per_execution UNIQUE (execution_id, batch_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_execution_batches_execution ON execution_batches(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_batches_status ON execution_batches(status);
CREATE INDEX IF NOT EXISTS idx_execution_batches_scheduled ON execution_batches(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_execution_batches_strategy ON execution_batches(strategy_id);

COMMENT ON TABLE execution_batches IS 
'Batches de clientes para envío organizado y rate-limited.
ALCANCE: Métricas GRANULARES por grupo específico de clientes.
RELACIÓN: 
  - Padre: collection_executions (execution_id)
  - Estrategia: delivery_strategies (strategy_id)
  - Agregación: SUM(emails_*) por execution_id = collection_executions.*
USO: Tracking detallado, reintentos por batch, debugging.
Fuente de verdad: Actualizado por Lambda consumer al procesar batch.';

COMMENT ON COLUMN execution_batches.emails_sent IS 
'Cuántos emails se intentaron enviar en ESTE batch específico.
DIFERENCIA con collection_executions.emails_sent: este es granular (un grupo), 
collection_executions es agregado (toda la ejecución).';

-- ============================================================================
-- 4. Mensajes en Cola SQS
-- ============================================================================
-- Tracking de mensajes encolados en SQS.
-- NOTA: Tabla de auditoría y control, no contiene métricas de negocio.
CREATE TABLE IF NOT EXISTS batch_queue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES execution_batches(id) ON DELETE CASCADE,
    
    -- SQS Info
    sqs_queue_url TEXT NOT NULL, -- URL completa de la cola
    sqs_message_id VARCHAR(255) NOT NULL, -- ID único asignado por AWS
    sqs_receipt_handle TEXT, -- Necesario para eliminar mensaje después de procesar
    
    -- Estado del mensaje en SQS
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'in_flight', 'processed', 'failed', 'dlq')),
    
    -- Payload (para auditoría, el payload real está en SQS)
    payload JSONB,
    
    -- Timestamps SQS
    sent_at TIMESTAMPTZ DEFAULT NOW(), -- Cuándo se envió a SQS
    received_at TIMESTAMPTZ, -- Cuándo Lambda lo recibió
    processed_at TIMESTAMPTZ, -- Cuándo Lambda terminó de procesar
    visible_at TIMESTAMPTZ, -- Cuándo será visible de nuevo (visibility timeout)
    
    -- Reintentos
    receive_count INTEGER DEFAULT 0, -- Cuántas veces se ha recibido (fallidos + éxitos)
    max_receives INTEGER DEFAULT 3, -- Mover a DLQ después de N intentos fallidos
    
    -- Error
    error_message TEXT, -- Si falló, último error
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_sqs_message UNIQUE (sqs_message_id, sqs_queue_url)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_queue_messages_batch ON batch_queue_messages(batch_id);
CREATE INDEX IF NOT EXISTS idx_queue_messages_status ON batch_queue_messages(status);
CREATE INDEX IF NOT EXISTS idx_queue_messages_sqs_id ON batch_queue_messages(sqs_message_id);
CREATE INDEX IF NOT EXISTS idx_queue_messages_visible ON batch_queue_messages(visible_at) WHERE status = 'in_flight';

COMMENT ON TABLE batch_queue_messages IS 
'Tracking de mensajes SQS para batches de email.
ALCANCE: Auditoría y control de mensajes en cola SQS.
RELACIÓN: Cada mensaje corresponde a un execution_batches.
USO: Debugging, reintentos, dead letter queue tracking.
NOTA: No contiene métricas de negocio, solo estado de la infraestructura.';

-- ============================================================================
-- 5. Historial de Envíos Diarios (Rate Limiting)
-- ============================================================================
-- Tracking diario para controlar límites y cumplir políticas de ramp-up.
-- NOTA: Las métricas aquí son por DÍA específico para un dominio.
-- Fuente de verdad: Actualizadas por Lambda al finalizar cada día.
CREATE TABLE IF NOT EXISTS daily_sending_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reputation_profile_id UUID NOT NULL REFERENCES email_reputation_profiles(id) ON DELETE CASCADE,
    
    -- Fecha del tracking (YYYY-MM-DD)
    date DATE NOT NULL,
    
    -- Límites aplicables (copiados de la estrategia activa ese día)
    daily_limit INTEGER NOT NULL, -- Máximo permitido para este día
    
    -- Contadores de este día específico
    -- NOTA: Estas se agregan a email_reputation_profiles.total_*
    emails_sent INTEGER DEFAULT 0, -- Enviados hoy
    emails_delivered INTEGER DEFAULT 0, -- Entregados hoy
    emails_opened INTEGER DEFAULT 0, -- Abiertos hoy
    emails_bounced INTEGER DEFAULT 0, -- Rebotados hoy
    
    -- Estado de control
    limit_reached BOOLEAN DEFAULT FALSE, -- Si se alcanzó el límite diario
    paused_until TIMESTAMPTZ, -- Si se pausó, hasta cuándo
    pause_reason VARCHAR(50), -- high_bounce, complaint, manual, etc.
    
    -- Métricas de engagement del día (para decidir progresión)
    -- Cálculo: day_open_rate = (emails_opened / emails_delivered) * 100
    day_open_rate DECIMAL(5,2),
    day_delivery_rate DECIMAL(5,2),
    day_bounce_rate DECIMAL(5,2),
    
    -- Flag de progresión (si cumple umbrales, puede subir de nivel)
    can_progress_to_next_day BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_daily_limit UNIQUE (reputation_profile_id, date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_limits_profile ON daily_sending_limits(reputation_profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_limits_date ON daily_sending_limits(date);
CREATE INDEX IF NOT EXISTS idx_daily_limits_reached ON daily_sending_limits(limit_reached);

COMMENT ON TABLE daily_sending_limits IS 
'Control diario de límites de envío para cumplir estrategias de ramp-up.
ALCANCE: Métricas por DÍA específico para un dominio.
RELACIÓN: 
  - Padre: email_reputation_profiles (reputation_profile_id)
  - Agregación: SUM(emails_*) = email_reputation_profiles.total_*
USO: Validar cuotas, decidir progresión warm-up, control de rate limiting.
Fuente de verdad: Actualizado por Lambda al finalizar procesamiento diario.';

COMMENT ON COLUMN daily_sending_limits.emails_sent IS 
'Cuántos emails se enviaron en ESTE día específico.
DIFERENCIA con otras tablas:
  - execution_batches.emails_sent: por batch (ej: 50)
  - collection_executions.emails_sent: total ejecución (ej: 4200)
  - daily_sending_limits.emails_sent: por día (ej: 150)
  - email_reputation_profiles.total_emails_sent: histórico total (ej: 15000)';

COMMENT ON COLUMN daily_sending_limits.can_progress_to_next_day IS 
'Se establece en TRUE si las métricas de hoy cumplen los umbrales de engagement.
Uso: Decidir si el dominio puede aumentar su límite diario mañana.';

-- ============================================================================
-- 6. Reglas de Progresión Automática
-- ============================================================================
-- Define cuándo y cómo progresar en la estrategia de ramp-up.
-- NOTA: Configuración estática, no almacena métricas.
CREATE TABLE IF NOT EXISTS warmup_progression_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES delivery_strategies(id) ON DELETE CASCADE,
    
    -- Día de la estrategia (1, 2, 3, 4, 5, 6+)
    day_number INTEGER NOT NULL,
    
    -- Límite de envío para este día específico
    daily_limit INTEGER NOT NULL,
    
    -- Condiciones para progresar al siguiente día
    required_min_opens INTEGER, -- Mínimo absoluto de opens requeridos
    required_open_rate DECIMAL(5,2), -- % de opens requerido
    required_delivery_rate DECIMAL(5,2), -- % de delivery requerido
    max_bounce_rate DECIMAL(5,2), -- % máximo de bounce permitido
    
    -- Duración mínima en este nivel (horas)
    min_duration_hours INTEGER DEFAULT 24,
    
    -- Flags
    is_final_day BOOLEAN DEFAULT FALSE, -- Si es el día final (después de esto, modo normal)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_day_per_strategy UNIQUE (strategy_id, day_number)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_warmup_rules_strategy ON warmup_progression_rules(strategy_id);

COMMENT ON TABLE warmup_progression_rules IS 
'Reglas de progresión día a día en estrategias de ramp-up.
ALCANCE: Configuración estática de umbrales por día.
RELACIÓN: Pertenecen a delivery_strategies.
USO: Evaluar si un dominio puede progresar al siguiente nivel de warm-up.
NOTA: No contiene datos dinámicos, solo reglas de negocio.';

-- ============================================================================
-- Triggers para actualizar timestamps automáticamente
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas las tablas
CREATE TRIGGER update_reputation_profiles_updated_at
    BEFORE UPDATE ON email_reputation_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_strategies_updated_at
    BEFORE UPDATE ON delivery_strategies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_execution_batches_updated_at
    BEFORE UPDATE ON execution_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_queue_messages_updated_at
    BEFORE UPDATE ON batch_queue_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_sending_limits_updated_at
    BEFORE UPDATE ON daily_sending_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTAS DE CONSISTENCIA Y REPORTING
-- ============================================================================

-- Vista de reputación por dominio (resumen ejecutivo)
CREATE OR REPLACE VIEW email_reputation_summary AS
SELECT 
    erp.id,
    erp.business_id,
    erp.domain,
    erp.is_warmed_up,
    erp.current_warmup_day,
    erp.current_strategy,
    erp.daily_sending_limit,
    erp.delivery_rate,
    erp.open_rate,
    erp.bounce_rate,
    erp.complaint_rate,
    erp.has_reputation_issues,
    erp.total_emails_sent,
    erp.total_emails_delivered,
    erp.total_emails_opened,
    erp.created_at,
    erp.updated_at,
    b.name as business_name
FROM email_reputation_profiles erp
LEFT JOIN businesses b ON erp.business_id = b.id;

COMMENT ON VIEW email_reputation_summary IS 
'Vista resumen de reputación por dominio.
USO: Dashboard de reputación, alertas.
NOTA: Métricas son históricas acumuladas desde email_reputation_profiles.';

-- Vista de progreso de batches por ejecución (agregación de batches)
CREATE OR REPLACE VIEW execution_batch_progress AS
SELECT 
    eb.execution_id,
    ce.name as execution_name,
    ce.business_id,
    -- Conteos de batches
    COUNT(*) as total_batches,
    COUNT(*) FILTER (WHERE eb.status = 'pending') as pending_batches,
    COUNT(*) FILTER (WHERE eb.status = 'queued') as queued_batches,
    COUNT(*) FILTER (WHERE eb.status = 'processing') as processing_batches,
    COUNT(*) FILTER (WHERE eb.status = 'completed') as completed_batches,
    COUNT(*) FILTER (WHERE eb.status = 'failed') as failed_batches,
    -- Métricas agregadas (deben coincidir con collection_executions)
    SUM(eb.total_clients) as total_clients,
    SUM(eb.emails_sent) as emails_sent,
    SUM(eb.emails_delivered) as emails_delivered,
    SUM(eb.emails_opened) as emails_opened,
    SUM(eb.emails_bounced) as emails_bounced,
    -- Tasas calculadas
    CASE 
        WHEN SUM(eb.emails_sent) > 0 
        THEN ROUND((SUM(eb.emails_delivered)::numeric / SUM(eb.emails_sent)) * 100, 2)
        ELSE 0 
    END as delivery_rate,
    CASE 
        WHEN SUM(eb.emails_delivered) > 0 
        THEN ROUND((SUM(eb.emails_opened)::numeric / SUM(eb.emails_delivered)) * 100, 2)
        ELSE 0 
    END as open_rate,
    CASE 
        WHEN SUM(eb.emails_sent) > 0 
        THEN ROUND((SUM(eb.emails_bounced)::numeric / SUM(eb.emails_sent)) * 100, 2)
        ELSE 0 
    END as bounce_rate,
    -- Progreso
    ROUND(AVG(
        CASE WHEN eb.status = 'completed' THEN 100.0
             WHEN eb.status = 'processing' THEN 50.0
             ELSE 0.0
        END
    ), 2) as completion_percentage
FROM execution_batches eb
LEFT JOIN collection_executions ce ON eb.execution_id = ce.id
GROUP BY eb.execution_id, ce.name, ce.business_id;

COMMENT ON VIEW execution_batch_progress IS 
'Vista agregada de progreso por ejecución (calculada desde execution_batches).
USO: Validar consistencia con collection_executions.
RELACIÓN: Las métricas agregadas aquí DEBEN coincidir con collection_executions.*
Alerta: Si hay diferencias, indica inconsistencia de datos que requiere reconciliación.';

-- Vista de consistencia (detecta diferencias entre execution_batches y collection_executions)
CREATE OR REPLACE VIEW execution_metrics_consistency_check AS
SELECT 
    ce.id as execution_id,
    ce.name as execution_name,
    -- Métricas desde collection_executions (fuente actual)
    ce.emails_sent as exec_emails_sent,
    ce.emails_delivered as exec_emails_delivered,
    ce.emails_opened as exec_emails_opened,
    ce.emails_bounced as exec_emails_bounced,
    -- Métricas agregadas desde execution_batches (fuente esperada)
    COALESCE(ebp.emails_sent, 0) as batch_emails_sent,
    COALESCE(ebp.emails_delivered, 0) as batch_emails_delivered,
    COALESCE(ebp.emails_opened, 0) as batch_emails_opened,
    COALESCE(ebp.emails_bounced, 0) as batch_emails_bounced,
    -- Diferencias (deberían ser 0)
    ce.emails_sent - COALESCE(ebp.emails_sent, 0) as diff_sent,
    ce.emails_delivered - COALESCE(ebp.emails_delivered, 0) as diff_delivered,
    ce.emails_opened - COALESCE(ebp.emails_opened, 0) as diff_opened,
    ce.emails_bounced - COALESCE(ebp.emails_bounced, 0) as diff_bounced,
    -- Flag de consistencia
    CASE 
        WHEN ce.emails_sent = COALESCE(ebp.emails_sent, 0)
         AND ce.emails_delivered = COALESCE(ebp.emails_delivered, 0)
         AND ce.emails_opened = COALESCE(ebp.emails_opened, 0)
         AND ce.emails_bounced = COALESCE(ebp.emails_bounced, 0)
        THEN TRUE
        ELSE FALSE
    END as is_consistent
FROM collection_executions ce
LEFT JOIN execution_batch_progress ebp ON ce.id = ebp.execution_id
WHERE ce.status IN ('processing', 'completed', 'failed')
  AND ce.emails_sent > 0; -- Solo ejecuciones con actividad

COMMENT ON VIEW execution_metrics_consistency_check IS 
'VISTA CRÍTICA: Detecta inconsistencias entre collection_executions y execution_batches.
USO: Monitoreo de integridad de datos. Ejecutar periódicamente.
Acción: Si is_consistent = FALSE, ejecutar reconciliación de métricas.
Frecuencia recomendada: Cada 1 hora o después de finalizar ejecuciones grandes.';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE email_reputation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sending_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE warmup_progression_rules ENABLE ROW LEVEL SECURITY;

-- Policies para email_reputation_profiles
CREATE POLICY "Business can view own reputation profiles" 
    ON email_reputation_profiles FOR SELECT 
    USING (business_id = (
        (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
    ));

CREATE POLICY "Business can manage own reputation profiles" 
    ON email_reputation_profiles FOR ALL 
    USING (business_id = (
        (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
    ));

-- Policies para delivery_strategies
CREATE POLICY "Business can view own strategies" 
    ON delivery_strategies FOR SELECT 
    USING (business_id = (
        (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
    ));

CREATE POLICY "Business can manage own strategies" 
    ON delivery_strategies FOR ALL 
    USING (business_id = (
        (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
    ));

-- Policies para execution_batches
CREATE POLICY "Business can view batches of own executions" 
    ON execution_batches FOR SELECT 
    USING (execution_id IN (
        SELECT id FROM collection_executions WHERE business_id = (
            (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
        )
    ));

CREATE POLICY "Business can manage batches of own executions" 
    ON execution_batches FOR ALL 
    USING (execution_id IN (
        SELECT id FROM collection_executions WHERE business_id = (
            (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
        )
    ));

-- Policies para batch_queue_messages
CREATE POLICY "Business can view queue messages of own batches" 
    ON batch_queue_messages FOR SELECT 
    USING (batch_id IN (
        SELECT id FROM execution_batches WHERE execution_id IN (
            SELECT id FROM collection_executions WHERE business_id = (
                (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
            )
        )
    ));

-- Policies para daily_sending_limits
CREATE POLICY "Business can view own daily limits" 
    ON daily_sending_limits FOR SELECT 
    USING (reputation_profile_id IN (
        SELECT id FROM email_reputation_profiles WHERE business_id = (
            (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid
        )
    ));

-- ============================================================================
-- FUNCIÓN DE RECONCILIACIÓN DE MÉTRICAS
-- ============================================================================

-- Función para sincronizar métricas de collection_executions desde execution_batches
CREATE OR REPLACE FUNCTION reconcile_execution_metrics(p_execution_id UUID)
RETURNS TABLE (
    metric_name TEXT,
    old_value INTEGER,
    new_value INTEGER,
    updated BOOLEAN
) AS $$
DECLARE
    v_batch_metrics RECORD;
BEGIN
    -- Obtener métricas agregadas desde execution_batches
    SELECT 
        COALESCE(SUM(emails_sent), 0) as total_sent,
        COALESCE(SUM(emails_delivered), 0) as total_delivered,
        COALESCE(SUM(emails_opened), 0) as total_opened,
        COALESCE(SUM(emails_bounced), 0) as total_bounced
    INTO v_batch_metrics
    FROM execution_batches
    WHERE execution_id = p_execution_id;
    
    -- Calcular tasas
    UPDATE collection_executions
    SET 
        emails_sent = v_batch_metrics.total_sent,
        emails_delivered = v_batch_metrics.total_delivered,
        emails_opened = v_batch_metrics.total_opened,
        emails_bounced = v_batch_metrics.total_bounced,
        delivery_rate = CASE 
            WHEN v_batch_metrics.total_sent > 0 
            THEN (v_batch_metrics.total_delivered::numeric / v_batch_metrics.total_sent) * 100 
            ELSE 0 
        END,
        open_rate = CASE 
            WHEN v_batch_metrics.total_delivered > 0 
            THEN (v_batch_metrics.total_opened::numeric / v_batch_metrics.total_delivered) * 100 
            ELSE 0 
        END,
        bounce_rate = CASE 
            WHEN v_batch_metrics.total_sent > 0 
            THEN (v_batch_metrics.total_bounced::numeric / v_batch_metrics.total_sent) * 100 
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE id = p_execution_id;
    
    -- Retornar resultado
    RETURN QUERY
    SELECT 
        'emails_sent'::TEXT,
        0::INTEGER,
        v_batch_metrics.total_sent::INTEGER,
        TRUE::BOOLEAN
    UNION ALL
    SELECT 
        'emails_delivered'::TEXT,
        0::INTEGER,
        v_batch_metrics.total_delivered::INTEGER,
        TRUE::BOOLEAN
    UNION ALL
    SELECT 
        'emails_opened'::TEXT,
        0::INTEGER,
        v_batch_metrics.total_opened::INTEGER,
        TRUE::BOOLEAN
    UNION ALL
    SELECT 
        'emails_bounced'::TEXT,
        0::INTEGER,
        v_batch_metrics.total_bounced::INTEGER,
        TRUE::BOOLEAN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_execution_metrics IS 
'Reconcilia métricas de collection_executions desde execution_batches.
USO: Corregir inconsistencias detectadas por execution_metrics_consistency_check.
EJECUCIÓN: SELECT * FROM reconcile_execution_metrics(''uuid-execution'');
NOTA: Esta función es manual. Idealmente, las métricas se mantienen consistentes automáticamente.';

-- ============================================================================
-- Datos Iniciales: Estrategias Predeterminadas
-- ============================================================================

-- Insertar estrategia por defecto de Ramp-Up Gradual
INSERT INTO delivery_strategies (
    name,
    description,
    strategy_type,
    is_default,
    rampup_day_1_limit,
    rampup_day_2_limit,
    rampup_day_3_5_limit,
    rampup_day_6_plus_limit,
    batch_size,
    batch_interval_minutes,
    min_open_rate_threshold,
    min_delivery_rate_threshold,
    max_bounce_rate_threshold,
    max_complaint_rate_threshold
) VALUES (
    'Ramp-Up Gradual Estándar',
    'Estrategia conservadora para nuevos dominios. Incrementa volumen gradualmente mientras mantiene engagement positivo. Ideal para evitar spam filters.',
    'ramp_up',
    false,
    50,
    100,
    150,
    200,
    50,
    60,
    20.00,
    95.00,
    5.00,
    0.10
);

-- Insertar estrategia de Batch Agresivo
INSERT INTO delivery_strategies (
    name,
    description,
    strategy_type,
    is_default,
    batch_size,
    batch_interval_minutes,
    max_batches_per_day,
    concurrent_batches,
    min_open_rate_threshold,
    min_delivery_rate_threshold,
    max_bounce_rate_threshold
) VALUES (
    'Batch Procesamiento Alto Volumen',
    'Estrategia agresiva para dominios con reputación establecida. Permite envíos de alto volumen con batches grandes y paralelos.',
    'batch',
    false,
    500,
    30,
    100,
    5,
    15.00,
    97.00,
    3.00
);

-- Insertar estrategia Ultra Conservadora (para recuperación de reputación)
INSERT INTO delivery_strategies (
    name,
    description,
    strategy_type,
    is_default,
    rampup_day_1_limit,
    rampup_day_2_limit,
    rampup_day_3_5_limit,
    rampup_day_6_plus_limit,
    batch_size,
    batch_interval_minutes,
    min_open_rate_threshold,
    min_delivery_rate_threshold,
    max_bounce_rate_threshold,
    pause_on_high_bounce,
    pause_on_complaint
) VALUES (
    'Recuperación de Reputación',
    'Estrategia ultra conservadora para dominios con problemas de reputación. Enfocada en recuperar trust con ISPs mediante engagement extremadamente positivo.',
    'conservative',
    false,
    10,
    20,
    30,
    50,
    10,
    120,
    25.00,
    98.00,
    2.00,
    true,
    true
);

-- ============================================================================
-- Fin del Script
-- ============================================================================
