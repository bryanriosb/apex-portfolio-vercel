# 1. Exportar credenciales
export $(grep -v '^#' .env | xargs)

# 2. Recompilar (para incluir los cambios de modelos y snake_case)
cargo lambda build --release --arm64

# 3. Desplegar Email Worker
cargo lambda deploy \
  --iam-role arn:aws:iam::399699578521:role/borls-lambda-role \
  --env-vars APP_ENV=dev,TRACKING_URL=https://1db055ec23b9.ngrok-free.app,SUPABASE_URL=https://eecssalgotbcknehikof.supabase.co,SUPABASE_SECRET_KEY=sb_secret_XuAdsWGCgtGgedvgiYcB_Q_y8VJVu7C \
  collection-email-worker

# 4. Desplegar Event Handler
cargo lambda deploy \
  --iam-role arn:aws:iam::399699578521:role/borls-lambda-role \
  --env-vars APP_ENV=dev,SUPABASE_URL=https://eecssalgotbcknehikof.supabase.co,SUPABASE_SECRET_KEY=sb_secret_XuAdsWGCgtGgedvgiYcB_Q_y8VJVu7C \
  collection-event-handler