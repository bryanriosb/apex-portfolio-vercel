# Supabase Migrations

Este directorio contiene todas las migraciones de base de datos organizadas por tipo.

## Estructura de Directorios

```
supabase/migrations/
├── tables/          # Alteraciones de tablas, nuevas columnas, constraints
├── triggers/        # Funciones trigger y definiciones de triggers
├── functions/       # Funciones RPC y stored procedures
├── views/           # Vistas de base de datos
└── *.sql           # Archivos de migración históricos (root level)
```

## Convención de Nombres

Los archivos deben seguir el formato: `YYYYMMDD_descripcion_corta.sql`

Ejemplos:
- `20260304_add_batch_id_to_collection_clients.sql`
- `20260304_increment_execution_counters_trigger.sql`

## Reglas de Organización

### Tables (`tables/`)
- ALTER TABLE statements
- ADD COLUMN / DROP COLUMN
- CREATE INDEX / DROP INDEX
- Constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)

### Triggers (`triggers/`)
- CREATE OR REPLACE FUNCTION para triggers
- CREATE TRIGGER statements
- DROP TRIGGER IF EXISTS
- Funciones que manejan eventos BEFORE/AFTER/INSTEAD OF

### Functions (`functions/`)
- CREATE OR REPLACE FUNCTION para funciones RPC
- Funciones invocables desde Supabase RPC
- Stored procedures complejos

### Views (`views/`)
- CREATE OR REPLACE VIEW
- CREATE MATERIALIZED VIEW
- DROP VIEW statements

## Migraciones Históricas

Los archivos en el directorio raíz son migraciones históricas que existían antes de la reorganización. Nuevas migraciones deben colocarse en los subdirectorios correspondientes.

## Orden de Aplicación

Las migraciones se aplican en orden alfabético. Asegúrate de usar prefijos de fecha (YYYYMMDD) para mantener el orden cronológico.

## Archivos Recientes (Mar 2026)

### Cambios en Collection Metrics

**Tablas:**
- `tables/20260304_add_batch_id_to_collection_clients.sql` - Agrega columna batch_id para tracking granular

**Triggers:**
- `triggers/20260304_increment_execution_counters_trigger.sql` - Trigger unificado para métricas de email con auto-completed_at

### Features Implementadas

1. **Batch-level Metrics**: El campo `batch_id` en `collection_clients` permite tracking granular de métricas por batch
2. **Auto-completion**: Los batches se marcan automáticamente como `completed` cuando todos sus clients alcanzan estado final
3. **Single Source of Truth**: El trigger `increment_counters_on_client_update` es el único punto de actualización de métricas
