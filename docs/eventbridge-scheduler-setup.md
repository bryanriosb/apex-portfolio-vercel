# Configuración de EventBridge Scheduler

Este documento describe cómo configurar el EventBridge Scheduler para soportar timezone local (America/Bogota).

## Cambios Implementados

### 1. Migración de EventBridge Rules a EventBridge Scheduler

Se migró el servicio de scheduling de **EventBridge Rules** (solo UTC) a **EventBridge Scheduler** (soporta timezone).

**Archivos modificados:**
- `lib/services/collection/collection-service.ts`
- `__tests__/collection/eventbridge-schedule.test.ts`
- `scripts/validate-eventbridge-schedule.sh`
- `.env` (nueva variable)

### 2. Nueva Variable de Entorno

```bash
# EventBridge Scheduler Configuration
EVENTBRIDGE_SCHEDULER_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/EventBridgeSchedulerRole
```

## Configuración Requerida en AWS

### Paso 1: Crear el IAM Role para EventBridge Scheduler

El EventBridge Scheduler necesita un IAM Role con permisos para invocar funciones Lambda. Este rol debe tener un trust policy específico.

#### 1.1 Crear el Trust Policy (scheduler-trust-policy.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "scheduler.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

#### 1.2 Crear el IAM Role

```bash
aws iam create-role \
  --role-name EventBridgeSchedulerRole \
  --assume-role-policy-document file://scheduler-trust-policy.json
```

#### 1.3 Adjuntar política de permisos

```bash
aws iam attach-role-policy \
  --role-name EventBridgeSchedulerRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaRole
```

O crear una política personalizada más restrictiva:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:collection-email-worker"
    }
  ]
}
```

#### 1.4 Obtener el ARN del rol

```bash
aws iam get-role --role-name EventBridgeSchedulerRole --query 'Role.Arn' --output text
```

Copia este ARN y configúralo en tu `.env`:

```bash
EVENTBRIDGE_SCHEDULER_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/EventBridgeSchedulerRole
```

## Verificación con AWS CLI

### Listar todos los schedules

```bash
aws scheduler list-schedules --region us-east-1
```

### Ver detalle de un schedule específico

```bash
aws scheduler get-schedule \
  --name collection-exec-EXECUTION_ID \
  --region us-east-1
```

### Validar que usa Local Time (America/Bogota)

La salida debe mostrar:

```json
{
  "Name": "collection-exec-EXECUTION_ID",
  "ScheduleExpression": "cron(7 10 26 2 ? 2026)",
  "ScheduleExpressionTimezone": "America/Bogota",
  ...
}
```

**Importante:** La expresión cron ahora muestra la hora LOCAL (10:07 AM Bogotá) en lugar de UTC (15:07).

### Usar el script de validación

```bash
./scripts/validate-eventbridge-schedule.sh collection-exec-EXECUTION_ID
```

## Diferencias Clave

### Antes (EventBridge Rules - UTC)

```json
{
  "Name": "collection-exec-xxx",
  "ScheduleExpression": "cron(7 15 26 2 ? 2026)",  // UTC: 15:07
  // No timezone support
}
```

En consola AWS: Se veía como 15:07 (3:07 PM UTC) = 10:07 AM Bogotá

### Después (EventBridge Scheduler - Local Time)

```json
{
  "Name": "collection-exec-xxx",
  "ScheduleExpression": "cron(7 10 26 2 ? 2026)",  // Local: 10:07 AM
  "ScheduleExpressionTimezone": "America/Bogota"
}
```

En consola AWS: Se ve como 10:07 AM (hora local de Bogotá) ✓

## Tests

Los tests verifican:

1. **Conversión de timezone**: La expresión cron se genera en hora local
2. **Configuración del schedule**: Se incluye `ScheduleExpressionTimezone`
3. **Integración con AWS**: Se crea el schedule correctamente

Ejecutar tests:

```bash
bun test __tests__/collection/eventbridge-schedule.test.ts
```

## Troubleshooting

### Error: "The execution role you provide must allow AWS EventBridge Scheduler to assume the role"

**Causa:** El IAM Role no tiene el trust policy correcto.

**Solución:** Verificar que el rol tenga el trust policy con `scheduler.amazonaws.com` como Principal.

### Error: "Schedule group does not exist"

**Solución:** El código ahora usa el grupo `default` que siempre existe. Si quieres usar un grupo personalizado, créalo primero:

```bash
aws scheduler create-schedule-group \
  --name collection-executions \
  --region us-east-1
```

### Error: "User is not authorized to perform"

**Solución:** Verificar que las credenciales AWS tengan permisos para:
- `scheduler:CreateSchedule`
- `scheduler:DeleteSchedule`
- `scheduler:GetSchedule`
- `scheduler:ListSchedules`

## Resumen de Cambios

| Aspecto | Antes | Después |
|---------|-------|---------|
| Servicio AWS | EventBridge Rules | EventBridge Scheduler |
| Timezone | Solo UTC | America/Bogota (configurable) |
| Expresión Cron | UTC (ej: 15:07) | Local Time (ej: 10:07) |
| Variable Env | N/A | `EVENTBRIDGE_SCHEDULER_ROLE_ARN` |
| AWS CLI | `aws events describe-rule` | `aws scheduler get-schedule` |

## Referencias

- [AWS EventBridge Scheduler Documentation](https://docs.aws.amazon.com/scheduler/latest/UserGuide/what-is-scheduler.html)
- [Setting up IAM roles for Scheduler](https://docs.aws.amazon.com/scheduler/latest/UserGuide/setting-up.html)
- [Schedule expressions](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html)