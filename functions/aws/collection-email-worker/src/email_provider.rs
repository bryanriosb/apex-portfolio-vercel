use async_trait::async_trait;
use std::error::Error;
use crate::models::Attachment;

/// Estructura que encapsula todos los datos necesarios para enviar un email
#[derive(Debug, Clone)]
pub struct EmailMessage {
    pub to: Vec<String>,
    pub subject: String,
    pub html_body: String,
    pub text_body: String,
    pub from: String,
    pub attachments: Vec<Attachment>,
    pub client_id: Option<String>,
    pub execution_id: Option<String>,
    pub message_id: Option<String>,
}

/// Resultado del envío de email con metadata del proveedor
#[derive(Debug, Clone)]
pub struct SendResult {
    pub message_id: String,
    pub provider: String,
    pub metadata: Option<serde_json::Value>,
}

/// Trait que define la interfaz común para todos los proveedores de email
/// Permite cambiar de proveedor sin modificar la lógica de negocio
#[async_trait]
pub trait EmailProvider: Send + Sync {
    /// Envía un email usando el proveedor específico
    async fn send_email(&self, message: EmailMessage) -> Result<SendResult, Box<dyn Error + Send + Sync>>;
    
    /// Retorna el nombre del proveedor (para logging y debugging)
    fn provider_name(&self) -> &str;
}
