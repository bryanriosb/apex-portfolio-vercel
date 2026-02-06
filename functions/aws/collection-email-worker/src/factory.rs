use log::info;
use std::sync::Arc;

use crate::email_provider::EmailProvider;
use crate::providers::{SesProvider, BrevoProvider};

/// Factory para crear instancias del proveedor de email correcto
/// basado en la variable de entorno EMAIL_PROVIDER
/// 
/// Valores soportados:
/// - "ses" (default): AWS Simple Email Service
/// - "brevo": Brevo (anteriormente SendinBlue)
pub async fn create_email_provider() -> Arc<dyn EmailProvider> {
    let provider_type = std::env::var("EMAIL_PROVIDER")
        .unwrap_or_else(|_| "ses".to_string())
        .to_lowercase();

    info!("Creating email provider: {}", provider_type);

    match provider_type.as_str() {
        "brevo" => {
            info!("Using Brevo email provider");
            Arc::new(BrevoProvider::new())
        }
        "ses" | _ => {
            info!("Using AWS SES email provider (default)");
            Arc::new(SesProvider::new().await)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_factory_defaults_to_ses() {
        // Sin configurar EMAIL_PROVIDER, debería usar SES
        std::env::remove_var("EMAIL_PROVIDER");
        let provider = create_email_provider().await;
        assert_eq!(provider.provider_name(), "AWS SES");
    }

    #[tokio::test]
    async fn test_factory_creates_ses() {
        std::env::set_var("EMAIL_PROVIDER", "ses");
        let provider = create_email_provider().await;
        assert_eq!(provider.provider_name(), "AWS SES");
    }
}
