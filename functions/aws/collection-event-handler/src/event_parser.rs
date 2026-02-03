use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SnsEvent {
    #[serde(rename = "Records")]
    pub records: Vec<SnsRecord>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SnsRecord {
    #[serde(rename = "Sns")]
    pub sns: SnsMessage,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SnsMessage {
    #[serde(rename = "Message")]
    pub message: String,
    #[serde(rename = "MessageAttributes", default)]
    pub message_attributes: std::collections::HashMap<String, SnsMessageAttribute>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SnsMessageAttribute {
    #[serde(rename = "Value")]
    pub value: String,
    #[serde(rename = "Type", default)]
    pub type_: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesEvent {
    #[serde(rename = "eventType")]
    pub notification_type: String,
    pub mail: SesMail,
    #[serde(default)]
    pub bounce: Option<SesBounce>,
    #[serde(default)]
    pub complaint: Option<SesComplaint>,
    #[serde(default)]
    pub delivery: Option<SesDelivery>,
    #[serde(default)]
    pub open: Option<SesOpen>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesMail {
    #[serde(rename = "messageId")]
    pub message_id: String,
    pub destination: Vec<String>,
    #[serde(rename = "sendingAccountId", default)]
    pub sending_account_id: Option<String>,
    #[serde(rename = "timestamp", default)]
    pub timestamp: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesBounce {
    #[serde(rename = "bounceType")]
    pub bounce_type: String,
    #[serde(rename = "bounceSubType")]
    pub bounce_sub_type: String,
    #[serde(rename = "bouncedRecipients")]
    pub bounced_recipients: Vec<SesRecipient>,
    #[serde(rename = "timestamp", default)]
    pub timestamp: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesComplaint {
    #[serde(rename = "complaintFeedbackType")]
    pub complaint_feedback_type: Option<String>,
    #[serde(rename = "complainedRecipients", default)]
    pub complained_recipients: Vec<SesRecipient>,
    #[serde(rename = "timestamp", default)]
    pub timestamp: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesDelivery {
    #[serde(rename = "timestamp", default)]
    pub timestamp: Option<String>,
    #[serde(rename = "recipients", default)]
    pub recipients: Vec<String>,
    #[serde(rename = "smtpResponse", default)]
    pub smtp_response: Option<String>,
    #[serde(rename = "reportingMTA", default)]
    pub reporting_mta: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesOpen {
    #[serde(rename = "ipAddress")]
    pub ip_address: Option<String>,
    #[serde(rename = "timestamp", default)]
    pub timestamp: Option<String>,
    #[serde(rename = "userAgent", default)]
    pub user_agent: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SesRecipient {
    #[serde(rename = "emailAddress")]
    pub email_address: String,
    pub status: Option<String>,
    #[serde(rename = "diagnosticCode", default)]
    pub diagnostic_code: Option<String>,
}
