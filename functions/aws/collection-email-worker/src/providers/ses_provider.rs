use async_trait::async_trait;
use aws_sdk_ses::Client;
use aws_sdk_ses::types::RawMessage;
use aws_sdk_ses::primitives::Blob;
use std::error::Error;
use mail_builder::MessageBuilder;
use log::info;

use crate::email_provider::{EmailProvider, EmailMessage, SendResult};

/// Proveedor de email usando AWS SES
/// Wrapper del servicio SES existente que implementa EmailProvider trait
pub struct SesProvider {
    client: Client,
    configuration_set: String,
    tracking_url: String,
}

impl SesProvider {
    pub async fn new() -> Self {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let client = Client::new(&config);
        let configuration_set = std::env::var("SES_CONFIGURATION_SET")
            .unwrap_or_else(|_| "apex-collection-tracking".to_string());
        let tracking_url = std::env::var("TRACKING_URL")
            .unwrap_or_else(|_| "https://apex.borls.com".to_string());
        
        Self { 
            client, 
            configuration_set,
            tracking_url,
        }
    }

    fn add_client_tracking(&self, html: &str, client_id: Option<&str>, execution_id: Option<&str>, message_id: Option<&str>) -> String {
        if client_id.is_none() || execution_id.is_none() {
            return html.to_string();
        }

        let client_id = client_id.unwrap();
        let execution_id = execution_id.unwrap();
        let msg_id = message_id.unwrap_or("");

        let tracking_params = format!(
            "?client_id={}&execution_id={}&message_id={}",
            client_id, execution_id, msg_id
        );

        info!("Client tracking params: {}", tracking_params);

        html.to_string()
    }
}

#[async_trait]
impl EmailProvider for SesProvider {
    async fn send_email(&self, message: EmailMessage) -> Result<SendResult, Box<dyn Error + Send + Sync>> {
        let html_with_pixel = self.add_client_tracking(
            &message.html_body,
            message.client_id.as_deref(),
            message.execution_id.as_deref(),
            message.message_id.as_deref()
        );

        let mut builder = MessageBuilder::new()
            .from(message.from.as_str())
            .to(message.to.as_str())
            .subject(message.subject.as_str())
            .text_body(message.text_body.as_str())
            .html_body(html_with_pixel);

        if !message.attachments.is_empty() {
            info!("Adding {} attachments to email", message.attachments.len());
            for attachment in &message.attachments {
                info!("Adding attachment: {} ({} bytes, type: {:?})",
                    attachment.name,
                    attachment.data.len(),
                    attachment.file_type
                );
                builder = builder.attachment(
                    attachment.file_type.as_deref().unwrap_or("application/octet-stream"),
                    &attachment.name,
                    attachment.data.clone()
                );
            }
        } else {
            info!("No attachments to add to email");
        }

        let raw_email = builder.write_to_vec()?;
        info!("Generated raw email of {} bytes", raw_email.len());
        info!("Using Configuration Set: {} (SES will add tracking pixel automatically)", self.configuration_set);

        let mut send_request = self.client
            .send_raw_email()
            .raw_message(
                RawMessage::builder()
                    .data(Blob::new(raw_email))
                    .build()?
            );

        if !self.configuration_set.is_empty() {
            send_request = send_request.configuration_set_name(&self.configuration_set);
        }

        let output = send_request.send().await?;

        let message_id = output.message_id;
        info!("Email sent successfully via SES, message_id: {}", message_id);
        
        Ok(SendResult {
            message_id,
            provider: "ses".to_string(),
            metadata: None,
        })
    }

    fn provider_name(&self) -> &str {
        "AWS SES"
    }
}
