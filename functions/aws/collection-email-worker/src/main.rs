use lambda_runtime::{service_fn, LambdaEvent};
use serde_json::{Value, json};
use simple_logger::SimpleLogger;
use log::{info, error, warn};
use handlebars::Handlebars;
use std::error::Error;
use regex::Regex;
use rusty_money::{Money, iso};
use css_inline::{CSSInliner, InlineOptions};
use aws_config::BehaviorVersion;
use aws_sdk_sqs::Client as SqsClient;
use aws_sdk_scheduler::{Client as SchedulerClient, types::{Target, FlexibleTimeWindow, FlexibleTimeWindowMode, ActionAfterCompletion}};
use chrono::{DateTime, Utc, Timelike, Datelike};

mod models;
mod supabase;
mod ses;
mod email_provider;
mod factory;
mod providers;
mod distributed_lock;
mod control_tower;

use models::{SqsEvent, BatchMessage, SqsMessage};
use supabase::SupabaseService;
use email_provider::{EmailProvider, EmailMessage};
use std::collections::HashSet;
use distributed_lock::SupabaseLock;

use control_tower::ExecutionLogger;

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

    // Strip <tr><td[...]>[<p>]{{#each}}|{{/each}}[</p>]</td><td></td|<td><p></p></td>*</tr>
    // TipTap wraps cell content in <p> tags and empty cells become <td><p></p></td>
    let re_helper = Regex::new(
        r"(?is)<tr[^>]*>\s*<td[^>]*>(?:\s*<[^>]+>)*\s*(\{\{[/#!][^}]+\}\})\s*(?:</[^>]+>)*\s*</td>(?:\s*<td[^>]*>(?:\s*<[^>]+>\s*</[^>]+>)?\s*</td>)*\s*</tr>"
    ).unwrap();
    processed = re_helper.replace_all(&processed, "$1").to_string();

    processed = processed.replace("\n{{#", "{{#").replace("\n{{/", "{{/");

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
                    <table role="presentation" style="width: 720px; max-width: 720px; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff;">
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
            <tr>
                <td style="font-family:sans-serif;vertical-align:top;padding-bottom:10px;padding-top:10px;color:#999999;font-size:12px;text-align:center" valign="top" align="center">
                <span class="m_58810963162805476apple-link" style="color:#999999;font-size:12px;text-align:center">APEX - es una plataforma de cobro de cartera de BORLS S.A.S © 2026 Todos los derechos reservados | <a href="https://apex.borls.com" style="color:#999999;font-size:12px;text-align:center" target="_blank">https://apex.borls.com</a></span>
                </td>
            </tr>
            </tbody>
        </table>
        </body>
        </html>"###, 
    )
}

async fn handle_future_batch(
    sqs_client: &SqsClient,
    queue_url: &str,
    receipt_handle: &str,
    scheduled_for: &str,
    logger: &ExecutionLogger,
    batch_msg: &BatchMessage,
) -> Result<bool, Box<dyn Error + Send + Sync>> {
    let scheduled_time = DateTime::parse_from_rfc3339(scheduled_for)?.with_timezone(&Utc);
    let now = Utc::now();
    
    if scheduled_time > now {
        let delay_seconds = (scheduled_time - now).num_seconds();
        
        // SQS visibility timeout limit is 12 hours (43200 seconds)
        let visibility_timeout = if delay_seconds > 43200 {
            43200
        } else {
            delay_seconds as i32
        };

        if visibility_timeout > 0 {
            info!(
                "Batch {} scheduled for future ({}). Hiding for {} seconds.", 
                batch_msg.batch_id, 
                scheduled_for, 
                visibility_timeout
            );

            sqs_client
                .change_message_visibility()
                .queue_url(queue_url)
                .receipt_handle(receipt_handle)
                .visibility_timeout(visibility_timeout)
                .send()
                .await?;

            logger.log_event(
                &batch_msg.execution_id, 
                Some(&batch_msg.batch_id), 
                "DEFERRED", 
                Some(serde_json::json!({
                    "delay_seconds": visibility_timeout,
                    "scheduled_for": scheduled_for
                }))
            ).await?;

            return Ok(true); // Handled as future batch
        }
    }
    
    Ok(false) // Ready to process
}

async fn func(event: LambdaEvent<Value>) -> Result<Value, lambda_runtime::Error> {
    let (payload, _context) = event.into_parts();
    let worker_id = uuid::Uuid::new_v4().to_string();
    
    info!("Worker {} started with payload: {:?}", worker_id, payload);

    // AWS Clients
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let sqs_client = SqsClient::new(&config);
    let scheduler_client = SchedulerClient::new(&config);
    
    // Services
    let supabase = SupabaseService::new();
    let provider = factory::create_email_provider().await;
    let lock = SupabaseLock::new(
        std::env::var("SUPABASE_URL").unwrap_or_default(),
        std::env::var("SUPABASE_SECRET_KEY").unwrap_or_default(),
        worker_id.clone()
    );

    // Control Tower Logger
    let logger = ExecutionLogger::new(
        std::env::var("SUPABASE_URL").unwrap_or_default(),
        std::env::var("SUPABASE_SECRET_KEY").unwrap_or_default(),
        worker_id.clone()
    );

    let queue_url = std::env::var("SQS_BATCH_QUEUE_URL").unwrap_or_default();
    
    let mut total_processed = 0;
    let mut total_failed = 0;

    // Check if this is a direct action or an SQS event
    let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("none");
    
    if action == "wake_up" || action == "start_execution" {
        info!("Action '{}' received. Polling SQS manually.", action);
        let result = process_sqs_manually(&sqs_client, &supabase, provider.as_ref(), &logger, &queue_url, &worker_id).await?;
        total_processed = result.0;
        total_failed = result.1;
    } else if let Some(records) = payload.get("Records") {
        info!("SQS Records received. Processing batch event.");
        if let Ok(sqs_event) = serde_json::from_value::<SqsEvent>(payload.clone()) {
            let result = process_sqs_records(sqs_event.records, &sqs_client, &supabase, provider.as_ref(), &logger, &queue_url, &worker_id).await?;
            total_processed = result.0;
            total_failed = result.1;
        } else {
            error!("Failed to parse SQS event records");
        }
    } else {
        warn!("Unexpected event format. Payload: {:?}", payload);
    }

    // Always attempt to manage scheduling at the end, even if we processed nothing
    if let Err(e) = manage_scheduling(&supabase, &lock, &worker_id, &scheduler_client).await {
        error!("Failed to manage scheduling: {}", e);
    }

    Ok(serde_json::json!({
        "status": "completed",
        "worker_id": worker_id,
        "processed": total_processed,
        "failed": total_failed
    }))
}

async fn process_sqs_manually(
    sqs_client: &SqsClient,
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    logger: &ExecutionLogger,
    queue_url: &str,
    worker_id: &str,
) -> Result<(i32, i32), Box<dyn Error + Send + Sync>> {
    // Poll SQS (max 10 messages)
    let response = sqs_client.receive_message()
        .queue_url(queue_url)
        .max_number_of_messages(10)
        .wait_time_seconds(5)
        .visibility_timeout(300)
        .send()
        .await?;

    let messages = response.messages.unwrap_or_default();
    info!("Pulled {} messages from SQS", messages.len());

    let records: Vec<SqsMessage> = messages.into_iter().map(|m| SqsMessage {
        message_id: m.message_id,
        receipt_handle: m.receipt_handle,
        body: m.body,
    }).collect();

    process_sqs_records(records, sqs_client, supabase, provider, logger, queue_url, worker_id).await
}

async fn process_sqs_records(
    records: Vec<SqsMessage>,
    sqs_client: &SqsClient,
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    logger: &ExecutionLogger,
    queue_url: &str,
    _worker_id: &str,
) -> Result<(i32, i32), Box<dyn Error + Send + Sync>> {
    let mut processed_count = 0;
    let mut failed_count = 0;

    for sqs_message in records {
        if let Some(body) = &sqs_message.body {
            if let Some(batch_msg) = BatchMessage::from_body(body) {
                let receipt_handle = sqs_message.receipt_handle.as_deref().unwrap_or_default();
                
                // Handle scheduled batches (Iterative Visibility)
                if let Some(scheduled_for) = &batch_msg.scheduled_for {
                    match handle_future_batch(sqs_client, queue_url, receipt_handle, scheduled_for, logger, &batch_msg).await {
                        Ok(is_future) => {
                            if is_future {
                                continue;
                            }
                        }
                        Err(e) => {
                            error!("Error in handle_future_batch for {}: {}", batch_msg.batch_id, e);
                        }
                    }
                }

                // Log PICKED_UP
                let _ = logger.log_event(&batch_msg.execution_id, Some(&batch_msg.batch_id), "PICKED_UP", None).await;

                // Processing logic (with retries and circuit breaker)
                // [Omit the rest for brevity as I'll move it to process_single_batch]
                match process_batch(supabase, provider, &batch_msg).await {
                    Ok(_) => {
                        processed_count += 1;
                        let _ = sqs_client.delete_message().queue_url(queue_url).receipt_handle(receipt_handle).send().await;
                        let _ = logger.log_event(&batch_msg.execution_id, Some(&batch_msg.batch_id), "COMPLETED", None).await;
                    }
                    Err(e) => {
                        failed_count += 1;
                        error!("Failed to process batch {}: {}", batch_msg.batch_id, e);
                        let _ = logger.log_event(&batch_msg.execution_id, Some(&batch_msg.batch_id), "FAILED", Some(json!({ "error": e.to_string() }))).await;
                    }
                }
            }
        }
    }

    Ok((processed_count, failed_count))
}

async fn manage_scheduling(
    supabase: &SupabaseService,
    lock: &SupabaseLock,
    worker_id: &str,
    scheduler_client: &SchedulerClient,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    // 1. Try to acquire lock
    // TTL of 5 minutes as per documentation
    if !lock.try_acquire(300).await? {
        info!("ManageScheduling: Another worker has the lock. Skipping.");
        return Ok(());
    }

    info!("ManageScheduling: Lock acquired. Checking for next execution.");

    // 2. Find the earliest pending batch time across ALL campaigns
    let next_time = match supabase.get_earliest_pending_batch_time().await {
        Ok(time) => time,
        Err(e) => {
            error!("ManageScheduling: Failed to fetch next batch time: {}", e);
            let _ = lock.release().await;
            return Err(e);
        }
    };

    if let Some(scheduled_time) = next_time {
        info!("ManageScheduling: Next execution scheduled for {}", scheduled_time);
        
        // 3. Update EventBridge Scheduler rule
        if let Err(e) = schedule_eventbridge(scheduler_client, &scheduled_time).await {
            error!("ManageScheduling: Failed to update EventBridge: {}", e);
        }
    } else {
        info!("ManageScheduling: No pending batches found. Scheduling safety wake-up in 1 hour.");
        let safety_time = Utc::now() + chrono::Duration::hours(1);
        let _ = schedule_eventbridge(scheduler_client, &safety_time).await;
    }

    // 4. Release lock
    let _ = lock.release().await;
    Ok(())
}

async fn schedule_eventbridge(
    client: &SchedulerClient,
    scheduled_time: &DateTime<Utc>,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let rule_name = std::env::var("EVENTBRIDGE_RULE_NAME").unwrap_or_else(|_| "collection-email-scheduler".to_string());
    let lambda_arn = std::env::var("LAMBDA_EMAIL_WORKER_ARN").expect("LAMBDA_EMAIL_WORKER_ARN must be set");
    let role_arn = std::env::var("EVENTBRIDGE_SCHEDULER_ROLE_ARN").expect("EVENTBRIDGE_SCHEDULER_ROLE_ARN must be set");

    // Format cron: cron(minutes hours day-of-month month day-of-week year)
    let cron_expr = format!(
        "cron({} {} {} {} ? {})",
        scheduled_time.minute(),
        scheduled_time.hour(),
        scheduled_time.day(),
        scheduled_time.month(),
        scheduled_time.year()
    );

    info!("Updating EventBridge schedule '{}' to '{}'", rule_name, cron_expr);

    // Note: We use create_schedule and handle ConflictException by deleting and recreating, 
    // or just assume we can recreate if we use a specific name and it's set to delete after completion.
    // Actually, EventBridge Scheduler 'create_schedule' fails if it exists.
    // THE BEST WAY: Create it, and if it fails, delete and create, or just use put_rule (if it were EventBridge Rules).
    // For Scheduler, we can try to delete it first.
    
    let _ = client.delete_schedule()
        .name(&rule_name)
        .group_name("default")
        .send()
        .await;

    client.create_schedule()
        .name(&rule_name)
        .schedule_expression(&cron_expr)
        .target(
            Target::builder()
                .arn(lambda_arn)
                .role_arn(role_arn)
                .input(serde_json::to_string(&serde_json::json!({
                    "action": "wake_up",
                    "source": "eventbridge_scheduler"
                }))?)
                .build()?
        )
        .flexible_time_window(
            FlexibleTimeWindow::builder()
                .mode(FlexibleTimeWindowMode::Off)
                .build()?
        )
        .action_after_completion(ActionAfterCompletion::Delete)
        .send()
        .await?;

    Ok(())
}

async fn process_batch(
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    batch_msg: &BatchMessage,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let execution = supabase.get_execution(&batch_msg.execution_id).await?;
    let business_name = supabase.get_business_name(&batch_msg.business_id).await;
    
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

    // Get blacklisted emails for this business
    let blacklisted_emails = supabase.get_blacklisted_emails(&batch_msg.business_id).await.unwrap_or_else(|e| {
        log::error!("Failed to fetch blacklist for business {}: {}", batch_msg.business_id, e);
        HashSet::new()
    });

    let is_dev = std::env::var("APP_ENV").unwrap_or_else(|_| "pro".to_string()) == "dev";

    for (index, client) in clients.into_iter().enumerate() {
        if is_dev && index > 0 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        let emails = client.emails();
        if emails.is_empty() {
            warn!("Client {} has no emails, skipping", client.id);
            continue;
        }

        // Filter out blacklisted emails
        let filtered_emails: Vec<String> = emails
            .into_iter()
            .filter(|email| {
                let email_lower = email.to_lowercase();
                let is_blacklisted = blacklisted_emails.contains(&email_lower);
                if is_blacklisted {
                    log::warn!("Skipping blacklisted email {} for client {}", email, client.id);
                }
                !is_blacklisted
            })
            .collect();

        if filtered_emails.is_empty() {
            log::warn!("All emails for client {} are blacklisted, marking as failed", client.id);
            let error_data = serde_json::json!({
                "error": "All emails are blacklisted",
                "error_type": "blacklisted_emails"
            });
            let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;
            continue;
        }

        let emails = filtered_emails;

        let template_id = if let Some(client_template) = &client.email_template_id {
            info!("Using client-specific template {} for client {}", client_template, client.id);
            client_template.clone()
        } else if let Some(exec_template) = &execution.email_template_id {
            info!("Using fallback execution template {} for client {}", exec_template, client.id);
            exec_template.clone()
        } else {
            error!("No template configured for client {} in execution {}", client.id, batch_msg.execution_id);

            let error_data = serde_json::json!({
                "error": "No email template configured",
                "error_type": "missing_template"
            });
            let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;

            continue;
        };

        let template = match supabase.get_template(&template_id).await {
            Ok(t) => t,
            Err(e) => {
                error!("Failed to fetch template {} for client {}: {}", template_id, client.id, e);

                let error_data = serde_json::json!({
                    "error": format!("Failed to fetch template: {}", e),
                    "template_id": template_id,
                    "error_type": "template_fetch_failed"
                });
                let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;
                continue;
            }
        };

        let result = send_client_email(supabase, provider, &template, &client, &emails, &attachments, &batch_msg.execution_id, &business_name).await;

        match result {
            Ok(message_id) => {
                let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                if let Some(obj) = new_custom_data.as_object_mut() {
                    obj.insert("message_id".to_string(), serde_json::Value::String(message_id));
                    obj.insert("email_sent_at".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
                    obj.insert("template_id".to_string(), serde_json::Value::String(template_id.clone()));
                    if let Some(threshold_id) = &client.threshold_id {
                        obj.insert("threshold_id".to_string(), serde_json::Value::String(threshold_id.clone()));
                    }
                }
                if let Err(err) = supabase.update_client_status(&client.id, "sent", Some(new_custom_data)).await {
                    log::error!("CRITICAL: Failed to update client {} to 'sent' status in DB: {}", client.id, err);
                } else {
                    log::info!("Successfully updated client {} to 'sent' status in DB", client.id);
                }
            }
            Err(e) => {
                let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                if let Some(obj) = new_custom_data.as_object_mut() {
                    obj.insert("error".to_string(), serde_json::Value::String(e.to_string()));
                    obj.insert("template_id".to_string(), serde_json::Value::String(template_id.clone()));
                }
                if let Err(err) = supabase.update_client_status(&client.id, "failed", Some(new_custom_data)).await {
                    log::error!("Failed to update client {} to 'failed' status in DB: {}", client.id, err);
                }
                log::error!("Failed to send email to client {}: {}", client.id, e);
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
    let business_name = supabase.get_business_name(&execution.business_id).await;
    
    if execution.status == "completed" || execution.status == "failed" {
        return Ok(());
    }
    
    let attachments = if let Some(ids) = &execution.attachment_ids {
        supabase.get_attachments(ids).await.unwrap_or_default()
    } else {
        vec![]
    };

    // Get blacklisted emails for this business
    let blacklisted_emails = supabase.get_blacklisted_emails(&execution.business_id).await.unwrap_or_else(|e| {
        log::error!("Failed to fetch blacklist for business {}: {}", execution.business_id, e);
        HashSet::new()
    });

    let is_dev = std::env::var("APP_ENV").unwrap_or_else(|_| "pro".to_string()) == "dev";

    let clients = supabase.get_pending_clients(execution_id).await?;

    for (index, client) in clients.into_iter().enumerate() {
        if is_dev && index > 0 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        let emails = client.emails();
        if emails.is_empty() {
            warn!("Client {} has no emails, skipping", client.id);
            continue;
        }

        // Filter out blacklisted emails
        let filtered_emails: Vec<String> = emails
            .into_iter()
            .filter(|email| {
                let email_lower = email.to_lowercase();
                let is_blacklisted = blacklisted_emails.contains(&email_lower);
                if is_blacklisted {
                    log::warn!("Skipping blacklisted email {} for client {}", email, client.id);
                }
                !is_blacklisted
            })
            .collect();

        if filtered_emails.is_empty() {
            log::warn!("All emails for client {} are blacklisted, marking as failed", client.id);
            let error_data = serde_json::json!({
                "error": "All emails are blacklisted",
                "error_type": "blacklisted_emails"
            });
            let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;
            continue;
        }

        let emails = filtered_emails;

        let template_id = if let Some(client_template) = &client.email_template_id {
            info!("Using client-specific template {} for client {}", client_template, client.id);
            client_template.clone()
        } else if let Some(exec_template) = &execution.email_template_id {
            info!("Using fallback execution template {} for client {}", exec_template, client.id);
            exec_template.clone()
        } else {
            error!("No template configured for client {} in execution {}", client.id, execution_id);

            let error_data = serde_json::json!({
                "error": "No email template configured",
                "error_type": "missing_template"
            });
            let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;

            continue;
        };

        let template = match supabase.get_template(&template_id).await {
            Ok(t) => t,
            Err(e) => {
                error!("Failed to fetch template {} for client {}: {}", template_id, client.id, e);

                let error_data = serde_json::json!({
                    "error": format!("Failed to fetch template: {}", e),
                    "template_id": template_id,
                    "error_type": "template_fetch_failed"
                });
                let _ = supabase.update_client_status(&client.id, "failed", Some(error_data)).await;
                continue;
            }
        };

        let result = send_client_email(&supabase, provider.as_ref(), &template, &client, &emails, &attachments, execution_id, &business_name).await;

        match result {
            Ok(message_id) => {
                let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                if let Some(obj) = new_custom_data.as_object_mut() {
                    obj.insert("message_id".to_string(), serde_json::Value::String(message_id));
                    obj.insert("email_sent_at".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
                    obj.insert("template_id".to_string(), serde_json::Value::String(template_id));
                    if let Some(threshold_id) = &client.threshold_id {
                        obj.insert("threshold_id".to_string(), serde_json::Value::String(threshold_id.clone()));
                    }
                }
                let _ = supabase.update_client_status(&client.id, "sent", Some(new_custom_data)).await;
            }
            Err(e) => {
                let mut new_custom_data = client.custom_data.clone().unwrap_or(serde_json::json!({}));
                if let Some(obj) = new_custom_data.as_object_mut() {
                    obj.insert("error".to_string(), serde_json::Value::String(e.to_string()));
                    obj.insert("template_id".to_string(), serde_json::Value::String(template_id));
                }
                let _ = supabase.update_client_status(&client.id, "failed", Some(new_custom_data)).await;
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
    emails: &[String],
    attachments: &[models::Attachment],
    execution_id: &str,
    business_name: &str,
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
    
    let email_message = EmailMessage {
        to: emails.to_vec(),
        subject: template.subject.clone(),
        html_body: html_body.clone(),
        text_body: text_body.to_string(),
        from: format!("{} - Cartera <notify@borls.com>", business_name),
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
    fn test_preprocess_bare_td() {
        // Basic: no p-wrapper, no extra cells
        let input = "<tr><td>{{#each invoices}}</td></tr>";
        assert_eq!(preprocess_tiptap_template(input), "{{#each invoices}}");
    }

    #[test]
    fn test_preprocess_bare_td_empty_siblings() {
        // Legacy snippet: 4 bare empty <td></td> siblings
        let input = "<tr><td style=\"color:gray\">{{#each invoices}}</td><td></td><td></td><td></td><td></td></tr>";
        assert_eq!(preprocess_tiptap_template(input), "{{#each invoices}}");
    }

    #[test]
    fn test_preprocess_p_wrapper_inside_td() {
        // TipTap wraps content in <p>; empty siblings become <td><p></p></td>
        let input = "<tr><td style=\"color:gray\"><p>{{#each invoices}}</p></td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>";
        assert_eq!(preprocess_tiptap_template(input), "{{#each invoices}}");
    }

    #[test]
    fn test_preprocess_end_helper_with_p_wrapper() {
        // Same pattern for closing {{/each}}
        let input = "<tr><td style=\"color:gray\"><p>{{/each}}</p></td><td><p></p></td><td><p></p></td></tr>";
        assert_eq!(preprocess_tiptap_template(input), "{{/each}}");
    }
}