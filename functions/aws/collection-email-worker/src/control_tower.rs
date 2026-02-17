use std::error::Error;
use reqwest::Client;
use serde_json::json;
use chrono::Utc;

pub struct ExecutionLogger {
    client: Client,
    url: String,
    key: String,
    worker_id: String,
}

impl ExecutionLogger {
    pub fn new(url: String, key: String, worker_id: String) -> Self {
        ExecutionLogger {
            client: Client::new(),
            url,
            key,
            worker_id,
        }
    }

    pub async fn log_event(
        &self,
        execution_id: &str,
        batch_id: Option<&str>,
        event: &str, // ENQUEUED, PICKED_UP, etc.
        details: Option<serde_json::Value>,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let table_url = format!("{}/rest/v1/execution_audit_logs", self.url);

        let body = json!({
            "execution_id": execution_id,
            "batch_id": batch_id,
            "event": event,
            "worker_id": self.worker_id,
            "details": details.unwrap_or(json!({})),
            "created_at": Utc::now().to_rfc3339()
        });

        let res = self.client.post(&table_url)
            .header("apikey", &self.key)
            .header("Authorization", format!("Bearer {}", self.key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(&body)
            .send()
            .await?;

        if !res.status().is_success() {
            println!("Failed to log execution event: {}", res.status());
            // We usually don't want to crash the worker if logging fails, just report it
        }

        Ok(())
    }
}
