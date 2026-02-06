 #[macro_use]
 extern crate log;

 use lambda_runtime::{service_fn, Error, LambdaEvent};
 use serde_json::Value;
 use simple_logger::SimpleLogger;

mod event_parser;
mod supabase;

use event_parser::{SnsEvent, SesEvent};
use supabase::SupabaseService;

#[tokio::main]
async fn main() -> Result<(), Error> {
    SimpleLogger::new().with_level(log::LevelFilter::Info).init().unwrap();
    
    let func = service_fn(func);
    lambda_runtime::run(func).await?;
    Ok(())
}

async fn func(event: LambdaEvent<Value>) -> Result<Value, Error> {
    let (payload, _context) = event.into_parts();

    let sns_event: Result<SnsEvent, _> = serde_json::from_value(payload.clone());

    match sns_event {
        Ok(sns) => {
            let supabase = SupabaseService::new();
            let mut processed = 0;
            let mut errors = 0;

            for record in sns.records {
                let message = record.sns.message;

                let ses_event: SesEvent = match serde_json::from_str(&message) {
                    Ok(e) => {
                        info!("Successfully parsed SES event");
                        e
                    }
                    Err(e) => {
                        error!("Failed to parse SES event: {}", e);
                        errors += 1;
                        continue;
                    }
                };

                let message_id = ses_event.mail.message_id.clone();
                let event_type = ses_event.notification_type.clone();

                info!("Processing {} event for MessageID: {}", event_type, message_id);

                match supabase.find_client_by_message_id(&message_id).await {
                    Ok(Some((client_id, execution_id))) => {
                        info!("Found client ID: {} (exec: {})", client_id, execution_id);

                        // Track Event
                        let metadata = serde_json::to_value(&ses_event).unwrap_or(Value::Null);
                        if let Err(e) = supabase.create_event(&client_id, &execution_id, &event_type, metadata).await {
                            error!("Failed to create event log: {}", e);
                        }

                        // Update Status based on event type
                        match event_type.as_str() {
                            "Bounce" => {
                                let mut details = serde_json::Map::new();
                                if let Some(bounce) = &ses_event.bounce {
                                    details.insert("bounce_type".to_string(), Value::String(bounce.bounce_type.clone()));
                                    details.insert("bounce_sub_type".to_string(), Value::String(bounce.bounce_sub_type.clone()));
                                }
                                let _ = supabase.update_client_status(&client_id, "bounced", Some(Value::Object(details))).await;
                                processed += 1;
                            }
                            "Delivery" => {
                                let _ = supabase.update_client_status(&client_id, "delivered", None).await;
                                processed += 1;
                            }
                            "Open" => {
                                let _ = supabase.update_client_status(&client_id, "opened", None).await;
                                processed += 1;
                            }
                            "Send" => {
                                processed += 1;
                            }
                            "Reject" => {
                                let _ = supabase.update_client_status(&client_id, "failed", None).await;
                                processed += 1;
                            }
                            "Complaint" => {
                                let _ = supabase.update_client_status(&client_id, "complained", None).await;
                                processed += 1;
                            }
                            _ => {
                                warn!("Unhandled event type: {}", event_type);
                                processed += 1;
                            }
                        }
                    }
                    Ok(None) => {
                        warn!("No client found for MessageID: {}", message_id);
                    }
                    Err(e) => {
                        error!("Error looking up client: {}", e);
                        errors += 1;
                    }
                }
            }

            info!("Processed {} events, {} errors", processed, errors);
            Ok(serde_json::json!({ 
                "message": "Events processed", 
                "processed": processed, 
                "errors": errors 
            }))
        }
        Err(e) => {
            warn!("Not an SNS event: {}", e);
            Ok(serde_json::json!({ "error": "Unknown event format" }))
        }
    }
}
