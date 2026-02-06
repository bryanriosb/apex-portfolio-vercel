use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CollectionExecution {
    pub id: String,
    pub business_id: String,
    pub status: String,
    pub email_template_id: Option<String>,
    pub execution_mode: String,
    pub attachment_ids: Option<Vec<String>>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Attachment {
    pub id: String,
    pub name: String,
    pub storage_path: String,
    pub storage_bucket: String,
    pub file_type: Option<String>,
    #[serde(skip)]
    pub data: Vec<u8>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CollectionClient {
    pub id: String,
    pub execution_id: String,
    pub status: String,
    pub invoices: Option<serde_json::Value>,
    pub custom_data: Option<serde_json::Value>,
}

impl CollectionClient {
    pub fn email(&self) -> Option<&str> {
        self.custom_data.as_ref()?.get("email")?.as_str()
    }

    pub fn full_name(&self) -> Option<&str> {
        self.custom_data.as_ref()?.get("full_name")?.as_str()
    }

    pub fn amount_due(&self) -> f64 {
        self.custom_data
            .as_ref()
            .and_then(|cd| cd.get("total_amount_due"))
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0)
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct EmailTemplate {
    pub id: String,
    pub subject: String,
    pub content: String,
}

#[derive(Deserialize, Debug)]
pub struct LambdaEvent {
    pub execution_id: String,
}

// SQS Event Models - AWS SQS events use "Records" with capital R
#[derive(Deserialize, Debug, Clone)]
pub struct SqsMessage {
    #[allow(dead_code)]
    pub message_id: Option<String>,
    pub body: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct SqsEvent {
    #[serde(rename = "Records")]
    pub records: Vec<SqsMessage>,
}

// Batch message from SQS
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct BatchMessage {
    pub batch_id: String,
    pub execution_id: String,
    pub batch_number: i32,
    pub client_ids: Vec<String>,
    pub total_clients: i32,
    pub scheduled_for: Option<String>,
}

impl BatchMessage {
    pub fn from_body(body: &str) -> Option<Self> {
        serde_json::from_str(body).ok()
    }
}
