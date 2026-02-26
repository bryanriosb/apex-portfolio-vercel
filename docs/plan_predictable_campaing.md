# Plan Técnico: Sistema de Optimización Predictiva de Campañas (Predictable Campaign)

## Documento de Arquitectura y Estrategia de Implementación

**Versión:** 1.1  
**Fecha:** Febrero 2026  
**Estado:** Draft  
**Autor:** Senior Software Engineer  

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis del Sistema Actual](#2-análisis-del-sistema-actual)
3. [Estrategia de Cold Start](#3-estrategia-de-cold-start)
4. [Arquitectura de Datos para ML](#4-arquitectura-de-datos-para-ml)
5. [Estrategia de Modelos Predictivos](#5-estrategia-de-modelos-predictivos)
6. [Plan de Implementación](#6-plan-de-implementación)
7. [Esquemas de Base de Datos](#7-esquemas-de-base-de-datos)
8. [APIs y Servicios](#8-apis-y-servicios)
9. [Dashboard y Visualización](#9-dashboard-y-visualización)
10. [Métricas de Éxito](#10-métricas-de-éxito)
11. [Riesgos y Mitigaciones](#11-riesgos-y-mitigaciones)

---

## 1. Resumen Ejecutivo

### 1.1 Problemática

El sistema actual de envío de correos y notificaciones de cobro opera con reglas estáticas (horarios predefinidos, estrategias de ramp-up fijas) que no consideran patrones históricos de comportamiento por cliente ni por segmento. Esto resulta en:

- **Baja tasa de apertura** promedio (~20% actual)
- **Envíos en momentos subóptimos** sin considerar comportamiento histórico
- **Sin segmentación inteligente** basada en propensidad al pago
- **Sin aprendizaje automático** de patrones de engagement

### 1.2 Objetivo

Construir un sistema predictivo que determine automáticamente:

- **Mejor día de la semana** para cada cliente/segmento
- **Mejor hora del día** considerando timezone y patrones históricos
- **Frecuencia óptima** de contacto para evitar fatiga
- **Canal preferido** (email vs SMS vs WhatsApp) por cliente
- **Propensión al pago** para priorizar esfuerzos de cobro

### 1.3 Diferenciador Competitivo

La mayoría de competidores ofrecen:
- Programación básica por horarios fijos
- Segmentación manual por categorías
- Sin ML/AI integrado

Nuestro sistema ofrecerá:
- **ML en tiempo real** con aprendizaje continuo
- **Personalización individual** (no solo por segmentos)
- **Predicción de propensión al pago**
- **Optimización multi-objetivo** (apertura + pago + reputación)

### 1.4 Contexto Especial: Sistema Nuevo (Cold Start)

**Nota Crítica:** Este es un sistema nuevo sin datos históricos. No existe un backfill de datos pasados. La estrategia debe contemplar:

1. **Fase de Acumulación:** Los primeros días/semanas operarán con heurísticas de industria
2. **Transición Gradual:** A medida que se acumulan datos, transicionar de estadísticas simples a ML avanzado
3. **Umbrales Claros:** Definir exactamente cuándo hay "suficientes datos" para activar cada modelo

---

## 2. Análisis del Sistema Actual

### 2.1 Entidades y Datos Disponibles

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUENTES DE DATOS ACTUALES                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ collection_      │  │ collection_      │                     │
│  │ executions       │──│ clients          │                     │
│  │                  │  │                  │                     │
│  │ - business_id    │  │ - execution_id   │                     │
│  │ - status         │  │ - customer_id    │                     │
│  │ - scheduled_at   │  │ - invoices[]     │                     │
│  │ - open_rate      │  │ - custom_data    │                     │
│  │ - delivery_rate  │  │ - status         │                     │
│  │ - bounce_rate    │  │ - email_*_at     │  ◄── TIMESTAMPS    │
│  └──────────────────┘  └──────────────────┘      CRÍTICOS       │
│           │                     │                               │
│           │            ┌────────▼────────┐                      │
│           │            │ collection_     │                      │
│           └───────────►│ events          │                      │
│                        │                 │                      │
│                        │ - event_type    │  (delivered/opened/  │
│                        │ - event_data    │   bounced/clicked)   │
│                        │ - timestamp     │                      │
│                        └─────────────────┘                      │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ email_reputation │  │ execution_       │                     │
│  │ _profiles        │  │ batches          │                     │
│  │                  │  │                  │                     │
│  │ - domain         │  │ - scheduled_for  │  ◄── PROGRAMACIÓN   │
│  │ - total_*        │  │ - client_ids[]   │                     │
│  │ - *_rate         │  │ - metrics        │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ business_        │  │ customer_        │                     │
│  │ customers        │  │ categories       │                     │
│  │                  │  │                  │                     │
│  │ - status         │  │ - segmentación   │                     │
│  │ - tags[]         │  │   base           │                     │
│  │ - preferences    │  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Datos Críticos para ML

**Datos Temporales:**
- `email_sent_at`: Timestamp de envío
- `email_delivered_at`: Timestamp de entrega
- `email_opened_at`: Timestamp de apertura
- `scheduled_for`: Programación del batch
- `timestamp` (events): Precisión al milisegundo

**Datos de Engagement:**
- Eventos: delivered, opened, bounced, clicked, complained
- Tasas calculadas: open_rate, delivery_rate, bounce_rate
- Métricas por batch y por ejecución

**Datos de Cliente:**
- `invoices[]`: Montos, fechas de vencimiento, estado de pago
- `custom_data`: Variables personalizadas por negocio
- `tags[]`: Categorización flexible
- `status`: active/inactive/vip/blocked

### 2.3 Limitaciones Actuales

1. **No hay tabla de engagement por cliente**: No se trackean métricas históricas por customer_id
2. **No hay análisis temporal**: No se analizan patrones por día/hora
3. **Segmentación básica**: Solo por customer_categories, no por comportamiento
4. **Sin predicción**: Decisiones basadas en reglas estáticas

---

## 3. Estrategia de Cold Start

### 3.1 Definición del Problema

Como el sistema es nuevo, no hay datos históricos disponibles. Esto significa que:

- **No hay backfill**: No se puede usar datos pasados para entrenar modelos
- **Cold Start completo**: Todo se debe construir desde cero
- **Transición progresiva**: De heurísticas → estadísticas → ML avanzado

### 3.2 Estrategia de Datos por Fase

```
TIEMPO
  │
  │ Semana 1-2          Semana 3-6          Semana 7-12         Semana 13+
  │ (ACUMULACIÓN)       (ANÁLISIS)          (ML BÁSICO)         (ML AVANZADO)
  │
  │ ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ │ 0 emails    │────▶│ 50-200      │────▶│ 200-500     │────▶│ 500+ emails │
  │ │ datos       │     │ emails      │     │ emails      │     │ por negocio │
  │ │             │     │ por negocio │     │ por negocio │     │             │
  │ └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
  │
  │ ESTRATEGIA:
  │ ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ │ HEURÍSTICAS │────▶│ ESTADÍSTICAS│────▶│ ML SIMPLE   │────▶│ XGBOOST/    │
  │ │ INDUSTRIA   │     │ BÁSICAS     │     │ (Regresión) │     │ CLUSTERING  │
  │ └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
  │
  │ CONFIANZA:
  │ ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ │ 30%         │────▶│ 50%         │────▶│ 70%         │────▶│ 85%+        │
  │ │ "Basado en  │     │ "Basado en  │     │ "Basado en  │     │ "Datos      │
  │ │  mejores    │     │  datos      │     │  ML"        │     │  propios"   │
  │ │  prácticas" │     │  iniciales" │     │             │     │             │
  │ └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 3.3 Heurísticas de Industria (Fallback)

Mientras no haya datos suficientes, usar mejores prácticas probadas:

```typescript
// lib/ml/heuristics/industry-defaults.ts

export const IndustryDefaults = {
  // Basado en estudios de email marketing B2B en Latinoamérica
  temporal: {
    bestDays: [1, 2, 3], // Lun-Mar-Mié (martes es el mejor)
    bestHours: [9, 10, 14, 15], // 9-10 AM y 2-3 PM
    avoidWeekends: true,
    timezone: 'America/Bogota',
    rationale: 'Basado en estudios de email marketing B2B'
  },
  
  // Estrategia inicial conservadora
  strategy: {
    type: 'batch' as const,
    batchSize: 50,
    batchIntervalMinutes: 120, // 2 horas entre batches
    maxBatchesPerDay: 4,
    rationale: 'Conservador mientras se acumulan datos de reputación'
  },
  
  // Segmentación básica inicial
  segments: {
    highValue: {
      minInvoiceAmount: 1000000, // $1M COP
      priority: 'high',
      contactFrequency: 'weekly'
    },
    standard: {
      priority: 'medium',
      contactFrequency: 'biweekly'
    }
  }
}

// Función para obtener recomendación según disponibilidad de datos
export function getRecommendationStrategy(
  businessId: string,
  dataStats: DataAvailabilityStats
): RecommendationStrategy {
  if (dataStats.totalEmails < 50) {
    return {
      type: 'heuristic',
      confidence: 30,
      source: 'industry_benchmarks',
      message: 'Usando mejores prácticas de la industria mientras acumulamos datos'
    }
  }
  
  if (dataStats.totalEmails < 200) {
    return {
      type: 'statistical',
      confidence: 50,
      source: 'initial_data_analysis',
      message: 'Basado en datos iniciales (análisis estadístico simple)'
    }
  }
  
  if (dataStats.totalEmails < 500) {
    return {
      type: 'ml_basic',
      confidence: 70,
      source: 'linear_regression_model',
      message: 'Usando modelo predictivo básico'
    }
  }
  
  return {
    type: 'ml_advanced',
    confidence: 85,
    source: 'xgboost_ensemble',
    message: 'Optimizado con IA basado en datos históricos'
  }
}
```

### 3.4 Umbrales de Activación de ML

Definir exactamente cuándo cada feature de ML se activa:

```typescript
// lib/ml/config/activation-thresholds.ts

export const MLActivationThresholds = {
  // Modelo Temporal (mejor día/hora)
  temporalOptimization: {
    minEmailsPerBusiness: 50,
    minOpenEvents: 10,
    minDaysOfData: 7,
    minConfidence: 0.6,
    requiredDataQuality: 'sufficient_variation' // Al menos 3 días diferentes, 4 horas diferentes
  },
  
  // Propensión al Pago
  paymentPropensity: {
    minCustomers: 30,
    minPaymentEvents: 15, // Clientes que han pagado al menos una vez
    minDaysOfData: 14, // Necesitamos ver ciclo completo de pagos
    minInvoiceAmountVariation: true // Diferentes montos de factura
  },
  
  // Segmentación Automática (Clustering)
  autoSegmentation: {
    minCustomers: 50,
    minEngagementEvents: 100, // Aperturas + clicks + pagos
    minSegmentSeparation: 0.3, // Silhouette score mínimo
    minDaysOfData: 21 // 3 semanas para ver patrones semanales
  },
  
  // Feedback Loop Activo
  feedbackLoop: {
    minPredictionsMade: 100,
    minActualResults: 50, // Con resultados conocidos (emails abiertos/pagados)
    maxPredictionAge: 30 // Días máximo para considerar una predicción
  }
}

// Función para verificar si un negocio puede usar una feature
export function canUseMLFeature(
  feature: keyof typeof MLActivationThresholds,
  businessId: string,
  stats: BusinessDataStats
): { canUse: boolean; reason?: string; missingRequirements?: string[] } {
  const threshold = MLActivationThresholds[feature]
  const missing: string[] = []
  
  if (threshold.minEmailsPerBusiness && stats.totalEmails < threshold.minEmailsPerBusiness) {
    missing.push(`Necesita ${threshold.minEmailsPerBusiness} emails (tiene ${stats.totalEmails})`)
  }
  
  if (threshold.minOpenEvents && stats.totalOpens < threshold.minOpenEvents) {
    missing.push(`Necesita ${threshold.minOpenEvents} aperturas (tiene ${stats.totalOpens})`)
  }
  
  if (threshold.minDaysOfData && stats.daysOfData < threshold.minDaysOfData) {
    missing.push(`Necesita ${threshold.minDaysOfData} días de datos (tiene ${stats.daysOfData})`)
  }
  
  if (threshold.minCustomers && stats.totalCustomers < threshold.minCustomers) {
    missing.push(`Necesita ${threshold.minCustomers} clientes (tiene ${stats.totalCustomers})`)
  }
  
  return {
    canUse: missing.length === 0,
    reason: missing.length === 0 ? undefined : 'Datos insuficientes',
    missingRequirements: missing.length > 0 ? missing : undefined
  }
}
```

### 3.5 Proceso de Acumulación de Datos

**Semanas 1-2: Fase Exploratoria Intencional**

```typescript
// Estrategia: Enviar en horarios VARIADOS intencionalmente
// para generar diversidad de datos rápidamente

export const ExploratorySchedule = {
  // Distribuir emails en diferentes slots temporales
  // para descubrir qué funciona para cada negocio
  slots: [
    { day: 1, hour: 9,  label: 'mon_morning_early', distribution: 0.15 },
    { day: 1, hour: 11, label: 'mon_morning_late', distribution: 0.15 },
    { day: 2, hour: 10, label: 'tue_mid_morning', distribution: 0.20 },
    { day: 2, hour: 14, label: 'tue_afternoon', distribution: 0.15 },
    { day: 3, hour: 9,  label: 'wed_morning', distribution: 0.15 },
    { day: 4, hour: 15, label: 'thu_late_afternoon', distribution: 0.20 }
  ],
  
  duration: 14, // días
  rationale: 'Distribución estratégica para maximizar aprendizaje inicial'
}
```

### 3.6 Estados del Sistema en UI

Comunicar claramente al usuario el estado del sistema:

```typescript
// Estados posibles del motor predictivo
export enum PredictiveEngineStatus {
  // Fase 1: Sin datos (0-50 emails)
  COLD_START = 'cold_start',
  MESSAGE_COLD_START: 'Iniciando: usando mejores prácticas del sector',
  
  // Fase 2: Datos iniciales (50-200 emails)
  LEARNING = 'learning',
  MESSAGE_LEARNING: 'Aprendiendo: analizando patrones iniciales',
  
  // Fase 3: Suficientes datos para ML básico (200-500 emails)
  ACTIVE_BASIC = 'active_basic',
  MESSAGE_ACTIVE_BASIC: 'Activo: optimizaciones basadas en datos',
  
  // Fase 4: Datos abundantes (500+ emails)
  ACTIVE_ADVANCED = 'active_advanced',
  MESSAGE_ACTIVE_ADVANCED: 'Optimizado: usando IA avanzada'
}

// Componente UI
export function PredictiveEngineStatusBadge({ businessId }: { businessId: string }) {
  const { status, stats } = usePredictiveEngineStatus(businessId)
  
  const config = {
    [PredictiveEngineStatus.COLD_START]: {
      color: 'yellow',
      icon: '🌱',
      tooltip: `Acumulando datos: ${stats.totalEmails}/50 emails enviados`
    },
    [PredictiveEngineStatus.LEARNING]: {
      color: 'blue',
      icon: '📊',
      tooltip: `Analizando: ${stats.totalOpens} aperturas registradas`
    },
    [PredictiveEngineStatus.ACTIVE_BASIC]: {
      color: 'green',
      icon: '🤖',
      tooltip: 'ML activo con modelo básico'
    },
    [PredictiveEngineStatus.ACTIVE_ADVANCED]: {
      color: 'purple',
      icon: '✨',
      tooltip: 'IA avanzada activa'
    }
  }
  
  return <StatusBadge {...config[status]} />
}
```

---

## 4. Arquitectura de Datos para ML

### 4.1 Nuevas Tablas Requeridas

**Nota Importante:** Estas tablas se crean vacías y se van poblando incrementalmente a medida que el sistema opera.

#### 4.1.1 `customer_engagement_patterns`

Almacena patrones de comportamiento por cliente calculados periódicamente.

```sql
CREATE TABLE customer_engagement_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    customer_id UUID NOT NULL REFERENCES business_customers(id),
    
    -- Ventana de análisis
    analysis_window_start DATE NOT NULL,
    analysis_window_end DATE NOT NULL,
    
    -- Métricas agregadas de engagement
    total_emails_received INTEGER DEFAULT 0,
    total_emails_opened INTEGER DEFAULT 0,
    total_emails_clicked INTEGER DEFAULT 0,
    total_emails_bounced INTEGER DEFAULT 0,
    
    -- Tasas calculadas
    open_rate NUMERIC(5,2) DEFAULT 0,
    click_rate NUMERIC(5,2) DEFAULT 0,
    engagement_score NUMERIC(5,2) DEFAULT 0, -- Fórmula ponderada
    
    -- Patrones temporales (JSONB para flexibilidad)
    best_day_patterns JSONB DEFAULT '{}', -- {"monday": 0.35, "tuesday": 0.42, ...}
    best_hour_patterns JSONB DEFAULT '{}', -- {"09": 0.15, "10": 0.28, ...}
    timezone VARCHAR(50) DEFAULT 'America/Bogota',
    
    -- Propensión al pago (0-100)
    payment_propensity_score NUMERIC(5,2) DEFAULT 50,
    days_to_payment_avg INTEGER, -- Promedio de días hasta pago
    
    -- Segmentación ML
    customer_segment VARCHAR(50), -- 'high_engagement', 'at_risk', 'dormant', etc.
    churn_risk_score NUMERIC(5,2) DEFAULT 0,
    
    -- Metadatos
    model_version VARCHAR(20) DEFAULT 'v1.0',
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, customer_id, analysis_window_end)
);

-- Índices críticos
CREATE INDEX idx_cust_engagement_business ON customer_engagement_patterns(business_id);
CREATE INDEX idx_cust_engagement_customer ON customer_engagement_patterns(customer_id);
CREATE INDEX idx_cust_engagement_segment ON customer_engagement_patterns(business_id, customer_segment);
CREATE INDEX idx_cust_engagement_score ON customer_engagement_patterns(engagement_score DESC);
```

#### 4.1.2 `temporal_performance_metrics`

Métricas de performance por franjas temporales (día/hora) a nivel de negocio.

```sql
CREATE TABLE temporal_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    
    -- Dimensión temporal
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo
    hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    
    -- Métricas acumuladas
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    
    -- Tasas calculadas
    delivery_rate NUMERIC(5,2) DEFAULT 0,
    open_rate NUMERIC(5,2) DEFAULT 0,
    click_rate NUMERIC(5,2) DEFAULT 0,
    bounce_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Puntuación compuesta (0-100)
    effectiveness_score NUMERIC(5,2) DEFAULT 0,
    
    -- Ventana de datos
    data_points_count INTEGER DEFAULT 0, -- Número de registros usados
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(business_id, day_of_week, hour_of_day)
);

CREATE INDEX idx_temporal_metrics_business ON temporal_performance_metrics(business_id);
CREATE INDEX idx_temporal_metrics_score ON temporal_performance_metrics(business_id, effectiveness_score DESC);
CREATE INDEX idx_temporal_metrics_day_hour ON temporal_performance_metrics(business_id, day_of_week, hour_of_day);
```

#### 4.1.3 `campaign_predictions`

Predicciones y recomendaciones para campañas futuras.

```sql
CREATE TABLE campaign_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    
    -- Identificación de la predicción
    prediction_type VARCHAR(50) NOT NULL, -- 'optimal_time', 'segment_sizing', 'channel_mix'
    prediction_for_date DATE, -- Para qué fecha es la predicción (opcional)
    
    -- Recomendaciones
    recommended_day_of_week INTEGER CHECK (recommended_day_of_week BETWEEN 0 AND 6),
    recommended_hour_start INTEGER CHECK (recommended_hour_start BETWEEN 0 AND 23),
    recommended_hour_end INTEGER CHECK (recommended_hour_end BETWEEN 0 AND 23),
    recommended_strategy VARCHAR(20), -- 'ramp_up', 'batch', 'aggressive'
    
    -- Predicciones cuantitativas
    predicted_open_rate NUMERIC(5,2),
    predicted_delivery_rate NUMERIC(5,2),
    predicted_response_rate NUMERIC(5,2),
    confidence_score NUMERIC(5,2) DEFAULT 0, -- 0-100, confianza del modelo
    
    -- Segmentos recomendados
    recommended_segments JSONB DEFAULT '[]', -- ["high_engagement", "at_risk"]
    
    -- Feature importance (para explicabilidad)
    feature_importance JSONB DEFAULT '{}', -- {"day_of_week": 0.35, "customer_segment": 0.28}
    
    -- Metadatos del modelo
    model_version VARCHAR(20) DEFAULT 'v1.0',
    model_name VARCHAR(100), -- 'heuristic', 'statistical', 'linear_regression', 'xgboost'
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Las predicciones expiran
    
    -- Feedback loop
    actual_open_rate NUMERIC(5,2), -- Se actualiza post-campaña
    actual_response_rate NUMERIC(5,2),
    prediction_accuracy NUMERIC(5,2), -- Diferencia predicción vs realidad
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_pred_business ON campaign_predictions(business_id);
CREATE INDEX idx_campaign_pred_type ON campaign_predictions(business_id, prediction_type);
CREATE INDEX idx_campaign_pred_date ON campaign_predictions(prediction_for_date);
CREATE INDEX idx_campaign_pred_confidence ON campaign_predictions(confidence_score DESC);
```

#### 4.1.4 `ml_model_configs`

Configuración y versionado de modelos ML.

```sql
CREATE TABLE ml_model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    model_type VARCHAR(50) NOT NULL, -- 'temporal_optimization', 'engagement_prediction', 'payment_propensity'
    
    -- Configuración
    features_used JSONB NOT NULL, -- ["day_of_week", "hour_of_day", "customer_segment"]
    hyperparameters JSONB DEFAULT '{}',
    
    -- Métricas de performance del modelo
    training_accuracy NUMERIC(5,2),
    validation_accuracy NUMERIC(5,2),
    f1_score NUMERIC(5,2),
    auc_roc NUMERIC(5,2),
    
    -- Estado
    is_active BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    training_completed_at TIMESTAMPTZ,
    
    -- Metadatos
    training_data_size INTEGER,
    training_duration_seconds INTEGER,
    created_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(model_name, model_version)
);

CREATE INDEX idx_ml_model_type ON ml_model_configs(model_type);
CREATE INDEX idx_ml_model_active ON ml_model_configs(is_active);
```

#### 4.1.5 `prediction_feedback_logs`

Feedback loop para mejorar modelos continuamente.

```sql
CREATE TABLE prediction_feedback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id),
    
    -- Referencia a la predicción
    prediction_id UUID REFERENCES campaign_predictions(id),
    model_version VARCHAR(20) NOT NULL,
    
    -- Contexto
    execution_id UUID REFERENCES collection_executions(id),
    prediction_type VARCHAR(50) NOT NULL,
    
    -- Predicción vs Realidad
    predicted_value NUMERIC(10,4) NOT NULL,
    actual_value NUMERIC(10,4),
    prediction_error NUMERIC(10,4), -- actual - predicted
    
    -- Features usadas (para análisis de drift)
    feature_values JSONB,
    
    -- Metadatos
    feedback_received_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pred_feedback_business ON prediction_feedback_logs(business_id);
CREATE INDEX idx_pred_feedback_model ON prediction_feedback_logs(model_version);
CREATE INDEX idx_pred_feedback_error ON prediction_feedback_logs(prediction_error);
```

### 4.2 Proceso de Población Incremental

Las tablas se van llenando automáticamente a medida que ocurren eventos:

```typescript
// lib/services/ml/data-accumulator.ts

export class DataAccumulator {
  // Se ejecuta CADA VEZ que hay un evento de email (webhook)
  static async onEmailEvent(event: EmailEvent) {
    const supabase = await getSupabaseAdminClient()
    
    // 1. Actualizar o crear customer_engagement_patterns
    await this.upsertCustomerEngagement(event)
    
    // 2. Actualizar temporal_performance_metrics
    await this.updateTemporalMetrics(event)
    
    // 3. Verificar si se alcanzó umbral para activar ML
    await this.checkMLActivationThresholds(event.business_id)
  }
  
  private static async upsertCustomerEngagement(event: EmailEvent) {
    // UPSERT: Insertar si no existe, actualizar si existe
    // Recalcular tasas con los nuevos datos
  }
  
  private static async updateTemporalMetrics(event: EmailEvent) {
    // Incrementar contadores para el slot (day_of_week, hour_of_day)
    // Recalcular tasas
  }
  
  private static async checkMLActivationThresholds(businessId: string) {
    // Verificar si este negocio ahora puede usar ML
    // Si sí, actualizar flag y notificar
  }
}
```

### 4.3 Job de Recálculo Periódico

```typescript
// lib/jobs/daily-engagement-calc.ts
// Ejecutar cada 6 horas

export async function dailyEngagementRecalculation() {
  const supabase = await getSupabaseAdminClient()
  
  // Recalcular engagement patterns para clientes con actividad reciente
  const { data: activeCustomers } = await supabase
    .from('collection_clients')
    .select('customer_id, business_id')
    .gte('updated_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
    .not('customer_id', 'is', null)
    .distinct()
  
  for (const customer of activeCustomers || []) {
    await recalculateCustomerEngagement(customer.customer_id)
  }
}
```

---

## 5. Estrategia de Modelos Predictivos

### 5.1 Arquitectura de ML Evolutiva

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA ML EVOLUTIVA                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DATA LAYER (Siempre Activo)                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │  │
│  │  │   Eventos    │  │   Clientes   │  │  Ejecuciones │          │  │
│  │  │   (Nuevos)   │  │   (Nuevos)   │  │   (Nuevas)   │          │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │  │
│  │         └─────────────────┼─────────────────┘                   │  │
│  │                           ▼                                     │  │
│  │              ┌──────────────────────────┐                       │  │
│  │              │   DATA ACCUMULATOR       │                       │  │
│  │              │   (Siempre activo)       │                       │  │
│  │              └────────────┬─────────────┘                       │  │
│  └───────────────────────────┼─────────────────────────────────────┘  │
│                              │                                       │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              FEATURE STORE (Se construye gradualmente)         │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │  │
│  │  │ customer_       │  │ temporal_       │  │ campaign_      │ │  │
│  │  │ engagement_     │  │ performance_    │  │ predictions    │ │  │
│  │  │ patterns        │  │ metrics         │  │                │ │  │
│  │  └─────────────────┘  └─────────────────┘  └────────────────┘ │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │                                       │
│          ┌───────────────────┼───────────────────┐                   │
│          │                   │                   │                   │
│          ▼                   ▼                   ▼                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐             │
│  │ FASE 1       │   │ FASE 2       │   │ FASE 3       │             │
│  │ (0-50        │   │ (50-500      │   │ (500+        │             │
│  │  emails)     │   │  emails)     │   │  emails)     │             │
│  │              │   │              │   │              │             │
│  │ HEURÍSTICAS  │──▶│ ESTADÍSTICAS │──▶│ ML AVANZADO  │             │
│  │              │   │              │   │              │             │
│  │ • Industry   │   │ • Promedios  │   │ • XGBoost    │             │
│  │   defaults   │   │ • Tendencias │   │ • Clustering │             │
│  │ • Best       │   │ • Regresión  │   │ • Neural Net │             │
│  │   practices  │   │   lineal     │   │              │             │
│  └──────────────┘   └──────────────┘   └──────────────┘             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Modelos por Fase

#### FASE 1: Heurísticas de Industria (0-50 emails)

**No hay ML aún.** Usar reglas basadas en estudios de email marketing:

```typescript
// lib/ml/heuristics/temporal-heuristics.ts

export function getHeuristicRecommendation(): TemporalRecommendation {
  return {
    // Datos de estudio: "The Best Time to Send Emails" - Litmus 2024
    bestDay: 2, // Martes
    bestHour: 10, // 10 AM
    confidence: 30,
    reasoning: [
      'Martes tiene 18% mejor tasa de apertura que promedio semanal',
      '10 AM captura audiencia en horario laboral temprano',
      'Evitar lunes (alta carga de inbox) y viernes (fin de semana)'
    ],
    source: 'industry_benchmark_2024'
  }
}
```

**Requisitos:** Ninguno. Funciona desde el día 1.

#### FASE 2: Análisis Estadístico (50-500 emails)

**Modelos simples** con los datos acumulados:

```typescript
// lib/ml/statistical/temporal-stats.ts

export function calculateStatisticalRecommendation(
  metrics: TemporalPerformanceMetrics[]
): TemporalRecommendation {
  // 1. Agrupar por (day_of_week, hour_of_day)
  const bySlot = groupBy(metrics, m => `${m.day_of_week}_${m.hour_of_day}`)
  
  // 2. Calcular score para cada slot
  const scoredSlots = Object.entries(bySlot).map(([slot, data]) => ({
    slot,
    score: calculateWeightedScore(data), // 40% open + 40% delivery - 20% bounce
    sampleSize: data.length,
    confidence: Math.min(70, 30 + data.length * 0.5) // Más datos = más confianza
  }))
  
  // 3. Seleccionar mejor slot
  const best = scoredSlots.sort((a, b) => b.score - a.score)[0]
  
  return {
    bestSlot: best.slot,
    confidence: best.confidence,
    reasoning: [
      `Basado en ${best.sampleSize} envíos`,
      `Open rate promedio: ${best.avgOpenRate}%`,
      `Día ${best.day} a las ${best.hour}:00`
    ],
    source: 'statistical_analysis'
  }
}
```

**Requisitos:** Mínimo 50 emails enviados, distribuidos en al menos 3 días y 3 horarios diferentes.

#### FASE 3: ML Avanzado (500+ emails)

**XGBoost** para predicciones sofisticadas:

```typescript
// lib/ml/models/xgboost-temporal.ts

import * as xgboost from 'xgboost' // o similar

export class XGBoostTemporalModel {
  private model: any
  
  async train(trainingData: TrainingSample[]) {
    // Features: [day_of_week_sin, day_of_week_cos, hour_sin, hour_cos, 
    //           customer_segment_encoded, days_since_last_email, invoice_amount]
    // Target: email_opened (0/1)
    
    this.model = await xgboost.train({
      data: trainingData,
      objective: 'binary:logistic',
      max_depth: 6,
      learning_rate: 0.1,
      n_estimators: 100
    })
  }
  
  predict(features: FeatureVector): Prediction {
    const probability = this.model.predict(features)
    return {
      willOpen: probability > 0.5,
      probability,
      confidence: this.calculateConfidence(features)
    }
  }
}
```

**Requisitos:** 
- 500+ emails enviados
- 100+ aperturas (para balance de clases)
- Datos de al menos 30 días
- Mínimo 50 clientes diferentes

### 5.3 Feature Engineering

#### Features Temporales

```typescript
interface TemporalFeatures {
  // Básicas
  dayOfWeek: number;        // 0-6
  hourOfDay: number;        // 0-23
  isWeekend: boolean;
  isBusinessHour: boolean;  // 9-17
  
  // Cíclicas (importante para ML)
  hourSin: number;          // sin(2π * hour / 24)
  hourCos: number;          // cos(2π * hour / 24)
  dayOfWeekSin: number;     // sin(2π * day / 7)
  dayOfWeekCos: number;     // cos(2π * day / 7)
  
  // Históricas (cuando hay datos suficientes)
  historicalOpenRateByHour: Record<number, number>;
  historicalOpenRateByDay: Record<number, number>;
}
```

#### Features de Cliente

```typescript
interface CustomerFeatures {
  // Estáticas
  customerStatus: 'active' | 'vip' | 'inactive' | 'blocked';
  daysAsCustomer: number;
  
  // Comportamentales (acumuladas)
  totalEmailsReceived: number;
  overallOpenRate: number;
  daysSinceLastOpen: number;
  engagementTrend: 'improving' | 'stable' | 'declining';
  
  // De facturas
  totalOverdueAmount: number;
  daysOverdue: number;
  historicalDaysToPayment: number;
}
```

---

## 6. Plan de Implementación

### 6.1 Fases de Desarrollo (Actualizado para Cold Start)

#### FASE 1: Foundation + Cold Start (Semanas 1-3)

**Objetivo:** Preparar infraestructura y empezar a acumular datos.

**Tareas:**

1. **DB Schema (P0):**
   - Crear tablas ML (vacías inicialmente)
   - Implementar triggers para acumulación automática
   - Configurar índices optimizados
   
2. **Data Accumulator (P0):**
   - Servicio que escucha eventos de email
   - Actualización incremental de métricas
   - Verificación de umbrales ML
   
3. **Heurísticas de Industria (P0):**
   - Implementar reglas por defecto
   - Documentar fuentes (estudios de email marketing)
   - UI que muestre "Usando mejores prácticas"
   
4. **A/B Testing Exploratorio (P1):**
   - Enviar intencionalmente en horarios variados
   - Generar diversidad de datos rápidamente
   - Documentar estrategia de exploración

**Entregables:**
- Tablas ML creadas y vacías
- Sistema acumulando datos desde el día 1
- UI con indicador de estado "Acumulando datos: X/50 emails"

**Métricas de éxito:**
- 100% de eventos trackeados
- 0 pérdida de datos
- Sistema funcional desde día 1 (con heurísticas)

#### FASE 2: Análisis Estadístico (Semanas 4-8)

**Objetivo:** Activar análisis cuando se alcancen 50+ emails por negocio.

**Tareas:**

1. **Motor Estadístico (P0):**
   - Calcular promedios por franjas temporales
   - Identificar tendencias simples
   - Generar recomendaciones basadas en datos propios
   
2. **Activación Automática (P0):**
   - Detectar cuando negocio alcanza 50 emails
   - Cambiar estado de "cold_start" a "learning"
   - Notificar a usuario: "Ahora estamos aprendiendo de tus datos"
   
3. **Dashboard Básico (P1):**
   - Mostrar métricas acumuladas
   - Heatmap simple de performance
   - Comparación vs heurísticas de industria

**Entregables:**
- Motor estadístico funcionando
- Dashboard con datos reales (para negocios con +50 emails)
- Transición automática heurísticas → estadísticas

**Métricas de éxito:**
- 50% de negocios activos con >50 emails en 4 semanas
- Mejora de 5% en open rate vs heurísticas puras

#### FASE 3: ML Básico (Semanas 9-14)

**Objetivo:** Activar ML simple cuando se alcancen 200+ emails.

**Tareas:**

1. **Modelo Regresión Lineal (P0):**
   - Predecir probabilidad de apertura
   - Features: día, hora, segmento, días desde último contacto
   - Entrenamiento automático semanal
   
2. **Segmentación Automática Básica (P1):**
   - Clasificar clientes en 3-4 grupos simples
   - Basado en: open rate + días a pago
   
3. **Activación Progresiva (P0):**
   - Negocios con 200-500 emails usan ML básico
   - Negocios con <200 siguen en estadísticas
   - UI muestra nivel actual: "Optimizado con IA"

**Entregables:**
- Modelo de regresión entrenado y sirviendo predicciones
- Segmentación automática funcionando
- Sistema de feedback loop básico

**Métricas de éxito:**
- 30% de negocios usando ML básico
- Precisión de predicción: ±8% vs realidad
- Mejora de 12% en open rate vs Fase 1

#### FASE 4: ML Avanzado (Semanas 15-20)

**Objetivo:** Activar XGBoost y clustering cuando se alcancen 500+ emails.

**Tareas:**

1. **XGBoost Temporal (P0):**
   - Reemplazar regresión lineal con XGBoost
   - Feature engineering avanzado
   - Hyperparameter tuning
   
2. **Clustering Automático (P0):**
   - K-Means con 5+ segmentos
   - Análisis de características por segmento
   - Recomendaciones por segmento
   
3. **Propensión al Pago (P1):**
   - Modelo de clasificación para probabilidad de pago
   - Priorización automática de clientes
   
4. **Feedback Loop Completo (P0):**
   - Comparar predicciones vs realidad
   - Retraining automático mensual
   - Alertas de degradación de modelo

**Entregables:**
- XGBoost en producción para negocios con +500 emails
- Segmentación automática con 5+ grupos
- Dashboard de performance del modelo

**Métricas de éxito:**
- 20% de negocios usando ML avanzado
- AUC-ROC > 0.75 para modelo temporal
- Mejora de 20% en open rate vs Fase 1

#### FASE 5: Producción y Escalado (Semanas 21-24)

**Objetivo:** Optimizar, monitorear y documentar.

**Tareas:**
1. Performance y caching
2. Monitoreo de salud del ML
3. Documentación completa
4. Runbooks de operaciones

### 6.2 Timeline Actualizado

```
Semana:     1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24
           ├──────────────────────────────────────────────────────────────────────────┤

FASE 1:    ████████
  DB Schema    ██████
  Data Accum.    ████████
  Heuristics      ██████
  A/B Explore        ████

FASE 2:             ████████████
  Stats Engine         ████████
  Auto-Activate            ████████
  Dashboard Basic             ████

FASE 3:                         ████████████████
  Linear Regression                ████████
  Basic Segmentation                  ████████
  Feedback Loop                          ████████

FASE 4:                                         ████████████████████
  XGBoost                                          ████████
  Clustering                                          ████████
  Payment Propensity                                     ████████
  Feedback Loop Complete                                    ████████

FASE 5:                                                             ████████
  Performance                                                          ████
  Monitoring                                                             ████
  Docs                                                                      ████

DATOS:     [HEURÍSTICAS]────▶[ESTADÍSTICAS]────▶[ML BÁSICO]────▶[ML AVANZADO]
           0-50 emails      50-200 emails      200-500 emails   500+ emails
```

### 6.3 Estados del Sistema por Negocio

```typescript
// Cada negocio progresa independientemente según sus datos

interface BusinessMLEvolution {
  businessId: string
  currentPhase: 'cold_start' | 'learning' | 'ml_basic' | 'ml_advanced'
  
  stats: {
    totalEmails: number
    totalOpens: number
    daysOfData: number
    uniqueCustomers: number
  }
  
  // Qué features están activas
  activeFeatures: {
    temporalOptimization: boolean
    autoSegmentation: boolean
    paymentPropensity: boolean
    feedbackLoop: boolean
  }
  
  // Recomendaciones según fase actual
  currentStrategy: RecommendationStrategy
}

// Ejemplo de progresión:
// Negocio A: 0 emails → cold_start → heurísticas
// Negocio B: 150 emails → learning → estadísticas
// Negocio C: 600 emails → ml_advanced → XGBoost
```

---

## 7. Esquemas de Base de Datos - Detalle Completo

### 7.1 Triggers para Acumulación Automática

```sql
-- Trigger para actualizar métricas en tiempo real
CREATE OR REPLACE FUNCTION accumulate_email_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo procesar cuando hay un cambio de estado significativo
    IF OLD.status IS DISTINCT FROM NEW.status AND 
       NEW.status IN ('sent', 'delivered', 'opened', 'bounced') THEN
        
        -- Obtener business_id de la ejecución
        DECLARE
            v_business_id UUID;
            v_day_of_week INTEGER;
            v_hour_of_day INTEGER;
        BEGIN
            SELECT business_id INTO v_business_id
            FROM collection_executions
            WHERE id = NEW.execution_id;
            
            v_day_of_week := EXTRACT(DOW FROM NEW.email_sent_at);
            v_hour_of_day := EXTRACT(HOUR FROM NEW.email_sent_at);
            
            -- Actualizar temporal_performance_metrics (UPSERT)
            INSERT INTO temporal_performance_metrics (
                business_id, day_of_week, hour_of_day,
                total_sent, total_delivered, total_opened, total_bounced,
                data_points_count
            )
            VALUES (
                v_business_id, v_day_of_week, v_hour_of_day,
                CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
                CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
                CASE WHEN NEW.status = 'opened' THEN 1 ELSE 0 END,
                CASE WHEN NEW.status = 'bounced' THEN 1 ELSE 0 END,
                1
            )
            ON CONFLICT (business_id, day_of_week, hour_of_day)
            DO UPDATE SET
                total_sent = temporal_performance_metrics.total_sent + 
                    CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
                total_delivered = temporal_performance_metrics.total_delivered + 
                    CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
                total_opened = temporal_performance_metrics.total_opened + 
                    CASE WHEN NEW.status = 'opened' THEN 1 ELSE 0 END,
                total_bounced = temporal_performance_metrics.total_bounced + 
                    CASE WHEN NEW.status = 'bounced' THEN 1 ELSE 0 END,
                data_points_count = temporal_performance_metrics.data_points_count + 1,
                updated_at = NOW();
            
            -- Recalcular tasas
            PERFORM recalculate_temporal_rates(v_business_id, v_day_of_week, v_hour_of_day);
            
            -- Actualizar customer_engagement_patterns
            IF NEW.customer_id IS NOT NULL THEN
                PERFORM upsert_customer_engagement(NEW.customer_id, v_business_id);
            END IF;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_accumulate_metrics
    AFTER UPDATE OF status ON collection_clients
    FOR EACH ROW
    EXECUTE FUNCTION accumulate_email_metrics();
```

### 7.2 Función de Recálculo de Tasas

```sql
CREATE OR REPLACE FUNCTION recalculate_temporal_rates(
    p_business_id UUID,
    p_day_of_week INTEGER,
    p_hour_of_day INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE temporal_performance_metrics
    SET 
        delivery_rate = CASE 
            WHEN total_sent > 0 
            THEN ROUND(total_delivered * 100.0 / total_sent, 2)
            ELSE 0 
        END,
        open_rate = CASE 
            WHEN total_delivered > 0 
            THEN ROUND(total_opened * 100.0 / total_delivered, 2)
            ELSE 0 
        END,
        bounce_rate = CASE 
            WHEN total_sent > 0 
            THEN ROUND(total_bounced * 100.0 / total_sent, 2)
            ELSE 0 
        END,
        effectiveness_score = CASE 
            WHEN total_sent > 0 THEN
                ROUND(
                    (COALESCE(open_rate, 0) * 0.4) +
                    (COALESCE(delivery_rate, 0) * 0.4) -
                    (COALESCE(bounce_rate, 0) * 0.2),
                    2
                )
            ELSE 0 
        END,
        last_calculated_at = NOW()
    WHERE business_id = p_business_id
      AND day_of_week = p_day_of_week
      AND hour_of_day = p_hour_of_day;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 RLS Policies

```sql
-- customer_engagement_patterns
ALTER TABLE customer_engagement_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own customer engagement patterns"
    ON customer_engagement_patterns FOR SELECT
    USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid);

-- temporal_performance_metrics
ALTER TABLE temporal_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own temporal metrics"
    ON temporal_performance_metrics FOR SELECT
    USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid);

-- campaign_predictions
ALTER TABLE campaign_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own predictions"
    ON campaign_predictions FOR SELECT
    USING (business_id = (auth.jwt() -> 'app_metadata' ->> 'business_id')::uuid);
```

---

## 8. APIs y Servicios

### 8.1 Prediction Service API

#### Obtener Recomendaciones (con fallback automático)

```typescript
// POST /api/predictions/optimal-time
// El sistema decide automáticamente qué estrategia usar según datos disponibles

interface OptimalTimeRequest {
  business_id: string;
  customer_ids?: string[]; // Opcional: filtrar por clientes específicos
}

interface OptimalTimeResponse {
  strategy: 'heuristic' | 'statistical' | 'ml_basic' | 'ml_advanced';
  confidence: number;
  reason: string;
  
  recommendations: {
    day_of_week: number;
    day_name: string;
    hour: number;
    confidence: number;
    predicted_metrics: {
      open_rate: number;
      delivery_rate: number;
    };
  }[];
  
  // Información sobre progreso hacia ML
  data_progress: {
    current_emails: number;
    next_threshold: number;
    emails_to_next_phase: number;
  };
}

// Ejemplo de respuesta para negocio nuevo (0 emails)
{
  "strategy": "heuristic",
  "confidence": 30,
  "reason": "Usando mejores prácticas de la industria (Litmus 2024). Acumula datos para personalizar.",
  "recommendations": [
    {
      "day_of_week": 2,
      "day_name": "Martes",
      "hour": 10,
      "confidence": 30,
      "predicted_metrics": {
        "open_rate": 22.5,
        "delivery_rate": 95.0
      }
    }
  ],
  "data_progress": {
    "current_emails": 0,
    "next_threshold": 50,
    "emails_to_next_phase": 50
  }
}

// Ejemplo de respuesta para negocio con datos (600 emails)
{
  "strategy": "ml_advanced",
  "confidence": 85,
  "reason": "Basado en análisis de 600 emails con XGBoost. Tu audiencia responde mejor los martes a las 10 AM.",
  "recommendations": [
    {
      "day_of_week": 2,
      "day_name": "Martes",
      "hour": 10,
      "confidence": 85,
      "predicted_metrics": {
        "open_rate": 38.5,
        "delivery_rate": 97.2
      }
    }
  ],
  "data_progress": {
    "current_emails": 600,
    "next_threshold": null,
    "emails_to_next_phase": 0
  }
}
```

### 8.2 Status API

```typescript
// GET /api/ml/status/:business_id

interface MLStatusResponse {
  business_id: string;
  current_phase: 'cold_start' | 'learning' | 'ml_basic' | 'ml_advanced';
  
  stats: {
    total_emails: number;
    total_opens: number;
    total_deliveries: number;
    days_of_data: number;
    unique_customers: number;
  };
  
  available_features: {
    temporal_optimization: {
      available: boolean;
      current_strategy: string;
      confidence: number;
    };
    auto_segmentation: {
      available: boolean;
      segment_count?: number;
    };
    payment_propensity: {
      available: boolean;
    };
  };
  
  next_milestone: {
    phase: string;
    required_emails: number;
    current_emails: number;
    remaining: number;
    estimated_days: number; // Basado en velocidad actual
  };
}
```

---

## 9. Dashboard y Visualización

### 9.1 Panel de Progreso del ML

```
┌─────────────────────────────────────────────────────────────────┐
│          ESTADO DEL SISTEMA PREDICTIVO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🌱 FASE ACTUAL: Acumulando Datos                               │
│                                                                  │
│  Progreso hacia ML Personalizado:                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [████████░░░░░░░░░░░░░░░░░░░░░░░░] 23/50 emails       │   │
│  │        46% completado • Faltan 27 emails                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Estimado: 5 días más para activar análisis estadístico        │
│                                                                  │
│  📊 ESTADÍSTICAS ACTUALES:                                      │
│  • Emails enviados: 23                                          │
│  • Aperturas: 7 (30.4%)                                        │
│  • Clientes únicos: 12                                          │
│  • Días de datos: 4                                             │
│                                                                  │
│  🎯 PRÓXIMOS HITOS:                                             │
│  ┌──────────────────┬──────────┬──────────┐                    │
│  │ Fase             │ Emails   │ Estado   │                    │
│  ├──────────────────┼──────────┼──────────┤                    │
│  │ ✅ Cold Start    │ 0        │ Activo   │                    │
│  │ ⏳ Learning      │ 50       │ 46%      │                    │
│  │ ⏸️  ML Básico    │ 200      │ Bloq.    │                    │
│  │ ⏸️  ML Avanzado  │ 500      │ Bloq.    │                    │
│  └──────────────────┴──────────┴──────────┘                    │
│                                                                  │
│  💡 RECOMENDACIÓN ACTUAL:                                       │
│  "Enviar martes a las 10:00 AM (basado en mejores prácticas     │
│   del sector). Personalizaremos esto cuando tengamos más datos."│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Heatmap de Performance (cuando hay datos)

```
┌─────────────────────────────────────────────────────────────────┐
│          HEATMAP: TU RENDIMIENTO POR DÍA Y HORA                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Basado en 342 emails enviados en los últimos 30 días          │
│                                                                  │
│      08  09  10  11  12  13  14  15  16  17                    │
│  Lun ██  ██  ░░  ░░  ░░  ░░  ░░  ██  ██  ██    Prom: 18%       │
│  Mar ██  ░░  ███ ███ ▓▓  ░░  ░░  ░░  ██  ██    Prom: 35% ⭐    │
│  Mié ██  ░░  ▓▓  ███ ███ ░░  ░░  ░░  ██  ██    Prom: 32%       │
│  Jue ██  ██  ░░  ░░  ░░  ░░  ▓▓  ▓▓  ██  ██    Prom: 22%       │
│  Vie ██  ██  ██  ██  ██  ██  ██  ██  ██  ██    Prom: 12%       │
│                                                                  │
│  Leyenda: ██ Baja (<15%) ░░ Media (15-30%) ▓▓ Alta (30-45%)     │
│           ███ Muy Alta (>45%)                                   │
│                                                                  │
│  🎯 INSIGHT: Tu audiencia abre más los martes y miércoles      │
│     entre 10-12 AM. Evita viernes (bajo engagement).            │
│                                                                  │
│  [Ver recomendaciones optimizadas]                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Métricas de Éxito

### 10.1 Métricas de Negocio

| KPI | Semana 1 | Semana 8 | Semana 16 | Semana 24 |
|-----|----------|----------|-----------|-----------|
| **Negocios Activos** | 0 | 10+ | 50+ | 100+ |
| **% con >50 emails** | 0% | 30% | 60% | 80% |
| **% usando ML** | 0% | 10% | 40% | 70% |
| **Tasa de Apertura** | 20%* | 22% | 25% | 28% |
| **Mejora vs Heurísticas** | - | +10% | +25% | +40% |

*Baseline de heurísticas de industria

### 10.2 Métricas Técnicas

| Métrica | Target | Cómo Medir |
|---------|--------|------------|
| **Data Loss** | 0% | Comparar eventos recibidos vs almacenados |
| **Latency** | <100ms | Tiempo de actualización de métricas |
| **Model Accuracy** | >75% AUC-ROC | Comparación predicción vs realidad |
| **Phase Transition** | Automático | % de transiciones sin intervención manual |

### 10.3 User Adoption

| Métrica | Target Semana 8 | Target Semana 24 |
|---------|-----------------|------------------|
| **% usuarios que ven dashboard** | 50% | 80% |
| **% que usan recomendaciones** | 40% | 75% |
| **Satisfacción (CSAT)** | 4.0/5 | 4.5/5 |

---

## 11. Riesgos y Mitigaciones

### 11.1 Riesgos Específicos de Cold Start

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| **Usuarios impacientes** | Alta | Medio | Comunicar claramente progreso; mostrar valor inmediato con heurísticas |
| **Datos insuficientes por negocio** | Media | Alto | Agrupar datos por industria; usar benchmarks sectoriales |
| **Mala distribución temporal** | Media | Medio | Fase exploratoria intencional; A/B testing de horarios |
| **Transición abrupta** | Baja | Medio | Transiciones graduales; permitir override manual |

### 11.2 Plan de Contingencia Cold Start

```
SI después de 4 semanas <20% de negocios tienen >50 emails:
  → Revisar estrategia de onboarding
  → Ofrecer incentivos para envíos más frecuentes
  → Considerar compartir datos anonimizados entre negocios similares

SI heurísticas de industria tienen <15% open rate:
  → Revisar fuentes de heurísticas
  → Ajustar a mercado latinoamericano específico
  → Considerar preguntar horario preferido durante onboarding

SI usuarios reportan "no confío en las recomendaciones":
  → Agregar explicabilidad ("por qué recomendamos esto")
  → Mostrar datos que respaldan la recomendación
  → Permitir override fácil con un click
```

---

## 12. Apéndices

### 12.1 Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Feature Store** | PostgreSQL + Redis | Datos estructurados en PG; cache en Redis |
| **ML Training** | Python + scikit-learn/XGBoost | Maduro, documentado, escalable |
| **ML Serving** | FastAPI / Next.js API Routes | Baja latencia, type safety |
| **Orchestración** | GitHub Actions / Temporal.io | Jobs de recálculo programados |
| **Monitoreo** | Prometheus + Grafana | Métricas en tiempo real |

### 12.2 Fuentes de Heurísticas

- Litmus "State of Email" 2024
- HubSpot Email Marketing Benchmarks
- Mailchimp Email Marketing Statistics
- SendGrid Global Email Engagement

### 12.3 Glosario

| Término | Definición |
|---------|-----------|
| **Cold Start** | Inicio de sistema sin datos históricos disponibles |
| **Heurísticas** | Reglas basadas en conocimiento/experiencia, no en datos |
| **A/B Testing Exploratorio** | Enviar intencionalmente en diferentes horarios para generar variedad de datos |
| **Umbral de Activación** | Cantidad mínima de datos necesaria para activar una feature de ML |
| **Feedback Loop** | Proceso de comparar predicciones con resultados reales para mejorar |

---

## 13. Checklist de Implementación

### Fase 1: Foundation + Cold Start
- [ ] Tablas ML creadas (vacías)
- [ ] Triggers de acumulación implementados
- [ ] Heurísticas de industria configuradas
- [ ] UI muestra progreso claramente
- [ ] Sistema funciona desde día 1

### Fase 2: Análisis Estadístico
- [ ] Detección automática de umbral (50 emails)
- [ ] Motor estadístico funcionando
- [ ] Dashboard muestra datos reales
- [ ] Transición automática heurísticas → estadísticas

### Fase 3: ML Básico
- [ ] Detección automática de umbral (200 emails)
- [ ] Regresión lineal sirviendo predicciones
- [ ] Segmentación automática básica
- [ ] Feedback loop implementado

### Fase 4: ML Avanzado
- [ ] Detección automática de umbral (500 emails)
- [ ] XGBoost en producción
- [ ] Clustering con 5+ segmentos
- [ ] Propensión al pago funcionando

### Post-lanzamiento
- [ ] Monitoreo de transiciones de fase
- [ ] Retroalimentación de usuarios
- [ ] Ajuste de heurísticas según resultados reales

---

**Fin del Documento v1.1**

*Documento actualizado para sistema nuevo (cold start). Estrategia evolutiva: heurísticas → estadísticas → ML básico → ML avanzado, con activación automática basada en umbrales de datos.*
