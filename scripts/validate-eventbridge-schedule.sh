#!/bin/bash

# Script para validar la creación de schedules EventBridge Scheduler con AWS CLI
# Uso: ./validate-eventbridge-schedule.sh <schedule-name>

set -e

SCHEDULE_NAME=${1:-"collection-exec-test"}
REGION=${AWS_REGION:-"us-east-1"}

echo "🔍 Validando schedule EventBridge Scheduler: $SCHEDULE_NAME"
echo "🌍 Región: $REGION"
echo ""

# Verificar si el schedule existe usando el API de Scheduler (no Events)
echo "📋 Describiendo schedule..."
aws scheduler get-schedule \
  --name "$SCHEDULE_NAME" \
  --region "$REGION" \
  --output table

echo ""
echo "✅ Schedule encontrado!"
echo ""

# Extraer la información del schedule
SCHEDULE_INFO=$(aws scheduler get-schedule \
  --name "$SCHEDULE_NAME" \
  --region "$REGION")

# Extraer la expresión cron y timezone
SCHEDULE=$(echo "$SCHEDULE_INFO" | jq -r '.ScheduleExpression')
TIMEZONE=$(echo "$SCHEDULE_INFO" | jq -r '.ScheduleExpressionTimezone // "UTC"')

echo "⏰ Expresión Cron: $SCHEDULE"
echo "🌍 Timezone: $TIMEZONE"
echo ""

# Parsear la expresión cron
# Formato: cron(minutes hours day-of-month month day-of-week year)
if [[ $SCHEDULE =~ cron\(([0-9]+)\ ([0-9]+)\ ([0-9]+)\ ([0-9]+)\ \?\ ([0-9]+)\) ]]; then
    MINUTES="${BASH_REMATCH[1]}"
    HOURS="${BASH_REMATCH[2]}"
    DAY="${BASH_REMATCH[3]}"
    MONTH="${BASH_REMATCH[4]}"
    YEAR="${BASH_REMATCH[5]}"
    
    echo "📅 Detalles del schedule:"
    echo "   - Minutos: $MINUTES"
    echo "   - Horas (LOCAL): $HOURS"
    echo "   - Día: $DAY"
    echo "   - Mes: $MONTH"
    echo "   - Año: $YEAR"
    echo ""
    
    printf "✅ Hora local (%s): %02d:%02d\n" "$TIMEZONE" $HOURS $MINUTES
    
    # Calcular hora UTC si es America/Bogota (UTC-5)
    if [ "$TIMEZONE" == "America/Bogota" ]; then
        HOURS_UTC=$((HOURS + 5))
        if [ $HOURS_UTC -ge 24 ]; then
            HOURS_UTC=$((HOURS_UTC - 24))
        fi
        printf "🌍 Hora UTC equivalente: %02d:%02d\n" $HOURS_UTC $MINUTES
    fi
    echo ""
    
    # Validación específica para 10:07 AM en timezone local
    if [ "$HOURS" -eq 10 ] && [ "$MINUTES" -eq 7 ]; then
        echo "✅ VALIDACIÓN EXITOSA: El schedule está programado para 10:07 AM en timezone $TIMEZONE"
    else
        echo "ℹ️  Horario programado: $HOURS:$MINUTES en timezone $TIMEZONE"
    fi
else
    echo "❌ No se pudo parsear la expresión cron: $SCHEDULE"
    exit 1
fi

echo ""
echo "🎯 Target asociado:"
echo "$SCHEDULE_INFO" | jq -r '.Target'

echo ""
echo "📋 Información completa del schedule:"
echo "$SCHEDULE_INFO" | jq '.'

echo ""
echo "📊 Para listar todos los schedules:"
echo "aws scheduler list-schedules --region $REGION"

echo ""
echo "🗑️  Para eliminar este schedule:"
echo "aws scheduler delete-schedule --name $SCHEDULE_NAME --region $REGION"