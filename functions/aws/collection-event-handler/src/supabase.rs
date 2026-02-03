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

    pub async fn increment_execution_counter(&self, client_id: &str, counter_type: &str) -> Result<(), Box<dyn Error>> {
        let column = match counter_type {
            "emails_sent" => "emails_sent",
            "emails_delivered" => "emails_delivered",
            "emails_opened" => "emails_opened",
            "emails_bounced" => "emails_bounced",
            "emails_failed" => "emails_failed",
            _ => return Ok(()),
        };

        let exec_url = format!(
            "{}/rest/v1/collection_clients?id=eq.{}&select=execution_id",
            self.base_url, client_id
        );

        let exec_response = self.client.get(&exec_url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !exec_response.status().is_success() {
            warn!("Failed to get client execution_id");
            return Ok(());
        }

        let results: Vec<serde_json::Value> = exec_response.json().await?;
        let execution_id = match results.first().and_then(|r| r.get("execution_id").and_then(|v| v.as_str())) {
            Some(id) => id,
            None => {
                warn!("No execution_id found for client {}", client_id);
                return Ok(());
            }
        };

        let url = format!("{}/rest/v1/rpc/increment_execution_counter", self.base_url);

        let body = json!({
            "p_execution_id": execution_id,
            "p_column": column
        });

        let response = self.client.post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await?;
            warn!("Failed to increment execution counter via RPC: {} - {}", status, text);
        } else {
            info!("Incremented counter via RPC: {}", counter_type);
        }

        Ok(())
    }

    pub async fn increment_client_stats(&self, client_id: &str, event_type: &str) -> Result<(), Box<dyn Error>> {
        let url = format!("{}/rest/v1/rpc/increment_client_stats", self.base_url);

        let body = json!({
            "p_client_id": client_id,
            "p_event_type": event_type
        });

        let response = self.client.post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await?;
            warn!("Failed to increment client stats: {} - {}", status, text);
        }

        Ok(())
    }
}
