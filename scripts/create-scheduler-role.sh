#!/bin/bash

# Script para crear el IAM Role de EventBridge Scheduler
# Ejecutar con un usuario que tenga permisos IAM (ej: root o admin)

set -e

echo "🔧 Creando IAM Role para EventBridge Scheduler"
echo "================================================"
echo ""

# Trust policy para EventBridge Scheduler
cat > /tmp/scheduler-trust-policy.json << 'EOF'
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
EOF

echo "📄 Trust policy creado"
echo ""

# Crear el rol
echo "👤 Creando rol EventBridgeSchedulerRole..."
aws iam create-role \
  --role-name EventBridgeSchedulerRole \
  --assume-role-policy-document file:///tmp/scheduler-trust-policy.json \
  --description "Role for EventBridge Scheduler to invoke Lambda functions"

echo ""
echo "✅ Rol creado exitosamente"
echo ""

# Crear política inline para Lambda
cat > /tmp/scheduler-lambda-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:399699578521:function:collection-email-worker"
    }
  ]
}
EOF

echo "📄 Política Lambda creada"
echo ""

# Adjuntar política al rol
echo "🔐 Adjuntando política de permisos..."
aws iam put-role-policy \
  --role-name EventBridgeSchedulerRole \
  --policy-name LambdaInvokePolicy \
  --policy-document file:///tmp/scheduler-lambda-policy.json

echo ""
echo "✅ Política adjuntada exitosamente"
echo ""

# Obtener el ARN del rol
echo "📋 Obteniendo ARN del rol..."
ROLE_ARN=$(aws iam get-role --role-name EventBridgeSchedulerRole --query 'Role.Arn' --output text)

echo ""
echo "================================================"
echo "✅ ROL CREADO EXITOSAMENTE"
echo "================================================"
echo ""
echo "ARN del Rol:"
echo "$ROLE_ARN"
echo ""
echo "================================================"
echo "📝 INSTRUCCIONES:"
echo "================================================"
echo ""
echo "1. Copia el ARN de arriba y agrégalo a tu archivo .env:"
echo ""
echo "EVENTBRIDGE_SCHEDULER_ROLE_ARN=$ROLE_ARN"
echo ""
echo "2. El rol ahora puede ser usado por EventBridge Scheduler"
echo ""
echo "================================================"

# Limpiar archivos temporales
rm /tmp/scheduler-trust-policy.json
rm /tmp/scheduler-lambda-policy.json