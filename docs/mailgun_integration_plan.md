# Plan de Implementación: Mailgun como Proveedor Alternativo

> **Proyecto:** Apex Portfolio - Extensión Multi-Proveedor de Email  
> **Fecha:** 2026-02-03  
> **Versión:** 1.0  
> **Enfoque:** Multi-proveedor con selección por campaña + Paridad completa

---

## 🎯 **Objetivo**

Extender el sistema actual para soportar Mailgun como proveedor de emails alternativo a AWS SES, con selección por campaña y paridad completa de funcionalidades.

## 📊 **Análisis Comparativo: SES vs Mailgun**

| Característica | AWS SES | Mailgun | Impacto en Implementación |
|---------------|----------|---------|--------------------------|
| **Envío API** | `SendRawEmailCommand` | `POST /v3/{domain}/messages` | ✅ Fácil migración |
| **Tracking Opens** | Configuration Set | Webhook + Tracking habilitado | ✅ Paridad completa |
| **Tracking Clicks** | Configuration Set | Webhook + Tracking habilitado | ✅ Paridad completa |
| **Webhook Events** | SNS → Lambda | Webhook directo → Lambda | ✅ Similar arquitectura |
| **Attachments** | Raw message | Multipart form data | ✅ Soporte nativo |
| **Templates** | Handlebars personalizado | Mailgun Templates + Handlebars | ✅ Compatible |
| **Bounce Handling** | Eventos SNS | Webhook events | ✅ Paridad completa |
| **Costo** | $0.0001/email | $0.80/1,000 emails | 📈 8x más caro pero mejor analytics |
| **Analytics** | CloudWatch (limitado) | Dashboard nativo avanzado | 🎯 Ventaja significativa |

---

## 🏗️ **Diseño de Arquitectura Multi-Proveedor**

### **Flujo Actual (SES)**
```
Wizard → Lambda collection-email-worker → AWS SES → SNS → Lambda collection-event-handler → Supabase
```

### **Flujo Extendido (Multi-Proveedor)**
```
Wizard → Lambda collection-email-worker
   ↓                    ↓
AWS SES ← Provider Selection → Mailgun API
   ↓                    ↓
SNS → collection-event-handler ← Webhook ← Mailgun Events
   ↓                    ↓
Supabase ← Event Unification
```

---

## 📋 **Plan de Implementación por Fases**

### **Fase 1: Base de Datos y Configuración** (Estimado: 2 días)

#### **1.1 Extensión de Base de Datos**

```sql
-- Nueva tabla para proveedores de email
CREATE TABLE email_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id),
  
  -- Configuración del proveedor
  provider_type VARCHAR(20) NOT NULL, -- 'aws_ses', 'mailgun'
  provider_name VARCHAR(100) NOT NULL, -- 'Production SES', 'Mailgun EU', etc.
  
  -- Configuración SES
  ses_region VARCHAR(50),
  ses_configuration_set VARCHAR(255),
  
  -- Configuración Mailgun  
  mailgun_domain VARCHAR(255),
  mailgun_api_key TEXT, -- encrypted
  mailgun_region VARCHAR(10), -- 'us', 'eu'
  mailgun_webhook_signing_key TEXT, -- encrypted
  
  -- Configuración común
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  
  -- Métricas y límites
  daily_limit INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Prioridad para selección
  priority INTEGER DEFAULT 1, -- 1 = highest
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar collection_executions
ALTER TABLE collection_executions 
ADD COLUMN email_provider_id UUID REFERENCES email_providers(id),
ADD COLUMN provider_metadata JSONB DEFAULT '{}';

-- Modificar collection_clients
ALTER TABLE collection_clients 
ADD COLUMN provider_message_id VARCHAR(255),
ADD COLUMN provider_response JSONB DEFAULT '{}';

-- Modificar collection_events
ALTER TABLE collection_events 
ADD COLUMN provider_type VARCHAR(20),
ADD COLUMN provider_event_id VARCHAR(255);
```

#### **1.2 Migración de Datos**

```sql
-- Migrar configuración SES existente
INSERT INTO email_providers (
  business_account_id, provider_type, provider_name,
  ses_region, ses_configuration_set, from_email, from_name,
  is_default, is_active
)
SELECT 
  business_account_id, 
  'aws_ses'::VARCHAR,
  'AWS SES ' || ses_region,
  ses_region,
  ses_configuration_set,
  email_from_address,
  email_from_name,
  TRUE,
  TRUE
FROM collection_config;

-- Actualizar ejecuciones existentes
UPDATE collection_executions 
SET email_provider_id = ep.id
FROM email_providers ep 
WHERE ep.provider_type = 'aws_ses' 
  AND collection_executions.email_provider_id IS NULL;
```

---

### **Fase 2: Implementación SDK Mailgun en Rust** (Estimado: 3 días)

#### **2.1 Dependencies Cargo.toml**

```toml
[dependencies]
# Actuales
aws-sdk-ses = "1.0"
lambda_runtime = "0.8"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Nuevas para Mailgun
reqwest = { version = "0.11", features = ["json", "multipart"] }
mailgun-rs = "0.2"  # o implementación custom con reqwest
chrono = { version = "0.4", features = ["serde"] }
```

#### **2.2 Estructura de Providers**

```rust
// src/providers/mod.rs
pub mod aws_ses;
pub mod mailgun;
pub mod provider_trait;

pub use provider_trait::*;

// src/providers/provider_trait.rs
#[async_trait]
pub trait EmailProvider {
    async fn send_email(
        &self,
        recipient: &str,
        subject: &str,
        html_body: &str,
        text_body: &str,
        attachments: &[Attachment],
        tracking_data: &TrackingData
    ) -> Result<SendResult, ProviderError>;
    
    async fn validate_credentials(&self) -> Result<bool, ProviderError>;
    fn get_provider_type(&self) -> ProviderType;
}

// src/providers/aws_ses.rs
pub struct AwsSesProvider {
    client: aws_sdk_ses::Client,
    config_set: Option<String>,
}

#[async_trait]
impl EmailProvider for AwsSesProvider {
    async fn send_email(/* ... */) -> Result<SendResult, ProviderError> {
        // Implementación actual de SES
    }
}

// src/providers/mailgun.rs
pub struct MailgunProvider {
    client: reqwest::Client,
    domain: String,
    api_key: String,
    region: MailgunRegion,
}

#[async_trait]
impl EmailProvider for MailgunProvider {
    async fn send_email(
        &self,
        recipient: &str,
        subject: &str,
        html_body: &str,
        text_body: &str,
        attachments: &[Attachment],
        tracking_data: &TrackingData
    ) -> Result<SendResult, ProviderError> {
        let mut form = reqwest::multipart::Form::new()
            .part("from", self.format_from_address())
            .part("to", recipient.to_string())
            .part("subject", subject.to_string())
            .part("html", html_body.to_string())
            .part("text", text_body.to_string());
            
        // Habilitar tracking
        if tracking_data.track_opens {
            form = form.part("o:tracking", "yes");
        }
        if tracking_data.track_clicks {
            form = form.part("o:tracking-clicks", "htmlonly");
        }
        
        // Adjuntos
        for attachment in attachments {
            let part = reqwest::multipart::Part::bytes(attachment.content.clone())
                .file_name(attachment.filename.clone())
                .mime_str(attachment.content_type.clone())?;
            form = form.part("attachment", part);
        }
        
        let response = self.client
            .post(&self.format_messages_url())
            .basic_auth("api", Some(&self.api_key))
            .multipart(form)
            .send()
            .await?;
            
        self.parse_mailgun_response(response).await
    }
    
    async fn validate_credentials(&self) -> Result<bool, ProviderError> {
        let response = self.client
            .get(&format!("https://api{}.mailgun.net/v3/domains", self.region))
            .basic_auth("api", Some(&self.api_key))
            .send()
            .await?;
            
        Ok(response.status().is_success())
    }
    
    fn get_provider_type(&self) -> ProviderType {
        ProviderType::Mailgun
    }
}

impl MailgunProvider {
    fn format_messages_url(&self) -> String {
        format!("https://api{}.mailgun.net/v3/{}/messages", self.region, self.domain)
    }
    
    fn format_from_address(&self) -> String {
        format!("{} <{}>", self.from_name, self.from_email)
    }
    
    async fn parse_mailgun_response(
        &self, 
        response: reqwest::Response
    ) -> Result<SendResult, ProviderError> {
        let status = response.status();
        let body: serde_json::Value = response.json().await?;
        
        if status.is_success() {
            Ok(SendResult {
                message_id: body["id"].as_str().unwrap_or("").to_string(),
                provider_message_id: body["id"].as_str().unwrap_or("").to_string(),
                status: "sent".to_string(),
                provider_response: body,
            })
        } else {
            Err(ProviderError::SendFailed(format!(
                "Mailgun API error: {} - {}", 
                status, 
                body["message"].as_str().unwrap_or("Unknown error")
            )))
        }
    }
}
```

#### **2.3 Factory Pattern para Provider Selection**

```rust
// src/providers/factory.rs
pub struct ProviderFactory;

impl ProviderFactory {
    pub async fn create_provider(
        config: &EmailProviderConfig
    ) -> Result<Box<dyn EmailProvider>, ProviderError> {
        match config.provider_type {
            ProviderType::AwsSes => {
                let ses_config = aws_config::load_from_env().await;
                let client = aws_sdk_ses::Client::new(&ses_config);
                
                Ok(Box::new(AwsSesProvider {
                    client,
                    config_set: config.ses_configuration_set.clone(),
                }))
            }
            ProviderType::Mailgun => {
                Ok(Box::new(MailgunProvider {
                    client: reqwest::Client::new(),
                    domain: config.mailgun_domain.clone(),
                    api_key: config.mailgun_api_key.clone(),
                    region: config.mailgun_region,
                }))
            }
        }
    }
}
```

---

### **Fase 3: Modificación Lambda Principal** (Estimado: 2 días)

#### **3.1 Actualización collection-email-worker**

```rust
// src/main.rs (modificado)
async fn process_execution(event: LambdaEvent<Request>) -> Result<Response, Error> {
    let execution_id = event.payload.execution_id;
    
    // Obtener configuración desde Supabase
    let execution = get_execution_with_provider(&execution_id).await?;
    let provider_config = execution.email_provider.unwrap();
    
    // Crear provider dinámicamente
    let provider = ProviderFactory::create_provider(&provider_config).await?;
    
    // Validar credenciales (opcional, solo en development)
    if cfg!(debug_assertions) {
        provider.validate_credentials().await?;
    }
    
    // Procesar clientes como antes
    for client in pending_clients {
        let send_result = provider.send_email(
            &client.email,
            &rendered_subject,
            &rendered_html,
            &rendered_text,
            &attachments,
            &tracking_data
        ).await?;
        
        // Actualizar client con provider-specific data
        update_client_sent(
            client.id, 
            &send_result.provider_message_id,
            send_result.provider_response
        ).await?;
    }
    
    Ok(Response::new(json!({"status": "completed"})))
}
```

---

### **Fase 4: Webhooks Unificados** (Estimado: 3 días)

#### **4.1 Nueva Lambda collection-webhook-handler**

```rust
// src/webhook_handler.rs
#[derive(Debug, Deserialize)]
#[serde(tag = "event")]
enum WebhookEvent {
    #[serde(rename = "delivered")]
    Delivered {
        id: String,
        recipient: String,
        timestamp: String,
    },
    #[serde(rename = "opened")]
    Opened {
        id: String,
        recipient: String,
        timestamp: String,
        ip: Option<String>,
        user_agent: Option<String>,
    },
    #[serde(rename = "clicked")]
    Clicked {
        id: String,
        recipient: String,
        timestamp: String,
        url: String,
        ip: Option<String>,
    },
    #[serde(rename = "failed")]
    Failed {
        id: String,
        recipient: String,
        severity: String, // "temporary" or "permanent"
        reason: String,
    },
}

#[derive(Debug, Deserialize)]
#[serde(tag = "provider")]
enum ProviderWebhook {
    #[serde(rename = "mailgun")]
    Mailgun {
        signature: MailgunSignature,
        #[serde(rename = "event-data")]
        event: WebhookEvent,
    },
    #[serde(rename = "aws_ses")]
    AwsSes {
        #[serde(rename = "notificationType")]
        notification_type: String,
        mail: SesMail,
        #[serde(flatten)]
        event_data: serde_json::Value,
    },
}

pub async fn handle_webhook(
    event: LambdaEvent<ProviderWebhook>
) -> Result<Response, Error> {
    match event.payload {
        ProviderWebhook::Mailgun { signature, event } => {
            // Validar firma Mailgun
            if !verify_mailgun_signature(&signature)? {
                return Err(Error::Unauthorized);
            }
            
            process_mailgun_event(event).await?;
        }
        ProviderWebhook::AwsSes { notification_type, mail, event_data } => {
            process_ses_event(notification_type, mail, event_data).await?;
        }
    }
    
    Ok(Response::new(json!({"status": "processed"})))
}

async fn process_mailgun_event(event: WebhookEvent) -> Result<(), Error> {
    match event {
        WebhookEvent::Delivered { id, recipient, timestamp } => {
            update_client_status_by_provider_id(&id, "delivered", &timestamp).await?;
            log_collection_event(&id, "email_delivered", json!({
                "provider_type": "mailgun",
                "recipient": recipient
            })).await?;
        }
        WebhookEvent::Opened { id, recipient, timestamp, ip, user_agent } => {
            update_client_status_by_provider_id(&id, "opened", &timestamp).await?;
            log_collection_event(&id, "email_opened", json!({
                "provider_type": "mailgun",
                "recipient": recipient,
                "ip": ip,
                "user_agent": user_agent
            })).await?;
        }
        WebhookEvent::Clicked { id, recipient, timestamp, url, ip } => {
            log_collection_event(&id, "email_clicked", json!({
                "provider_type": "mailgun",
                "recipient": recipient,
                "url": url,
                "ip": ip
            })).await?;
        }
        WebhookEvent::Failed { id, recipient, severity, reason } => {
            let status = if severity == "permanent" { "bounced" } else { "failed" };
            update_client_status_by_provider_id(&id, status, &chrono::Utc::now().to_rfc3339()).await?;
            log_collection_event(&id, "email_bounced", json!({
                "provider_type": "mailgun",
                "recipient": recipient,
                "severity": severity,
                "reason": reason
            })).await?;
        }
    }
    Ok(())
}
```

#### **4.2 Configuración API Gateway + Lambda**

```yaml
# template.yaml (Serverless Framework)
functions:
  webhookHandler:
    handler: target/release/webhook-handler
    events:
      - http:
          path: /webhooks/mailgun
          method: post
      - http:
          path: /webhooks/ses  
          method: post
    environment:
      SUPABASE_URL: ${ssm:/supabase/url}
      SUPABASE_KEY: ${ssm:/supabase/key}
      MAILGUN_WEBHOOK_SIGNING_KEY: ${ssm:/mailgun/webhook-key}
```

---

### **Fase 5: Frontend - Selección de Proveedor** (Estimado: 2 días)

#### **5.1 Modificación Wizard**

```typescript
// components/collection/wizard/Step2Configuration.tsx
export function Step2Configuration({ 
  executionData, 
  updateExecutionData,
  availableProviders 
}: Step2ConfigurationProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>(
    availableProviders.find(p => p.is_default)?.id || ''
  );

  return (
    <div className="space-y-6">
      <div>
        <Label>Proveedor de Email</Label>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un proveedor" />
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map(provider => (
              <SelectItem key={provider.id} value={provider.id}>
                <div className="flex items-center gap-2">
                  {provider.provider_type === 'aws_ses' && <AwsIcon />}
                  {provider.provider_type === 'mailgun' && <MailgunIcon />}
                  {provider.provider_name}
                  {provider.is_default && <Badge variant="secondary">Default</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ProviderStats providerId={selectedProvider} />
    </div>
  );
}

// components/collection/provider/ProviderStats.tsx
function ProviderStats({ providerId }: { providerId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['provider-stats', providerId],
    queryFn: () => getProviderStats(providerId)
  });

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estadísticas del Proveedor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Entrega"
            value={`${stats.delivery_rate}%`}
            trend={stats.delivery_trend}
          />
          <MetricCard
            label="Apertura"
            value={`${stats.open_rate}%`}
            trend={stats.open_trend}
          />
          <MetricCard
            label="Click"
            value={`${stats.click_rate}%`}
            trend={stats.click_trend}
          />
          <MetricCard
            label="Bounce"
            value={`${stats.bounce_rate}%`}
            trend={stats.bounce_trend}
            variant="danger"
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### **Fase 6: Dashboard de Analytics Multi-Proveedor** (Estimado: 3 días)

#### **6.1 Nuevo Dashboard Comparativo**

```typescript
// app/admin/collection/analytics/page.tsx
export default function CollectionAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics de Email Providers</h1>
        <DateRangePicker />
      </div>
      
      <ProviderComparisonChart />
      <ProviderMetricsGrid />
      <RecentEventsTable />
    </div>
  );
}

// components/collection/analytics/ProviderComparisonChart.tsx
function ProviderComparisonChart() {
  const { data: providers } = useQuery({
    queryKey: ['providers-with-metrics'],
    queryFn: getProvidersWithMetrics
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparación de Proveedores</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={providers}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="provider_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="delivery_rate" fill="#8884d8" name="Delivery Rate %" />
            <Bar dataKey="open_rate" fill="#82ca9d" name="Open Rate %" />
            <Bar dataKey="click_rate" fill="#ffc658" name="Click Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 🚀 **Plan de Rollout**

### **Week 1: Base de Datos + SDK**
- ✅ Fase 1: Schema + Migración
- ✅ Fase 2: SDK Mailgun + Tests

### **Week 2: Backend + Webhooks**  
- ✅ Fase 3: Lambda actualizada
- ✅ Fase 4: Webhook handler + API Gateway

### **Week 3: Frontend + Analytics**
- ✅ Fase 5: UI selección proveedor
- ✅ Fase 6: Dashboard comparativo

### **Week 4: Testing + Rollout**
- 🔧 Tests E2E con ambos providers
- 🔧 Documentación + Training
- 🚀 Production rollout (flag feature)

---

## 📊 **Métricas de Éxito**

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| **Paridad Funcional** | 100% de features de SES | Checklist de features |
| **Performance** | <200ms latencia added | Benchmarks de Lambda |
| **Uso Multi-Proveedor** | 30% de campañas con Mailgun | Analytics de selección |
| **Tracking Accuracy** | 99.9% eventos procesados | Comparación de eventos |
| **Cost Efficiency** | <15% aumento en costos totales | Análisis de costos |

---

## 🔧 **Variables de Entorno Adicionales**

```bash
# Mailgun Configuration
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.mailgun.org
MAILGUN_REGION=us  # us | eu
MAILGUN_WEBHOOK_SIGNING_KEY=your_webhook_signing_key

# Webhook URLs
MAILGUN_WEBHOOK_URL=https://your-api.execute-api.us-east-1.amazonaws.com/prod/webhooks/mailgun
AWS_WEBHOOK_URL=https://your-api.execute-api.us-east-1.amazonaws.com/prod/webhooks/ses
```

---

## ⚠️ **Riesgos y Mitigaciones**

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Performance degradation** | Alto | Lazy loading, caching de providers |
| **Webhook security** | Crítico | Signature validation, IP whitelisting |
| **Cost increase** | Medio | Monitoring y alerts de costos |
| **Data inconsistency** | Alto | Transactions, retry mechanisms |
| **Vendor lock-in** | Bajo | Provider abstraction layer |

---

## 💰 **Análisis de Costos**

### **Costo Actual (SES)**
- 16,340 emails/mes × $0.0001 = **$1.64 USD/mes**
- Lambda functions: ~$1.00 USD/mes
- **Total actual: ~$2.64 USD/mes**

### **Costo Proyecto (Mailgun)**
- 16,340 emails/mes × $0.0008 = **$13.07 USD/mes**
- Lambda functions: ~$1.00 USD/mes
- **Total Mailgun: ~$14.07 USD/mes**

### **Costo Híbrido (50/50)**
- SES (8,170 emails): $0.82
- Mailgun (8,170 emails): $6.54
- Lambda: $1.00
- **Total híbrido: ~$8.36 USD/mes**

### **ROI Justification**
- **Mejor deliverability**: Potencial +5-10% inbox placement
- **Analytics avanzados**: Optimización de campañas
- **Soporte 24/7**: Respuesta rápida a problemas
- **A/B testing**: Comparación real de rendimiento

---

## 🎯 **Conclusión**

Este plan permite implementar Mailgun como proveedor alternativo con:

- ✅ **Paridad completa** con funcionalidades SES existentes
- ✅ **Selección flexible** por campaña con analytics comparativos  
- ✅ **Arquitectura escalable** para añadir más providers en el futuro
- ✅ **Risk mitigated** con rollout gradual y feature flags

**Next steps recomendados:**
1. Validar presupuesto para costos adicionales de Mailgun
2. Setup de cuenta Mailgun con credenciales de prueba
3. Aprobar arquitectura y comenzar implementación Fase 1
4. Definir KPIs específicos para evaluar éxito del proyecto

---

*Última actualización: 2026-02-03*