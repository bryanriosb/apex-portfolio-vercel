#!/bin/bash

# Script para validar la creación de reglas EventBridge con AWS CLI
# Uso: ./validate-eventbridge-schedule.sh <rule-name>

set -e

RULE_NAME=${1:-"collection-exec-test"}
REGION=${AWS_REGION:-"us-east-1"}

echo "🔍 Validando regla EventBridge: $RULE_NAME"
echo "🌍 Región: $REGION"
echo ""

# Verificar si la regla existe
echo "📋 Describiendo regla..."
aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --output table

echo ""
echo "✅ Regla encontrada!"
echo ""

# Extraer la expresión cron
SCHEDULE=$(aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --query 'ScheduleExpression' \
  --output text)

echo "⏰ Expresión Cron: $SCHEDULE"
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
    echo "   - Horas (UTC): $HOURS"
    echo "   - Día: $DAY"
    echo "   - Mes: $MONTH"
    echo "   - Año: $YEAR"
    echo ""
    
    # Calcular hora local (America/Bogota = UTC-5)
    HOURS_BOGOTA=$((HOURS - 5))
    if [ $HOURS_BOGOTA -lt 0 ]; then
        HOURS_BOGOTA=$((HOURS_BOGOTA + 24))
        DAY_BOGOTA=$((DAY - 1))
    else
        DAY_BOGOTA=$DAY
    fi
    
    printf "🇨🇴 Hora local (America/Bogota): %02d:%02d\n" $HOURS_BOGOTA $MINUTES
    printf "🌍 Hora UTC: %02d:%02d\n" $HOURS $MINUTES
    echo ""
    
    # Validación específica para 10:07 AM
    if [ "$HOURS_BOGOTA" -eq 10 ] && [ "$MINUTES" -eq 7 ]; then
        echo "✅ VALIDACIÓN EXITOSA: La regla está programada para 10:07 AM (Bogota)"
    else
        echo "⚠️  La regla NO está programada para 10:07 AM"
        echo "   Esperado: 10:07 (Bogota) / 15:07 (UTC)"
        printf "   Encontrado: %02d:%02d (Bogota) / %02d:%02d (UTC)\n" $HOURS_BOGOTA $MINUTES $HOURS $MINUTES
    fi
else
    echo "❌ No se pudo parsear la expresión cron: $SCHEDULE"
    exit 1
fi

echo ""
echo "🎯 Targets asociados:"
aws events list-targets-by-rule \
  --rule "$RULE_NAME" \
  --region "$REGION" \
  --output table

echo ""
echo "📊 Próximas ejecuciones (próximas 10):"
aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --query 'ScheduleExpression' \
  --output text
