use reqwest::Client;
use serde_json::json;
use std::error::Error;
use crate::models::{CollectionClient, CollectionExecution, EmailTemplate, Attachment};
use std::env;

pub struct SupabaseService {
    client: Client,
    base_url: String,
    api_key: String,
}

impl SupabaseService {
    pub fn new() -> Self {
        let base_url = env::var("SUPABASE_URL").expect("SUPABASE_URL must be set");
        let api_key = env::var("SUPABASE_SECRET_KEY").expect("SUPABASE_SECRET_KEY must be set");
        
        Self {
            client: Client::new(),
            base_url,
            api_key,
        }
    }

    pub async fn get_business_name(&self, business_id: &str) -> String {
        let url = format!("{}/rest/v1/businesses?id=eq.{}&select=name", self.base_url, business_id);
        
        let response = match self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await {
                Ok(r) => r,
                Err(e) => {
                    log::error!("Failed to request business name: {}", e);
                    return "APEX".to_string();
                }
            };

        if !response.status().is_success() {
            log::error!("Failed to fetch business name: status {}", response.status());
            return "APEX".to_string();
        }

        if let Ok(businesses) = response.json::<Vec<serde_json::Value>>().await {
            if let Some(first) = businesses.first() {
                if let Some(name) = first.get("name").and_then(|v| v.as_str()) {
                    return name.to_string();
                }
            }
        }
        
        "APEX".to_string()
    }

    pub async fn get_execution(&self, execution_id: &str) -> Result<CollectionExecution, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/collection_executions?id=eq.{}&select=*", self.base_url, execution_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch execution: {}", response.status()).into());
        }

        let executions: Vec<CollectionExecution> = response.json().await?;
        
        let execution = executions.first()
            .cloned()
            .ok_or_else(|| Box::<dyn Error + Send + Sync>::from("Execution not found"))?;

        log::info!("Fetched execution: id={}, attachment_ids={:?}", execution.id, execution.attachment_ids);
        Ok(execution)
    }

    pub async fn get_attachments(&self, ids: &[String]) -> Result<Vec<Attachment>, Box<dyn Error + Send + Sync>> {
        if ids.is_empty() {
            log::info!("get_attachments called with empty ids");
            return Ok(vec![]);
        }

        log::info!("Fetching attachments for ids: {:?}", ids);
        let ids_str = ids.join(",");
        let url = format!("{}/rest/v1/collection_attachments?id=in.({})&select=*", self.base_url, ids_str);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch attachments: {}", response.status()).into());
        }

        let mut attachments: Vec<Attachment> = response.json().await?;
        log::info!("Found {} attachment records in database", attachments.len());

        for attachment in &mut attachments {
            let download_url = format!("{}/storage/v1/object/authenticated/{}/{}", 
                self.base_url, 
                attachment.storage_bucket, 
                attachment.storage_path
            );

            log::info!("Downloading attachment: {} from {}", attachment.name, download_url);

            let download_res = self.client.get(&download_url)
                .header("apikey", &self.api_key)
                .header("Authorization", format!("Bearer {}", self.api_key))
                .send()
                .await?;

            if download_res.status().is_success() {
                attachment.data = download_res.bytes().await?.to_vec();
                log::info!("Successfully downloaded attachment: {} ({} bytes)", attachment.name, attachment.data.len());
            } else {
                log::error!("Failed to download attachment {}: status={}", attachment.name, download_res.status());
            }
        }

        Ok(attachments)
    }

    pub async fn get_pending_clients(&self, execution_id: &str) -> Result<Vec<CollectionClient>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/collection_clients?execution_id=eq.{}&status=eq.pending&select=*", self.base_url, execution_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch clients: {}", response.status()).into());
        }

        let clients: Vec<CollectionClient> = response.json().await?;
        Ok(clients)
    }

    pub async fn get_clients_by_ids(&self, client_ids: &[String]) -> Result<Vec<CollectionClient>, Box<dyn Error + Send + Sync>> {
        if client_ids.is_empty() {
            return Ok(vec![]);
        }

        let ids_str = client_ids.join(",");
        let url = format!("{}/rest/v1/collection_clients?id=in.({})&select=*", self.base_url, ids_str);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch clients by ids: {}", response.status()).into());
        }

        let clients: Vec<CollectionClient> = response.json().await?;
        Ok(clients)
    }

    pub async fn update_batch_status(&self, batch_id: &str, status: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/execution_batches?id=eq.{}", self.base_url, batch_id);
        
        let body = json!({ "status": status });

        let response = self.client.patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to update batch status: {}", response.status()).into());
        }

        log::info!("Updated batch {} to status {}", batch_id, status);
        Ok(())
    }

    pub async fn get_template(&self, template_id: &str) -> Result<EmailTemplate, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/collection_templates?id=eq.{}&select=id,subject,content_html,content_plain", self.base_url, template_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/vnd.pgrst.object+json")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch template: {}", response.status()).into());
        }

        let template_response: serde_json::Value = response.json().await?;
        
        let content = template_response.get("content_html")
            .and_then(|v| v.as_str())
            .or_else(|| template_response.get("content_plain").and_then(|v| v.as_str()))
            .unwrap_or("")
            .to_string();

        Ok(EmailTemplate {
            id: template_response.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            subject: template_response.get("subject").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            content,
        })
    }

    pub async fn update_client_status(&self, client_id: &str, status: &str, details: Option<serde_json::Value>) -> Result<(), Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/collection_clients?id=eq.{}", self.base_url, client_id);
        
        let mut body = json!({ "status": status });
        
        if let Some(d) = details {
             if let Some(obj) = body.as_object_mut() {
                obj.insert("custom_data".to_string(), d);
             }
        }

        let response = self.client.patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to update client status: {}", response.status()).into());
        }

        Ok(())
    }

    pub async fn get_execution_batches(&self, execution_id: &str) -> Result<Vec<serde_json::Value>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/execution_batches?execution_id=eq.{}", self.base_url, execution_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch batches: {}", response.status()).into());
        }

        let batches: Vec<serde_json::Value> = response.json().await?;
        Ok(batches)
    }

    pub async fn update_execution_status(&self, execution_id: &str, status: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/collection_executions?id=eq.{}", self.base_url, execution_id);
        
        let body = json!({
            "status": status,
            "completed_at": chrono::Utc::now().to_rfc3339()
        });

        let response = self.client.patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to update execution status: {}", response.status()).into());
        }

        log::info!("Updated execution {} to status {}", execution_id, status);
        Ok(())
    }

    pub async fn get_batch_retry_count(&self, batch_id: &str) -> Result<i32, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/batch_queue_messages?batch_id=eq.{}&select=retry_count", self.base_url, batch_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch retry count: {}", response.status()).into());
        }

        let messages: Vec<serde_json::Value> = response.json().await?;
        let count = messages.first()
            .and_then(|m| m.get("retry_count"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) as i32;
        
        Ok(count)
    }

    pub async fn increment_batch_retry_count(&self, batch_id: &str) -> Result<i32, Box<dyn Error + Send + Sync>> {
        let current = self.get_batch_retry_count(batch_id).await?;
        let new_count = current + 1;

        let url = format!("{}/rest/v1/batch_queue_messages?batch_id=eq.{}", self.base_url, batch_id);
        
        let body = json!({ "retry_count": new_count });

        let response = self.client.patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to increment retry count: {}", response.status()).into());
        }

        log::info!("Incremented retry count for batch {} to {}", batch_id, new_count);
        Ok(new_count)
    }

    pub async fn mark_batch_as_dlq(&self, batch_id: &str, error_message: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        // Update batch_queue_messages status to dlq
        let url = format!("{}/rest/v1/batch_queue_messages?batch_id=eq.{}", self.base_url, batch_id);
        
        let body = json!({
            "status": "dlq",
            "error_message": error_message,
            "dlq_at": chrono::Utc::now().to_rfc3339()
        });

        let response = self.client.patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to mark batch as DLQ: {}", response.status()).into());
        }

        // Also update execution_batches status
        let batch_url = format!("{}/rest/v1/execution_batches?id=eq.{}", self.base_url, batch_id);
        let batch_body = json!({
            "status": "dlq",
            "error_message": error_message
        });

        let _ = self.client.patch(&batch_url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&batch_body)
            .send()
            .await;

        log::warn!("Batch {} moved to DLQ: {}", batch_id, error_message);
        Ok(())
    }

    pub async fn get_blacklisted_emails(&self, business_id: &str) -> Result<std::collections::HashSet<String>, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/rest/v1/email_blacklist?business_id=eq.{}&select=email", self.base_url, business_id);
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch blacklist: {}", response.status()).into());
        }

        let blacklist: Vec<serde_json::Value> = response.json().await?;
        let emails: std::collections::HashSet<String> = blacklist
            .into_iter()
            .filter_map(|item| item.get("email").and_then(|v| v.as_str()).map(|s| s.to_lowercase()))
            .collect();

        log::info!("Fetched {} blacklisted emails for business {}", emails.len(), business_id);
        Ok(emails)
    }
}
