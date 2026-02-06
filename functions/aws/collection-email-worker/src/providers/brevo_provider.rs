use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::error::Error;
use log::{info, error};

use crate::email_provider::{EmailProvider, EmailMessage, SendResult};

/// Proveedor de email usando Brevo (anteriormente SendinBlue)
/// Usa la API transaccional /v3/smtp/email
pub struct BrevoProvider {
    client: Client,
    api_url: String,
    api_key: String,
}

#[derive(Serialize, Debug)]
struct BrevoSender {
    name: String,
    email: String,
}

#[derive(Serialize, Debug)]
struct BrevoRecipient {
    email: String,
    name: Option<String>,
}

#[derive(Serialize, Debug)]
struct BrevoAttachment {
    content: String,  // base64 encoded
    name: String,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct BrevoEmailRequest {
    sender: BrevoSender,
    to: Vec<BrevoRecipient>,
    subject: String,
    html_content: String,
    text_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    attachment: Option<Vec<BrevoAttachment>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct BrevoEmailResponse {
    message_id: String,
}

impl BrevoProvider {
    pub fn new() -> Self {
        let api_url = std::env::var("BREVO_SMTP_API_URL")
            .unwrap_or_else(|_| "https://api.brevo.com/v3/smtp/email".to_string());
        let api_key = std::env::var("BREVO_API_KEY")
            .expect("BREVO_API_KEY must be set when using Brevo provider");
        
        Self {
            client: Client::new(),
            api_url,
            api_key,
        }
    }

    fn parse_sender(from: &str) -> BrevoSender {
        // Parse "Name <email@domain.com>" or just "email@domain.com"
        if let Some(start) = from.find('<') {
            if let Some(end) = from.find('>') {
                let name = from[..start].trim().to_string();
                let email = from[start + 1..end].trim().to_string();
                return BrevoSender { name, email };
            }
        }
        
        // Default: use email as both name and email
        BrevoSender {
            name: from.to_string(),
            email: from.to_string(),
        }
    }
}

#[async_trait]
impl EmailProvider for BrevoProvider {
    async fn send_email(&self, message: EmailMessage) -> Result<SendResult, Box<dyn Error + Send + Sync>> {
        info!("Sending email via Brevo to: {}", message.to);

        // Convert attachments to base64
        let attachments = if !message.attachments.is_empty() {
            let brevo_attachments: Vec<BrevoAttachment> = message.attachments
                .iter()
                .map(|att| {
                    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &att.data);
                    BrevoAttachment {
                        content: encoded,
                        name: att.name.clone(),
                    }
                })
                .collect();
            Some(brevo_attachments)
        } else {
            None
        };

        let sender = Self::parse_sender(&message.from);
        
        let request_body = BrevoEmailRequest {
            sender,
            to: vec![BrevoRecipient {
                email: message.to.clone(),
                name: None,
            }],
            subject: message.subject.clone(),
            html_content: message.html_body.clone(),
            text_content: Some(message.text_body.clone()),
            attachment: attachments,
        };

        info!("Brevo API request prepared, sending to: {}", self.api_url);

        let response = self.client
            .post(&self.api_url)
            .header("api-key", &self.api_key)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();
        
        if !status.is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("Brevo API error ({}): {}", status, error_text);
            return Err(format!("Brevo API error: {} - {}", status, error_text).into());
        }

        let brevo_response: BrevoEmailResponse = response.json().await?;
        
        info!("Email sent successfully via Brevo, message_id: {}", brevo_response.message_id);

        Ok(SendResult {
            message_id: brevo_response.message_id,
            provider: "brevo".to_string(),
            metadata: None,
        })
    }

    fn provider_name(&self) -> &str {
        "Brevo"
    }
}
