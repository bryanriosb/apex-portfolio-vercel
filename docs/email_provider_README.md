# Email Provider System - Documentación

Índice completo de la documentación del sistema de proveedores de email y webhooks.

## 📚 Documentación Principal

### [Email Provider Architecture](./email_provider_architecture.md)

**Documentación técnica completa** del sistema de abstracción de proveedores.

**Contenido:**

- Arquitectura del sistema con diagramas
- Implementación del patrón Factory en Rust
- Detalles de providers (SES y Brevo)
- Webhook infrastructure en Next.js
- Database schema y event flow
- Guía para agregar nuevos proveedores

**Audiencia:** Desarrolladores, arquitectos

---

### [Webhook Setup Guide](./webhook_setup_guide.md)

**Guía paso a paso** para configurar webhooks en Brevo y SES.

**Contenido:**

- Configuración de webhooks en Brevo Dashboard
- Selección de eventos
- Testing y verificación
- Troubleshooting común
- SQL queries para monitoreo

**Audiencia:** DevOps, administradores

---

### [Portfolio System Overview](./portfolio_sys.md)

**Resumen ejecutivo** del sistema completo de collection/cobranza.

**Incluye:**

- Flujo completo de notificaciones
- Stack tecnológico
- Estado actual del sistema
- Referencias a nueva documentación multi-provider

**Audiencia:** Product managers, stakeholders

---

## 🚀 Quick Start

### Para Desarrolladores

1. **Entender la arquitectura:**
   - Lee [Email Provider Architecture](./email_provider_architecture.md) secciones 1-2

2. **Ver el código:**

   ```
   functions/aws/collection-email-worker/src/
   ├── email_provider.rs    # Trait principal
   ├── factory.rs           # Factory pattern
   └── providers/
       ├── ses_provider.rs
       └── brevo_provider.rs
   ```

3. **Configurar provider:**

   ```bash
   # En functions/aws/.env
   EMAIL_PROVIDER=brevo
   ```

### Para DevOps

1. **Configurar webhooks:**
   - Sigue [Webhook Setup Guide](./webhook_setup_guide.md)

2. **Deploy:**

   ```bash
   cd functions/aws
   ./deploy.sh
   ```

3. **Monitorear:**
   - Ver sección "Monitoring & Debugging" en architecture doc

---

## 📂 Estructura de Archivos

```
docs/
├── email_provider_architecture.md   # 📖 Arquitectura técnica completa
├── webhook_setup_guide.md           # 🔧 Guía de setup webhooks
├── portfolio_sys.md                 # 📋 Overview del sistema
└── email_provider_README.md         # 📍 Este archivo (índice)

functions/aws/collection-email-worker/
├── src/
│   ├── email_provider.rs            # EmailProvider trait
│   ├── factory.rs                   # Factory pattern
│   ├── providers/
│   │   ├── ses_provider.rs          # AWS SES implementation
│   │   └── brevo_provider.rs        # Brevo implementation
│   └── main.rs                      # Integration
└── .env                             # Configuración

app/api/webhooks/email/[provider]/
└── route.ts                         # Webhook endpoint dinámico

lib/webhooks/
├── parsers/
│   ├── ses-parser.ts                # Parser eventos SES
│   └── brevo-parser.ts              # Parser eventos Brevo
└── handlers/
    └── email-webhook-handler.ts     # Handler unificado
```

---

## 🔗 Enlaces Rápidos

### Configuración

- [Variables de entorno](./email_provider_architecture.md#3-configuration--environment)
- [Deploy script](./email_provider_architecture.md#32-deployment)

### Desarrollo

- [Agregar nuevo proveedor](./email_provider_architecture.md#6-extensibilidad)
- [Event flow](./email_provider_architecture.md#5-event-flow-comparison)

### Operaciones

- [Webhook setup Brevo](./webhook_setup_guide.md#-brevo-webhooks-nuevo---requiere-configuración)
- [Troubleshooting](./webhook_setup_guide.md#-troubleshooting)
- [Monitoring](./email_provider_architecture.md#8-monitoring--debugging)

---

## ✅ Checklist de Setup Inicial

- [ ] Leer documentación de arquitectura
- [ ] Configurar `.env` con proveedor deseado
- [ ] Configurar webhooks en Brevo (si aplica)
- [ ] Deploy con `./deploy.sh`
- [ ] Verificar webhooks con curl
- [ ] Enviar email de prueba
- [ ] Verificar eventos en DB
- [ ] Configurar monitoreo

---

## 🆘 Soporte

**Problemas comunes:**

- Webhook no recibe eventos → [Troubleshooting](./webhook_setup_guide.md#-troubleshooting)
- Provider no inicializa → Verificar variables en `.env`
- Eventos no actualizan DB → Revisar `message_id` en `custom_data`

**Recursos adicionales:**

- [Brevo API Docs](https://developers.brevo.com)
- [AWS SES Docs](https://docs.aws.amazon.com/ses/)
