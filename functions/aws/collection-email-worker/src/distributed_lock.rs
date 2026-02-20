use std::error::Error;
use reqwest::Client;
use serde_json::json;

pub struct SupabaseLock {
    client: Client,
    url: String,
    key: String,
    worker_id: String,
}

impl SupabaseLock {
    pub fn new(url: String, key: String, worker_id: String) -> Self {
        SupabaseLock {
            client: Client::new(),
            url,
            key,
            worker_id,
        }
    }

    pub async fn try_acquire(&self, ttl_seconds: i32) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let rpc_url = format!("{}/rest/v1/rpc/acquire_scheduler_lock", self.url);
        
        // Call Supabase RPC
        let res = self.client.post(&rpc_url)
            .header("apikey", &self.key)
            .header("Authorization", format!("Bearer {}", self.key))
            .json(&json!({
                "p_worker_id": self.worker_id,
                "p_ttl_seconds": ttl_seconds
            }))
            .send()
            .await?;
            
        if !res.status().is_success() {
            println!("Failed to acquire lock: {}", res.status());
            return Ok(false);
        }
        
        let acquired: bool = res.json().await?;
        Ok(acquired)
    }

    pub async fn release(&self) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let rpc_url = format!("{}/rest/v1/rpc/release_scheduler_lock", self.url);
        
        let res = self.client.post(&rpc_url)
            .header("apikey", &self.key)
            .header("Authorization", format!("Bearer {}", self.key))
            .json(&json!({
                "p_worker_id": self.worker_id
            }))
            .send()
            .await?;

        if !res.status().is_success() {
            println!("Failed to release lock: {}", res.status());
            return Ok(false);
        }

        let released: bool = res.json().await?;
        Ok(released)
    }
}
