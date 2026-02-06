# Solicitud de Producción AWS SES - Apelación

**Asunto:** Re: Production Access Request - Case ID 176975730700160 - Detailed Use Case for Collections Management Platform

---

**Para:** AWS Trust and Safety Team

Estimado equipo de AWS,

Agradezco la oportunidad de proporcionar información adicional sobre nuestro caso de uso. Entendemos las preocupaciones de seguridad y estamos comprometidos a mantener los más altos estándares de prácticas de email. A continuación, presento una descripción completa y detallada de nuestra plataforma.

---

## 1. Descripción del Caso de Uso

### Plataforma: Borls Collections Management System

Somos una **plataforma de gestión de cobranza** que ayuda a empresas a administrar sus cuentas por cobrar de manera organizada y eficiente. Nuestra plataforma permite a las empresas:

- **Importar datos de clientes** desde archivos CSV estructurados
- **Crear ejecuciones de cobro** programadas o inmediatas
- **Enviar notificaciones transaccionales** a clientes con pagos pendientes
- **Hacer seguimiento** del estado de cada comunicación

### Tipo de Emails: TRANSACCIONALES

Los emails que enviaremos son **estrictamente transaccionales** y se envían **exclusivamente a clientes que YA tienen una relación comercial establecida** con las empresas que utilizan nuestra plataforma.

**Flujo típico de comunicación:**

1. Una empresa sube un CSV con datos de sus clientes que tienen facturas pendientes
2. Nuestra plataforma procesa la información y programa/envía notificaciones
3. Los emails enviados incluyen:
   - **Recordatorio de pago pendiente** con monto y fecha de vencimiento
   - **Notificación de cambio en cuenta** (nuevo saldo, actualización de estado)
   - **Confirmación de recepción** de documentos o acuerdos

### Ejemplo de Email Transaccional

```
Asunto: Recordatorio de pago pendiente - Factura #INV-2024-001

Hola [Nombre del Cliente],

Le recordamos que tiene un saldo pendiente de $1.500.000 COP
con [Nombre de la Empresa].

Detalles de su deuda:
- Monto pendiente: $1.500.000 COP
- Días en mora: 15 días
- Fecha de vencimiento: 15 de febrero de 2025

Puede realizar su pago en: [enlace de pago]

Si tiene alguna pregunta o necesita discutir un plan de pago,
comuníquese directamente con [Nombre de la Empresa] al
teléfono [número] o al email [contacto].

Atentamente,
[Nombre de la Empresa]

---
¿Desea dejar de recibir estos recordatorios?
Haga clic aquí para cancelar su suscripción: [enlace_unsubscribe]
```

---

## 2. Proceso de Opt-In (Consentimiento)

### Origen de los Direcciones de Email

**CRÍTICO:** Los emails que notificamos provienen de clientes que **YA han proporcionado su información de contacto como parte de su relación comercial**.

**Flujo de consentimiento:**

1. **Contrato Físico/Digital:** El cliente firma un contrato con la empresa que usa nuestra plataforma
2. **Datos de Contacto:** Como parte del proceso de crédito o compra, el cliente proporciona su email
3. **Verificación:** Las empresas usuarias de nuestra plataforma verifican la validez de los emails antes de cargarlos
4. **Uso Transaccional:** Solo utilizamos el email para comunicaciones relacionadas con la deuda/pedido

### Verificación de Listas

Antes de cada ejecución de envío:
- Eliminación de **duplicados**
- Validación de **formato de email**
- Filtrado de direcciones **conocidas como inválidas**
- Verificación de que el cliente tenga **estado activo** en el sistema de la empresa

---

## 3. Proceso de Opt-Out (Cancelación)

### Mecanismo de Unsubscribe

**Cada email incluye de forma visible:**

1. **Enlace de cancelación** claro y fácil de usar en el pie del email
2. **Procesamiento automático:** Los requests de unsubscribe se procesan en menos de 24 horas
3. **Actualización en BD:** El cliente se marca como "unsubscribed" y no recibirá futuras comunicaciones
4. **Retorno a la empresa:** La solicitud de unsubscribe se notifica a la empresa usuaria

### Implementación Técnica del Unsubscribe

```
Cabecera Email:
List-Unsubscribe: <mailto:unsubscribe@borls.com>, <https://borls.com/unsubscribe?token=XXX>

Pie del Email:
<a href="https://borls.com/unsubscribe?client_id=XXX&token=YYY">Cancelar suscripción</a>
```

---

## 4. Gestión de Bounces y Complaints

### Configuración SNS para Eventos

Hemos implementado una infraestructura completa de monitoreo usando **AWS SNS** para procesar eventos de SES:

#### SNS Topics Configurados:

1. **`borls-ses-bounces`**
   - Recibe eventos de tipo `bounce`
   - **Hard Bounces:** Emails permanentemente inválidos → Se eliminan automáticamente de la lista
   - **Soft Bounces:** Temporales → Se reintentan 3 veces, si persiste se marcan
   - Alerta si tasa de bounce excede **5%**

2. **`borls-ses-complaints`**
   - Recibe eventos de tipo `complaint`
   - **Acción inmediata:** Cliente se marca como "complained" y se remueve de futuros envíos
   - Alerta si tasa de complaints excede **0.1%**

3. **`borls-ses-deliveries`**
   - Tracking de emails entregados exitosamente
   - Métricas de delivery rate

4. **`borls-ses-opens`**
   - Tracking de aperturas (usando pixel de tracking de AWS SES)
   - Métricas de engagement

### Lambda `collection-event-handler`

Procesa todos los eventos SNS entrantes:

```rust
// Eventos manejados:
- Delivery: Email entregado → Actualiza status a 'delivered'
- Bounce: Clasificación hard/soft → Elimina o reintenta según caso
- Complaint: Cliente marcó spam → Remueve inmediatamente
- Open: Email abierto → Actualiza métricas de engagement
```

### Métricas de Monitoreo

- **Delivery Rate:** Target > 95%
- **Bounce Rate:** Máximo permitido 5%
- **Complaint Rate:** Máximo permitido 0.1%
- **Open Rate:** Monitoreado para优化 contenido
- **Unsubscribe Rate:** Monitoreado para ajuste de frecuencia

---

## 5. Volumen Estimado y Plan de Crecimiento

### Plan de Ramp-Up (Escalamiento Gradual)

Entendemos la importancia de establecer una buena reputación de sender. Nuestro plan:

| Fase | Duración | Volumen Diario | Descripción |
|------|----------|----------------|-------------|
| **Fase 1** | Semanas 1-2 | 50-100 emails/día | Establecimiento inicial de reputación |
| **Fase 2** | Semanas 3-4 | 200-500 emails/día | Monitoreo intensivo de métricas |
| **Fase 3** | Mes 2 | 500-1,000 emails/día | Expansión gradual |
| **Fase 4** | Mes 3+ | 1,000-5,000 emails/día | Operación a escala completa |

### Volumen Anual Proyectado

- **Año 1:** 10,000 - 50,000 emails/year
- **Año 2:** 50,000 - 200,000 emails/year
- **Proyección:** Crecimiento orgánico basado en adopción de nuevas empresas usuarias

### Máximo Diario Inicial Solicitado

Solicitamos un límite inicial de **10,000 emails por día** para permitir flexibilidad operativa mientras escalamos gradualmente.

---

## 6. Cumplimiento Legal

### CAN-SPAM Act Compliance

Nuestra plataforma cumple con los requisitos del CAN-SPAM Act:

✅ **No usa encabezados engañosos** - Todos los asunto son claros y precisos
✅ **No usa direcciones engañosas** - Emails enviados desde dominio verificado
✅ **Identifica el remitente** - Información clara de la empresa origen
✅ **Informa la ubicación** - Dirección física válida en el pie del email
✅ **Ofrece opt-out claro** - Enlace de cancelación visible en cada email
✅ **Respeta opt-outs** - Procesamiento en menos de 10 días hábiles
✅ **Monitorea third-party** - No compramos listas, solo usamos datos de clientes existentes

### GDPR Compliance (Para usuarios en EU)

Para usuarios en la Unión Europea:

- **Consentimiento explícito:** Documentado en el contrato de la empresa
- **Derecho al olvido:** Proceso de eliminación de datos disponible
- **Portabilidad:** Exportación de datos disponible bajo solicitud
- **DPO:** Contacto designado para consultas de privacidad

### PIPEDA (Canadá) y Leyes Locales

- Cumplimiento con regulaciones de protección de datos locales
- Cada empresa usuaria es responsable de su propio cumplimiento

---

## 7. Infraestructura Técnica Configurada

### Dominio Verificado

- **Dominio:** `borls.com` (verificado en SES)
- **Región:** us-east-1

### Autenticación de Email Implementada

#### SPF (Sender Policy Framework)

```
Tipo: TXT
Nombre: borls.com
Valor: v=spf1 include:amazonses.com ~all
```

#### DKIM (DomainKeys Identified Mail)

- **Configurado vía AWS SES**
- **Selector:** `ses` (ses.borls.com)
- **Claves:** Rotadas automáticamente por SES

#### DMARC (Domain-based Message Authentication)

```
Tipo: TXT
Nombre: _dmarc.borls.com
Valor: v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@borls.com
```

**Política:** Cuarentena para emails que fallan autenticación
**Reporte:** Informes agregados enviados a dmarc-reports@borls.com

### Configuration Set de SES

**Nombre:** `borls-collection-config`

**Event Destinations Configurados:**
- ✅ **Delivery:** SNS Topic `borls-ses-deliveries`
- ✅ **Bounce:** SNS Topic `borls-ses-bounces`
- ✅ **Complaint:** SNS Topic `borls-ses-complaints`
- ✅ **Open:** SNS Topic `borls-ses-opens`
- ✅ **Click:** SNS Topic `borls-ses-clicks`

### Lambda Functions Deployadas

1. **`collection-email-worker`**
   - Procesa y envía emails transaccionales
   - Lenguaje: Rust (alto rendimiento)
   - Logs: CloudWatch
   - ARN: `arn:aws:lambda:us-east-1:399699578521:function:collection-email-worker`

2. **`collection-event-handler`**
   - Procesa eventos SNS de SES
   - Actualiza estado en Supabase
   - Lenguaje: Rust
   - ARN: `arn:aws:lambda:us-east-1:399699578521:function:collection-event-handler`

---

## 8. Contenido de los Emails

### Características del Contenido

- **Legítimo y Relevante:** Información sobre deudas/pagos reales
- **Personalizado:** Variables dinámicas (nombre, monto, fecha, empresa)
- **Profesional:** Formato limpio y claro
- **No Engañoso:** Asunto refleja exactamente el contenido
- **Con Llamado a la Acción:** Enlace de pago o contacto

### Template System

Utilizamos **TipTap Editor + Handlebars** para templates:
- Plantillas personalizables por empresa
- Variables dinámicas para personalización
- HTML optimizado para email clients
- Inline CSS para máxima compatibilidad

---

## 9. Medidas de Seguridad Adicionales

### Rate Limiting

- Modo desarrollo: 1 email/segundo (para testing)
- Modo producción: Límites configurables por cliente
- Protección contra abusos

### Validación de Datos

- Verificación de formato de emails
- Deduplicación de destinatarios
- Validación de monto y datos financieros
- Type safety con TypeScript

### Monitoreo Continuo

- **CloudWatch Dashboards:** Métricas en tiempo real
- **SNS Alerts:** Notificaciones instantáneas de anomalías
- **Audit Logs:** Registro de todas las operaciones
- **Supabase RLS:** Seguridad a nivel de base de datos

---

## 10. Resumen de Puntos Clave para Aprobación

| Aspecto | Nuestro Caso |
|---------|--------------|
| **Tipo de Email** | Transaccional (NO marketing) |
| **Origen de Datos** | Clientes existentes con contratos firmados |
| **Frecuencia** | 1-2 emails/cliente/mes máximo |
| **Opt-In** | Consentimiento documentado en contrato comercial |
| **Opt-Out** | Enlace claro en cada email, proceso automático |
| **Bounce Handling** | SNS Topics eliminan direcciones inválidas |
| **Complaint Handling** | Remoción inmediata, alerta automática |
| **Volumen Inicial** | 50-100 emails/día (ramp-up gradual) |
| **Compliance** | CAN-SPAM, GDPR ready |
| **Dominio** | borls.com verificado |
| **Autenticación** | SPF + DKIM + DMARC configurados |
| **Infraestructura** | Lambda + SNS + SES completos |
| **Casos de Uso** | Recordatorios de pago, notificaciones de cuenta |

---

## 11. Compromiso con AWS

Nos comprometemos a:

1. **Mantener tasas de bounce < 5%** en todo momento
2. **Mantener tasas de complaint < 0.1%** en todo momento
3. **Responder** a cualquier запрос de información adicional en menos de 24 horas
4. **Implementar mejoras** si AWS identifica áreas de preocupación
5. **Reportar proactivamente** cualquier anomalía en nuestras métricas

---

## Información de Contacto

- **Cuenta AWS:** cllctnai@gmail.com
- **Email de contacto:** manager@borls.com
- **Sitio web:** https://borls.com
- **Documentación técnica:** [Enlace a docs del proyecto]

---

**Solicitud:** Solicitamos respetuosamente que se reconsidere nuestra solicitud de acceso a producción para AWS SES. Hemos implementado una infraestructura robusta que demuestra nuestro compromiso con las mejores prácticas de email marketing y cumplimiento normativo.

Quedamos a su disposición para proporcionar cualquier información adicional que requieran.

Atentamente,

**Bryan**
**CTO / Desarrollador Principal**
**Borls Collections Management System**
Email: manager@borls.com
Sitio: https://borls.com

---

*Este documento ha sido preparado para demostrar nuestro compromiso con las mejores prácticas de envío de emails transaccionales y cumplimiento con las políticas de AWS SES.*
