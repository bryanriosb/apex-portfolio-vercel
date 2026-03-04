#!/bin/bash
set -e  # Exit on error

echo "🔧 Loading environment variables from .env..."

# Verificar que existe .env
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# 1. Exportar credenciales para AWS CLI (estas NO van a Lambda)
export $(grep -v '^#' .env | xargs)

# 2. Construir env-vars string desde .env
# Filtra comentarios, líneas vacías Y variables reservadas de AWS
# Las variables AWS_* solo se usan para autenticación del CLI, no van a Lambda
ENV_VARS=$(grep -v '^#' .env | \
           grep -v '^$' | \
           grep -v '^AWS_REGION' | \
           grep -v '^AWS_ACCESS_KEY_ID' | \
           grep -v '^AWS_SECRET_ACCESS_KEY' | \
           grep -v '^AWS_SQS_QUEUE_URL' | \
           tr '\n' ',' | sed 's/,$//')

# Agregar variables adicionales que no están en .env pero son necesarias
# Nota: AWS_REGION no se incluye porque es una variable reservada de Lambda
ADDITIONAL_VARS="APP_ENV=dev,SES_CONFIGURATION_SET=borls-collection-config,SES_SOURCE_EMAIL=siesa@borls.com,API_BASE_URL=https://apex.borls.com"

# Combinar variables
ALL_ENV_VARS="${ENV_VARS},${ADDITIONAL_VARS}"

echo "✅ Environment variables loaded"
echo "📦 Building Lambda functions..."

# 3. Recompilar
cargo lambda build --release --arm64

echo "🚀 Deploying Lambda functions..."

# 4. Desplegar Email Worker
echo "  → Deploying collection-email-worker..."
cargo lambda deploy \
  --iam-role arn:aws:iam::399699578521:role/borls-lambda-role \
  --env-vars "${ALL_ENV_VARS}" \
  collection-email-worker

# 5. Desplegar Event Handler
echo "  → Deploying collection-event-handler..."
cargo lambda deploy \
  --iam-role arn:aws:iam::399699578521:role/borls-lambda-role \
  --env-vars "${ALL_ENV_VARS}" \
  collection-event-handler

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Active email provider: ${EMAIL_PROVIDER:-ses (default)}"