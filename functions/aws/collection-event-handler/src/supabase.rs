 use reqwest::Client;
 use serde_json::json;
 use std::error::Error;
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

    pub async fn create_event(&self, client_id: &str, execution_id: &str, event_type: &str, metadata: serde_json::Value) -> Result<(), Box<dyn Error>> {
        let url = format!("{}/rest/v1/collection_events", self.base_url);

        let body = json!({
            "client_id": client_id,
            "execution_id": execution_id,
            "event_type": event_type,
            "event_data": metadata,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        let response = self.client.post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await?;
            return Err(format!("Failed to create event: {} - {}", status, text).into());
        }

        Ok(())
    }

    pub async fn find_client_by_message_id(&self, message_id: &str) -> Result<Option<(String, String)>, Box<dyn Error>> {
        let url = format!(
            "{}/rest/v1/collection_clients?custom_data->>message_id=eq.{}&select=id,execution_id",
            self.base_url, message_id
        );

        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await?;
            return Err(format!("Failed to search client: {} - {}", status, text).into());
        }

        let results: Vec<serde_json::Value> = response.json().await?;

        if let Some(first) = results.first() {
            if let Some(id) = first.get("id").and_then(|i| i.as_str()) {
                if let Some(exec_id) = first.get("execution_id").and_then(|e| e.as_str()) {
                    debug!("Found client with message_id {}: {} (exec: {})", message_id, id, exec_id);
                    return Ok(Some((id.to_string(), exec_id.to_string())));
                }
            }
        }

        debug!("No client found for message_id: {}", message_id);
        Ok(None)
    }

    pub async fn update_client_status(&self, client_id: &str, status: &str, details: Option<serde_json::Value>) -> Result<(), Box<dyn Error>> {
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
            let status = response.status();
            let text = response.text().await?;
            return Err(format!("Failed to update client status: {} - {}", status, text).into());
        }

        info!("Updated client {} to status {}", client_id, status);
        Ok(())
    }
}
