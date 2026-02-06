# Configuración de Seguridad Webhook Brevo

## 🔐 Autenticación Implementada

El webhook de Brevo ahora requiere autenticación mediante una clave secreta.

### Cómo Funciona

El webhook valida que las peticiones provengan de Brevo verificando un header con la clave configurada.

**Headers aceptados** (en orden de prioridad):

1. `x-webhook-key: tu_clave_secreta`
2. `authorization: tu_clave_secreta`

Si la clave no coincide → respuesta `401 Unauthorized`

---

## ⚙️ Configuración

### 1. En tu `.env` de Next.js

Ya definiste:

```bash
BREVO_WEBHOOK_KEY=tu_clave_secreta_aqui
```

### 2. En Brevo Dashboard

Al configurar el webhook, **agrega un Custom Header**:

```
Header Name: x-webhook-key
Header Value: tu_clave_secreta_aqui
```

**Pasos en Brevo**:

1. Ve a **Settings** → **Webhooks** → **Transactional**
2. Al crear/editar el webhook para `https://apex.borls.com/api/webhooks/email/brevo`
3. Busca la sección **"Custom Headers"** o **"Authentication"**
4. Agrega:
   - **Key**: `x-webhook-key`
   - **Value**: El mismo valor que pusiste en `BREVO_WEBHOOK_KEY`

---

## ✅ Testing

### Test con curl (debería fallar sin auth)

```bash
curl -X POST https://apex.borls.com/api/webhooks/email/brevo \
  -H "Content-Type: application/json" \
  -d '{"event":"delivered","email":"test@example.com"}'
```

**Respuesta esperada:**

```json
{"error":"Unauthorized"}
```

### Test con auth válida

```bash
curl -X POST https://apex.borls.com/api/webhooks/email/brevo \
  -H "Content-Type: application/json" \
  -H "x-webhook-key: tu_clave_secreta_aqui" \
  -d '{"event":"delivered","email":"test@example.com","message-id":"123"}'
```

**Respuesta esperada:**

```json
{"received":true}
```

---

## 🛡️ Mejores Prácticas

1. **Clave fuerte**: Usa una clave aleatoria larga (ej: UUID o hash)

   ```bash
   # Generar clave segura
   openssl rand -hex 32
   ```

2. **Mantener secreta**: No commitear la clave al repositorio
   - ✅ Definida en `.env` (ignorado por git)
   - ✅ Configurada en Vercel/producción como variable de entorno

3. **Rotar periódicamente**: Cambiar la clave cada cierto tiempo

---

## 🔄 Si la Clave No Está Configurada

Si `BREVO_WEBHOOK_KEY` no está definida en el `.env`, el webhook **NO valida autenticación** y acepta cualquier petición.

Esto es útil para development local, pero **en producción siempre debe estar configurada**.

---

## 📋 Checklist

- [x] `BREVO_WEBHOOK_KEY` definida en `/home/bryan/Workspace/borls/apex-portfolio/.env`
- [ ] Verificar que está en Vercel env vars (producción)
- [ ] Configurar custom header en Brevo webhook
- [ ] Probar con curl que rechaza peticiones sin auth
- [ ] Enviar email de prueba y verificar que webhook funciona

---

## 🚨 Troubleshooting

**Problema**: Webhook devuelve 401 a Brevo

- **Causa**: Header no está configurado correctamente en Brevo
- **Solución**: Verifica que el custom header `x-webhook-key` tiene el valor correcto

**Problema**: Eventos no llegan

- **Causa**: Brevo no puede autenticarse
- **Solución**: Revisa logs de Brevo para ver errores de webhook
