use lambda_runtime::{service_fn, LambdaEvent};
use serde_json::Value;
use simple_logger::SimpleLogger;
use log::{info, error, warn};
use handlebars::Handlebars;
use std::error::Error;
use regex::Regex;
use rusty_money::{Money, iso};
use css_inline::{CSSInliner, InlineOptions};

mod models;
mod supabase;
mod ses;
mod email_provider;
mod factory;
mod providers;

use models::{LambdaEvent as CollectionEvent, SqsEvent, BatchMessage};
use supabase::SupabaseService;
use email_provider::{EmailProvider, EmailMessage};

#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    SimpleLogger::new().with_level(log::LevelFilter::Info).init().unwrap();

    let func = service_fn(func);
    lambda_runtime::run(func).await?;
    Ok(())
}

fn format_currency(val: f64) -> String {
    let money = Money::from_str(&format!("{:.2}", val), iso::COP).unwrap_or_else(|_| {
        Money::from_major(val as i64, iso::COP)
    });
    
    let amount_str = money.amount().to_string(); 
    let parts: Vec<&str> = amount_str.split('.').collect();
    let integer_part = parts[0];
    
    let mut result = String::new();
    let mut count = 0;
    for c in integer_part.chars().rev() {
        if count > 0 && count % 3 == 0 {
            result.push('.');
        }
        result.push(c);
        count += 1;
    }
    
    result.chars().rev().collect::<String>()
}

fn get_f64(v: &serde_json::Value) -> f64 {
    if let Some(f) = v.as_f64() {
        f
    } else if let Some(s) = v.as_str() {
        s.replace(",", "").parse::<f64>().unwrap_or(0.0)
    } else {
        0.0
    }
}

fn preprocess_tiptap_template(template_str: &str) -> String {
    let mut processed = template_str.to_string();
    
    // Extract helpers from TipTap TR wrappers
    let re_helper = Regex::new(r"(?is)<tr>\s*<td[^>]*>(?:\s*<[^>]+>)*\s*(\{\{[/#!][^}]+\}\})\s*(?:</[^>]+>)*\s*</td>\s*</tr>").unwrap();
    processed = re_helper.replace_all(&processed, "$1").to_string();
    
    // Clean up whitespace around helpers but preserve line breaks
    processed = processed.replace("\n{{#", "{{#")
                         .replace("\n{{/", "{{/");
    
    processed
}

fn render_template(template_str: &str, data: &serde_json::Value) -> Result<String, Box<dyn Error + Send + Sync>> {
    let mut handlebars = Handlebars::new();
    handlebars.register_escape_fn(handlebars::no_escape);
    
    let processed_template = preprocess_tiptap_template(template_str);
    
    let rendered = handlebars.render_template(&processed_template, data)?;
    Ok(rendered)
}

fn enhance_invoice_tables(html: &str) -> String {
    let mut processed = html.to_string();
    
    // Find and enhance invoice tables specifically
    let table_regex = Regex::new(r"(?i)<table[^>]*class=.*tiptap-table.*>").unwrap();
    if table_regex.is_match(&processed) {
        // Wrap tables in a container for better width control
        processed = table_regex.replace_all(&processed, |caps: &regex::Captures| {
            let table_tag = &caps[0];
            format!(r#"<div style="margin: 0 auto; overflow-x: auto;">{}"#, table_tag)
        }).to_string();
        
        // Close the div after the table
        processed = Regex::new(r"(?i)</table>")
            .unwrap()
            .replace_all(&processed, "</table></div>")
            .to_string();
    }
    
    processed
}

fn preserve_line_breaks(html: &str) -> String {
    let mut processed = html.to_string();
    
    // Convert multiple line breaks to preserve spacing
    processed = processed.replace("\n\n", "<br><br>");
    processed = processed.replace("\n", "<br>");
    
    processed
}

fn fix_empty_paragraphs(html: &str) -> String {
    let mut processed = html.to_string();
    
    // Replace empty <p> with &nbsp; to prevent collapse
    let re_empty_p = Regex::new(r#"(?i)<p(?P<attrs>[^>]*)>\s*</p>"#).unwrap();
    processed = re_empty_p.replace_all(&processed, |caps: &regex::Captures| {
        let attrs = &caps["attrs"];
        if attrs.trim().is_empty() {
            "<p>&nbsp;</p>".to_string()
        } else {
            format!("<p{}>&nbsp;</p>", attrs)
        }
    }).to_string();
    
    processed
}

fn inline_css(html: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
    let inliner = CSSInliner::new(InlineOptions {
        keep_style_tags: false,
        load_remote_stylesheets: false,
        ..Default::default()
    });
    let inlined = inliner.inline(html)?;
    Ok(inlined)
}

fn wrap_with_styles(html_body: &str) -> String {
    let styles = r###"<style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; line-height: 1.6; }
        table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; margin: 0 auto; }
        th, td { border: 1px solid #e5e7eb; text-align: left; font-size: 14px; padding: 8px; }
        th { background-color: #f9fafb; font-weight: 600; }
        tr:nth-child(even) { background-color: #f9fafb; }
        img { max-width: 100%; height: auto; display: block; border: 0; outline: none; text-decoration: none; }
        p { margin-top: 0; margin-bottom: 0.75em; min-height: 1em; }
        .preserve-line-breaks { white-space: pre-wrap; }
        blockquote { border-left: 3px solid #e1e4e9; padding-left: 1rem; margin: 1rem 0; font-style: italic; color: #6b7280; }
        .table-no-borders th, .table-no-borders td { border: none; }
        a { color: blue; text-decoration: underline; }
    </style>
    "###;
        
    format!(
        r###"<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        {styles}
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #f4f4f4;">
            <tr>
                <td align="center" style="padding: 0;">
                    <table role="presentation" style="width: 700px; max-width: 700px; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff;">
                        <tr>
                            <td style="padding: 20px;">
                                {html_body}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;width:100%" width="100%">
            <tbody>
            <tr>
                <td style="font-family:sans-serif;vertical-align:top;padding-bottom:10px;padding-top:10px;color:#999999;font-size:12px;text-align:center" valign="top" align="center">
                <span class="m_58810963162805476apple-link" style="color:#999999;font-size:12px;text-align:center">Si tiene dudas o inquietudes,  por favor comuníquese directamente con el comercio a través del contacto compartido</span>
                </td>
            </tr>
            </tbody>
        </table>
        </body>
        </html>"###, 
    )
}

async fn func(event: LambdaEvent<Value>) -> Result<Value, lambda_runtime::Error> {
    let (payload, _context) = event.into_parts();
    
    // Try to parse as SQS event first
    let sqs_event: Result<SqsEvent, _> = serde_json::from_value(payload.clone());
    
    if let Ok(sqs) = sqs_event {
            info!("Received SQS event with {} records", sqs.records.len());
        
        let supabase = SupabaseService::new();
        let provider = factory::create_email_provider().await;
        
        let mut processed_count = 0;
        let mut failed_count = 0;
        
            for sqs_message in sqs.records {
            if let Some(body) = &sqs_message.body {
                if let Some(batch_msg) = BatchMessage::from_body(body) {
                    info!("Processing batch {} for execution {}", batch_msg.batch_id, batch_msg.execution_id);
                    
                    let result = process_batch(&supabase, provider.as_ref(), &batch_msg).await;
                    
                    match result {
                        Ok(_) => {
                            processed_count += 1;
                            info!("Batch {} processed successfully", batch_msg.batch_id);
                        }
                        Err(e) => {
                            failed_count += 1;
                            error!("Failed to process batch {}: {}", batch_msg.batch_id, e);
                        }
                    }
                } else {
                    warn!("Could not parse message body as BatchMessage: {}", body);
                }
            }
        }
        
        return Ok(serde_json::json!({
            "message": "SQS processing completed",
            "processed": processed_count,
            "failed": failed_count
        }));
    }
    
    // Fallback: try to parse as direct Lambda event (for backwards compatibility)
    let collection_event: Result<CollectionEvent, _> = serde_json::from_value(payload);
    
    match collection_event {
        Ok(event) => {
            info!("Received direct Lambda event for execution {}", event.execution_id);
            process_execution(&event.execution_id).await?;
            Ok(serde_json::json!({ "message": "Processing completed" }))
        }
        Err(_) => {
            error!("Could not parse event as SQS or Lambda event");
            Err(lambda_runtime::Error::from("Invalid event format"))
        }
    }
}

async fn process_batch(
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    batch_msg: &BatchMessage,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let execution = supabase.get_execution(&batch_msg.execution_id).await?;
    
    if execution.status == "completed" || execution.status == "failed" {
        info!("Execution {} already finished, skipping batch", batch_msg.execution_id);
        return Ok(());
    }
    
    // Get clients in this batch
    let clients = supabase.get_clients_by_ids(&batch_msg.client_ids).await?;
    
    let attachments = if let Some(ids) = &execution.attachment_ids {
        supabase.get_attachments(ids).await.unwrap_or_default()
    } else {
        vec![]
    };
    
    let is_dev = std::env::var("APP_ENV").unwrap_or_else(|_| "pro".to_string()) == "dev";
    
    if let Some(template_id) = &execution.email_template_id {
        let template = supabase.get_template(template_id).await?;
        
        for (index, client) in clients.into_iter().enumerate() {
            if is_dev && index > 0 {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
            
            if let Some(_email) = client.email() {
                let result = send_client_email(supabase, provider, &template, &client, &attachments, &batch_msg.execution_id).await;
                
                match result {
                    Ok(message_id) => {
                        let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                        if let Some(obj) = new_custom_data.as_object_mut() {
                            obj.insert("message_id".to_string(), serde_json::Value::String(message_id));
                            obj.insert("email_sent_at".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
                        }
                        let _ = supabase.update_client_status(&client.id, "sent", Some(new_custom_data)).await;
                    }
                    Err(e) => {
                        let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                        if let Some(obj) = new_custom_data.as_object_mut() {
                            obj.insert("error".to_string(), serde_json::Value::String(e.to_string()));
                        }
                        let _ = supabase.update_client_status(&client.id, "failed", Some(new_custom_data)).await;
                    }
                }
            }
        }
    }
    
    // Update batch status to completed
    supabase.update_batch_status(&batch_msg.batch_id, "completed").await?;

    // Check if all batches are completed and update execution status
    check_and_complete_execution(supabase, &batch_msg.execution_id).await;

    Ok(())
}

async fn check_and_complete_execution(supabase: &SupabaseService, execution_id: &str) {
    match supabase.get_execution_batches(execution_id).await {
        Ok(batches) => {
            let all_completed = batches.iter().all(|batch| {
                batch.get("status").and_then(|s| s.as_str()) == Some("completed")
            });

            if all_completed {
                info!("All batches completed for execution {}, updating to completed", execution_id);
                match supabase.update_execution_status(execution_id, "completed").await {
                    Ok(_) => info!("Execution {} marked as completed successfully", execution_id),
                    Err(e) => error!("Failed to mark execution {} as completed: {}", execution_id, e),
                }
            } else {
                let completed_count = batches.iter().filter(|b| b.get("status").and_then(|s| s.as_str()) == Some("completed")).count();
                info!("Execution {} has {}/{} batches completed", execution_id, completed_count, batches.len());
            }
        }
        Err(e) => {
            error!("Failed to check batches for execution {}: {}", execution_id, e);
        }
    }
}

async fn process_execution(execution_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
    let supabase = SupabaseService::new();
    let provider = factory::create_email_provider().await;
    
    let execution = supabase.get_execution(execution_id).await?;
    
    if execution.status == "completed" || execution.status == "failed" {
        return Ok(());
    }
    
    let attachments = if let Some(ids) = &execution.attachment_ids {
        supabase.get_attachments(ids).await.unwrap_or_default()
    } else {
        vec![]
    };
    
    let is_dev = std::env::var("APP_ENV").unwrap_or_else(|_| "pro".to_string()) == "dev";
    
    if let Some(template_id) = &execution.email_template_id {
        let template = supabase.get_template(template_id).await?;
        let clients = supabase.get_pending_clients(execution_id).await?;
        
        for (index, client) in clients.into_iter().enumerate() {
            if is_dev && index > 0 {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
            
            if let Some(_email) = client.email() {
                let result = send_client_email(&supabase, provider.as_ref(), &template, &client, &attachments, execution_id).await;
                
                match result {
                    Ok(message_id) => {
                        let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                        if let Some(obj) = new_custom_data.as_object_mut() {
                            obj.insert("message_id".to_string(), serde_json::Value::String(message_id));
                            obj.insert("email_sent_at".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
                        }
                        let _ = supabase.update_client_status(&client.id, "sent", Some(new_custom_data)).await;
                    }
                    Err(e) => {
                        let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                        if let Some(obj) = new_custom_data.as_object_mut() {
                            obj.insert("error".to_string(), serde_json::Value::String(e.to_string()));
                        }
                        let _ = supabase.update_client_status(&client.id, "failed", Some(new_custom_data)).await;
                    }
                }
            }
        }
    }

    // Check if all batches are completed and update execution status
    check_and_complete_execution(&supabase, execution_id).await;

    Ok(())
}

async fn send_client_email(
    _supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    template: &models::EmailTemplate,
    client: &models::CollectionClient,
    attachments: &[models::Attachment],
    execution_id: &str,
) -> Result<String, Box<dyn Error + Send + Sync>> {
    let mut template_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
    
    if let Some(invoices) = &client.invoices {
        template_data["invoices"] = invoices.clone();
    } else {
        template_data["invoices"] = serde_json::json!([]);
    }
    
    let total_amount = get_f64(template_data.get("total_amount_due").unwrap_or(&serde_json::json!(client.amount_due())));
    template_data["total_amount_due"] = serde_json::Value::String(format_currency(total_amount));
    
    if template_data.get("full_name").is_none() {
        template_data["full_name"] = serde_json::Value::String(client.full_name().unwrap_or("Cliente").to_string());
    }
    
    if let Some(invoices) = template_data.get_mut("invoices").and_then(|v| v.as_array_mut()) {
        for invoice in invoices {
            if let Some(amount_val) = invoice.get("amount_due") {
                invoice["amount_due"] = serde_json::Value::String(format_currency(get_f64(amount_val)));
            }
        }
    }
    
    let html_body = match render_template(&template.content, &template_data) {
        Ok(rendered) => {
            let fixed_empty = fix_empty_paragraphs(&rendered);
            let with_line_breaks = preserve_line_breaks(&fixed_empty);
            let enhanced_tables = enhance_invoice_tables(&with_line_breaks);
            let wrapped = wrap_with_styles(&enhanced_tables);
            match inline_css(&wrapped) {
                Ok(inlined) => inlined,
                Err(e) => {
                    error!("Inline CSS error: {}", e);
                    wrapped
                }
            }
        },
        Err(e) => {
            error!("Render error: {}", e);
            template.content
                .replace("{{nombre}}", client.full_name().unwrap_or("Cliente"))
                .replace("{{monto}}", &format_currency(client.amount_due()))
        }
    };
    
    let text_body = "Por favor habilite HTML para ver este correo.";
    
    let email = client.email().unwrap_or("");
    
    // Construir EmailMessage para el provider
    let email_message = EmailMessage {
        to: email.to_string(),
        subject: template.subject.clone(),
        html_body: html_body.clone(),
        text_body: text_body.to_string(),
        from: "manager@borls.com".to_string(),
        attachments: attachments.to_vec(),
        client_id: Some(client.id.clone()),
        execution_id: Some(execution_id.to_string()),
        message_id: None,
    };
    
    let result = provider.send_email(email_message).await?;
    
    Ok(result.message_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_currency() {
        assert_eq!(format_currency(1500000.0), "1.500.000");
    }

    #[test]
    fn test_preprocess() {
        let input = "<tr><td>{{#each invoices}}</td></tr>";
        assert_eq!(preprocess_tiptap_template(input), "{{#each invoices}}");
    }
}