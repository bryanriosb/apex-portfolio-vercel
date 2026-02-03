use aws_sdk_ses::Client;
use aws_sdk_ses::types::{RawMessage};
use aws_sdk_ses::primitives::Blob;
use std::error::Error;
use crate::models::Attachment;
use mail_builder::MessageBuilder;

pub struct SesService {
    client: Client,
    tracking_url: String,
}

impl SesService {
    pub async fn new() -> Self {
        let config = aws_config::load_defaults(aws_config::BehaviorVersion::latest()).await;
        let client = Client::new(&config);
        let tracking_url = std::env::var("TRACKING_URL")
            .unwrap_or_else(|_| "https://apex-portfolio.vercel.app".to_string());
        Self { client, tracking_url }
    }

    pub async fn send_email(
        &self,
        to: &str,
        subject: &str,
        html_body: &str,
        text_body: &str,
        source: &str,
        attachments: Option<&Vec<Attachment>>,
        client_id: Option<&str>,
        execution_id: Option<&str>,
        message_id: Option<&str>,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let html_with_pixel = self.inject_tracking_pixel(html_body, client_id, execution_id, message_id);

        let mut builder = MessageBuilder::new()
            .from(source)
            .to(to)
            .subject(subject)
            .text_body(text_body)
            .html_body(html_with_pixel);

        if let Some(attachments) = attachments {
            log::info!("Adding {} attachments to email", attachments.len());
            for attachment in attachments {
                log::info!("Adding attachment: {} ({} bytes, type: {:?})", 
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
            log::info!("No attachments to add to email");
        }

        let raw_email = builder.write_to_vec()?;
        log::info!("Generated raw email of {} bytes", raw_email.len());
        
        let output = self.client
            .send_raw_email()
            .raw_message(
                RawMessage::builder()
                    .data(Blob::new(raw_email))
                    .build()?
            )
            .send()
            .await?;
        
        log::info!("Email sent successfully, message_id: {}", output.message_id);
        Ok(output.message_id)
    }

    fn inject_tracking_pixel(&self, html: &str, client_id: Option<&str>, execution_id: Option<&str>, message_id: Option<&str>) -> String {
        if client_id.is_none() || execution_id.is_none() {
            return html.to_string();
        }

        let client_id = client_id.unwrap();
        let execution_id = execution_id.unwrap();
        let msg_id = message_id.unwrap_or("");

        let pixel_url = format!(
            "{}/api/track/open?client_id={}&execution_id={}&message_id={}",
            self.tracking_url, client_id, execution_id, msg_id
        );

        log::info!("Injecting tracking pixel: {}", pixel_url);

        let pixel = format!(
            r###"<img src="{}" alt="" width="1" height="1" style="display:none;" />"###,
            pixel_url
        );

        if html.contains("</body>") {
            html.replace("</body>", &format!("{}</body>", pixel))
        } else if html.contains("</html>") {
            html.replace("</html>", &format!("{}</html>", pixel))
        } else {
            format!("{}{}", html, pixel)
        }
    }
}
