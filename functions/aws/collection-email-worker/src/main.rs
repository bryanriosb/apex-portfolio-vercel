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
use aws_sdk_scheduler::{Client as SchedulerClient, types::{Target, FlexibleTimeWindow, FlexibleTimeWindowMode, ActionAfterCompletion}};
use chrono::{DateTime, Utc, Timelike, Datelike};
use chrono_tz::Tz;

mod models;
mod supabase;
mod ses;
mod email_provider;
mod factory;
mod providers;
mod control_tower;

use supabase::SupabaseService;
use email_provider::{EmailProvider, EmailMessage};

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

fn fix_table_colspan(html: &str) -> String {
    let mut processed = html.to_string();

    // Fix 1: Replace rows with 5+ colspan="0" cells containing Handlebars helpers
    // Pattern: <tr>...<td colspan="0"...><p>{{#each invoices}}</p></td><td colspan="0"...><p></p></td>...</tr>
    let re_helper_row = Regex::new(
        r#"(?is)<tr[^>]*>(.*?)</tr>"#
    ).unwrap();
    
    let re_colspan_zero_cell = Regex::new(
        r#"(?is)<td[^>]*colspan=["']0["'][^>]*>"#
    ).unwrap();
    
    processed = re_helper_row.replace_all(&processed, |caps: &regex::Captures| {
        let row_content = &caps[1];
        let full_row = caps[0].to_string();
        
        // Count colspan="0" cells in this row
        let colspan_zero_count = re_colspan_zero_cell.find_iter(row_content).count();
        
        // If 5+ colspan="0" cells, consolidate them
        if colspan_zero_count >= 5 {
            // Check if this row contains a Handlebars helper
            let re_helper = Regex::new(r#"\{\{[/#!]?\s*\w+[^}]*\}\}"#).unwrap();
            
            if re_helper.is_match(row_content) {
                // Find all helpers in this row
                let helpers: Vec<_> = re_helper.find_iter(row_content).map(|m| m.as_str()).collect();
                
                if !helpers.is_empty() {
                    // Replace the entire row with properly formatted cells
                    let mut new_row = String::from("<tr>");
                    for helper in helpers {
                        new_row.push_str(&format!(
                            r#"<td colspan="5" style="padding: 8px; border: 1px solid rgb(229, 231, 235);"><p>{}</p></td>"#,
                            helper
                        ));
                    }
                    new_row.push_str("</tr>");
                    return new_row;
                }
            }
        }
        
        full_row
    }).to_string();

    // Fix 2: Clean up remaining consecutive empty colspan="0" cells
    let re_empty_cells = Regex::new(
        r#"(?is)(<td[^>]*colspan=["']0["'][^>]*>\s*<p>\s*</p>\s*</td>)(?:\s*<td[^>]*colspan=["']0["'][^>]*>\s*<p>\s*</p>\s*</td>){2,}"#
    ).unwrap();

    processed = re_empty_cells.replace_all(&processed, |caps: &regex::Captures| {
        // Replace with a single empty colspan="5" cell
        r#"<td colspan="5" style="padding: 8px; border: 1px solid rgb(229, 231, 235);"><p>&nbsp;</p></td>"#.to_string()
    }).to_string();

    processed
}

fn preprocess_tiptap_template(template_str: &str) -> String {
    let mut processed = template_str.to_string();

    // Fix colspan="0" issues before processing helpers
    processed = fix_table_colspan(&processed);

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
                <span class="m_58810963162805476apple-link" style="color:#999999;font-size:12px;text-align:center">Por favor responda a este correo o comuníquese directamente con el comercio a través del contacto compartido</span>
                </td>
            </tr>
            <tr>
                <td style="font-family:sans-serif;vertical-align:top;padding-bottom:10px;padding-top:10px;color:#999999;font-size:12px;text-align:center" valign="top" align="center">
                <span class="m_58810963162805476apple-link" style="color:#999999;font-size:12px;text-align:center">Notificacion automatica de cobranzas - APX - Plataforma para la gestión inteligente de cobranza, propiedad de BORLS © 2026 Todos los derechos reservados | <a href="https://apex.borls.com" style="color:#999999;font-size:12px;text-align:center" target="_blank">https://apex.borls.com</a></span>
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
    let worker_id = uuid::Uuid::new_v4().to_string();
    
    // Log environment configuration
    let email_provider = std::env::var("EMAIL_PROVIDER").unwrap_or_else(|_| "ses (default)".to_string());
    let lambda_arn = std::env::var("LAMBDA_EMAIL_WORKER_ARN").unwrap_or_else(|_| "NOT SET".to_string());
    let supabase_url = std::env::var("SUPABASE_URL").map(|_| "SET".to_string()).unwrap_or_else(|_| "NOT SET".to_string());
    
    info!("========================================");
    info!("Worker {} started", worker_id);
    info!("EMAIL_PROVIDER: {}", email_provider);
    info!("LAMBDA_EMAIL_WORKER_ARN: {}", lambda_arn);
    info!("SUPABASE_URL: {}", supabase_url);
    info!("Payload: {:?}", payload);
    info!("========================================");

    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let scheduler_client = SchedulerClient::new(&config);

    let supabase = SupabaseService::new();
    let provider = factory::create_email_provider().await;

    let logger = ExecutionLogger::new(
        std::env::var("SUPABASE_URL").unwrap_or_default(),
        std::env::var("SUPABASE_SECRET_KEY").unwrap_or_default(),
        worker_id.clone()
    );

    let action = payload.get("action").and_then(|v| v.as_str()).unwrap_or("none");
    let execution_id = payload.get("execution_id").and_then(|v| v.as_str());

    let mut processed = 0i32;
    let mut failed = 0i32;

    match (action, execution_id) {
        ("wake_up", Some(exec_id)) | ("start_execution", Some(exec_id)) => {
            info!("Action '{}' for execution {}", action, exec_id);
            match process_execution_from_db(
                exec_id,
                &supabase,
                provider.as_ref(),
                &scheduler_client,
                &logger,
            ).await {
                Ok(count) => processed = count,
                Err(e) => {
                    error!("process_execution_from_db failed for {}: {}", exec_id, e);
                    failed = 1;
                }
            }
        }
        _ => {
            warn!("Unexpected action '{}' or missing execution_id. Payload: {:?}", action, payload);
        }
    }

    Ok(json!({
        "status": "completed",
        "worker_id": worker_id,
        "processed": processed,
        "failed": failed
    }))
}

/// Main orchestrator: claim the next due batch, process it, schedule the next one.
async fn process_execution_from_db(
    execution_id: &str,
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    scheduler_client: &SchedulerClient,
    logger: &ExecutionLogger,
) -> Result<i32, Box<dyn Error + Send + Sync>> {
    info!("[process_execution_from_db] Starting execution_id={}", execution_id);
    
    // Verify execution is still active
    let execution = supabase.get_execution(execution_id).await?;
    info!("[process_execution_from_db] Fetched execution: id={}, status={}, business_id={}", 
          execution.id, execution.status, execution.business_id);
    
    if execution.status == "completed" || execution.status == "failed" {
        info!("Execution {} already finished (status={}), skipping", execution_id, execution.status);
        return Ok(0);
    }

    // Find the first pending batch with scheduled_for <= now
    let pending_batches = supabase.get_pending_batches_for_execution(execution_id).await?;
    info!("[process_execution_from_db] Found {} pending batches for execution {}", 
          pending_batches.len(), execution_id);
    
    let now = Utc::now();

    // Log all pending batches for debugging
    for (i, batch) in pending_batches.iter().enumerate() {
        info!("[process_execution_from_db] Pending batch {}: id={}, batch_number={}, scheduled_for={:?}, status={}, client_ids_count={}",
              i, batch.id, batch.batch_number, batch.scheduled_for, batch.status, batch.client_ids.len());
    }
    
    let due_batch = pending_batches.into_iter().find(|b| {
        let is_due = b.scheduled_for.as_deref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.with_timezone(&Utc) <= (now + chrono::Duration::minutes(2)))
            .unwrap_or(true); // If no scheduled_for, treat as immediately due
        
        info!("[process_execution_from_db] Checking batch {}: scheduled_for={:?}, is_due={}", 
              b.id, b.scheduled_for, is_due);
        is_due
    });

    let batch = match due_batch {
        Some(b) => {
            info!("[process_execution_from_db] Selected due batch: id={}, batch_number={}, client_ids_count={}",
                  b.id, b.batch_number, b.client_ids.len());
            b
        }
        None => {
            info!("No due batch found for execution {} right now (now={})", execution_id, now.to_rfc3339());
            // Still try to schedule next future batch if any
            if let Err(e) = schedule_next_batch(execution_id, supabase, scheduler_client).await {
                error!("Failed to schedule next batch for {}: {}", execution_id, e);
            }
            return Ok(0);
        }
    };

    // Atomically claim the batch (pending -> processing)
    info!("[process_execution_from_db] Attempting to claim batch {}", batch.id);
    let claimed = supabase.claim_batch(&batch.id).await?;
    if !claimed {
        info!("Batch {} already claimed by another worker, skipping", batch.id);
        return Ok(0);
    }

    info!("[process_execution_from_db] Successfully claimed batch {} for execution {}", batch.id, execution_id);
    let _ = logger.log_event(execution_id, Some(&batch.id), "PICKED_UP", None).await;

    // Process the batch
    let business_name = supabase.get_business_name(&execution.business_id).await;
    let result = process_batch_from_db(
        supabase,
        provider,
        execution_id,
        &execution.business_id,
        &batch.id,
        &batch.client_ids,
        &business_name,
        &execution,
    ).await;

    match result {
        Ok(count) => {
            supabase.update_batch_status(&batch.id, "completed").await?;
            let _ = logger.log_event(execution_id, Some(&batch.id), "COMPLETED", None).await;
            info!("Batch {} completed ({} emails sent)", batch.id, count);

            // Schedule the next pending batch (if any)
            if let Err(e) = schedule_next_batch(execution_id, supabase, scheduler_client).await {
                error!("Failed to schedule next batch for {}: {}", execution_id, e);
            }

            check_and_complete_execution(supabase, execution_id).await;
            Ok(count)
        }
        Err(e) => {
            error!("Batch {} failed: {}", batch.id, e);
            supabase.update_batch_status(&batch.id, "failed").await?;
            let _ = logger.log_event(execution_id, Some(&batch.id), "FAILED", Some(json!({"error": e.to_string()}))).await;

            // Still try to schedule next batch so execution can continue
            if let Err(e2) = schedule_next_batch(execution_id, supabase, scheduler_client).await {
                error!("Failed to schedule next batch after failure for {}: {}", execution_id, e2);
            }

            Err(e)
        }
    }
}

/// Schedule an EventBridge One-time schedule for the next pending batch of an execution.
/// The cron expression is built in the batch's local timezone — matching how the TypeScript
/// side uses `Intl.DateTimeFormat` to convert UTC → local before extracting time fields.
async fn schedule_next_batch(
    execution_id: &str,
    supabase: &SupabaseService,
    scheduler_client: &SchedulerClient,
) -> Result<(), Box<dyn Error + Send + Sync>> {
    let next_batch = supabase.get_next_pending_batch(execution_id).await?;

    let Some(batch) = next_batch else {
        info!("No pending batches for execution {}. Nothing to schedule.", execution_id);
        return Ok(());
    };

    let scheduled_for = batch.scheduled_for.as_deref().unwrap_or_default();
    let timezone_str = batch.timezone.as_deref().unwrap_or("America/Bogota");

    // Parse the stored UTC timestamp
    let utc_time: DateTime<Utc> = DateTime::parse_from_rfc3339(scheduled_for)?
        .with_timezone(&Utc);

    // EventBridge minimum is 1 minute in the future
    let utc_time = if utc_time <= Utc::now() + chrono::Duration::minutes(1) {
        Utc::now() + chrono::Duration::minutes(2)
    } else {
        utc_time
    };

    // ─── KEY FIX ────────────────────────────────────────────────────────────────
    // Convert UTC → local timezone BEFORE extracting cron fields.
    // ScheduleExpressionTimezone tells EventBridge how to interpret the cron.
    // So cron fields MUST be in that timezone — exactly what TypeScript does with
    // Intl.DateTimeFormat({ timeZone: timezone }).
    // ────────────────────────────────────────────────────────────────────────────
    let tz: Tz = timezone_str.parse().unwrap_or(chrono_tz::America::Bogota);
    let local_time = utc_time.with_timezone(&tz);

    let cron_expr = format!(
        "cron({} {} {} {} ? {})",
        local_time.minute(),  // local minute
        local_time.hour(),    // local hour
        local_time.day(),     // local day
        local_time.month(),   // local month
        local_time.year()     // local year
    );

    let schedule_name = format!("batch-{}", batch.id);
    let lambda_arn = std::env::var("LAMBDA_EMAIL_WORKER_ARN").expect("LAMBDA_EMAIL_WORKER_ARN must be set");
    let role_arn = std::env::var("EVENTBRIDGE_SCHEDULER_ROLE_ARN").expect("EVENTBRIDGE_SCHEDULER_ROLE_ARN must be set");

    info!(
        "Creating EventBridge schedule '{}' for batch {} | UTC: {} | local ({}): {} | cron: {}",
        schedule_name, batch.id, utc_time.to_rfc3339(), timezone_str, local_time.to_rfc3339(), cron_expr
    );

    let result = scheduler_client.create_schedule()
        .name(&schedule_name)
        .schedule_expression(&cron_expr)
        .schedule_expression_timezone(timezone_str)  // EventBridge interprets cron in this tz
        .target(
            Target::builder()
                .arn(&lambda_arn)
                .role_arn(&role_arn)
                .input(serde_json::to_string(&json!({
                    "action": "wake_up",
                    "execution_id": execution_id,
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
        .await;

    match result {
        Ok(_) => {
            info!("EventBridge schedule '{}' created successfully", schedule_name);
            Ok(())
        }
        Err(e) => {
            let err_str = e.to_string();
            if err_str.contains("ConflictException") || err_str.contains("already exists") {
                info!("Schedule '{}' already exists (another worker created it)", schedule_name);
                Ok(())
            } else {
                Err(Box::new(e.into_service_error()))
            }
        }
    }
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

    // ─────────────────────────────────────────────────────────────────────────────
    // Table colspan="0" fix tests
    // ─────────────────────────────────────────────────────────────────────────────

    #[test]
    fn test_fix_table_colspan_zero_basic() {
        // Input: Multiple colspan="0" cells should be consolidated
        let input = r#"<tr><td colspan="0" rowspan="1"><p>{{#each invoices}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td></tr>"#;
        let result = fix_table_colspan(input);
        
        // Should have colspan="5" and only one cell
        assert!(result.contains(r#"colspan="5""#), "Result should have colspan=5: {}", result);
        assert!(result.contains("{{#each invoices}}"), "Result should preserve the helper: {}", result);
        
        // Count <td tags - should only be 1
        let td_count = result.matches("<td").count();
        assert_eq!(td_count, 1, "Should have only 1 td tag, found {}: {}", td_count, result);
    }

    #[test]
    fn test_fix_table_colspan_zero_mixed_with_content() {
        // Real-world scenario from the database
        let input = r#"<tr><td colspan="0" rowspan="1" style="padding: 8px;"><p>{{invoice_number}}</p></td><td colspan="0" rowspan="1" style="padding: 8px;"><p>{{amount_due}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr>"#;
        let result = fix_table_colspan(input);
        
        // The invoice data cells should remain, empty ones should be consolidated
        assert!(result.contains("{{invoice_number}}"), "Should preserve invoice_number: {}", result);
        assert!(result.contains("{{amount_due}}"), "Should preserve amount_due: {}", result);
    }

    #[test]
    fn test_fix_table_colspan_no_change_for_valid_colspan() {
        // Valid colspan="5" should not be modified
        let input = r#"<tr><td colspan="5" style="padding: 8px;"><p>{{#each invoices}}</p></td></tr>"#;
        let result = fix_table_colspan(input);
        
        assert_eq!(result, input, "Valid colspan=5 should not be modified");
    }

    #[test]
    fn test_full_pipeline_with_colspan_zero() {
        // Test the full preprocess pipeline
        let input = r#"<table><tr><td colspan="0" rowspan="1"><p>{{#each invoices}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td></tr><tr><td colspan="0" rowspan="1"><p>{{invoice_number}}</p></td><td colspan="0" rowspan="1"><p>{{amount_due}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td></tr><tr><td colspan="0" rowspan="1"><p>{{/each}}</p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td><td colspan="0" rowspan="1"><p></p></td></tr></table>"#;
        
        let result = preprocess_tiptap_template(input);
        
        // Should have Handlebars helpers extracted
        assert!(result.contains("{{#each invoices}}"), "Should contain {{#each invoices}}: {}", result);
        assert!(result.contains("{{/each}}"), "Should contain {{/each}}: {}", result);
        
        // The invoice row should still be a proper table row
        assert!(result.contains("<tr>"), "Should preserve table structure: {}", result);
        assert!(result.contains("{{invoice_number}}"), "Should preserve invoice_number: {}", result);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // EventBridge timezone cron tests
    //
    // Core property: cron fields MUST reflect the LOCAL time in the target timezone.
    // ScheduleExpressionTimezone tells EventBridge how to interpret the cron, so the
    // fields in the cron expression must already be in that timezone — NOT UTC.
    //
    // This mirrors how TypeScript does it:
    //   new Intl.DateTimeFormat({ timeZone }).formatToParts(utcDate)
    // ─────────────────────────────────────────────────────────────────────────────

    /// Helper to parse a UTC RFC3339 string into DateTime<Utc>
    fn utc(s: &str) -> DateTime<Utc> {
        DateTime::parse_from_rfc3339(s)
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn test_bogota_is_utc_minus_5() {
        // America/Bogota = UTC-5 (no DST)
        // UTC 15:30 → Bogotá 10:30 same day
        let t = utc("2026-03-15T15:30:00Z");
        let (cron, local) = build_eventbridge_cron(&t, "America/Bogota");

        assert_eq!(cron, "cron(30 10 15 3 ? 2026)",
            "Bogotá is UTC-5: 15:30 UTC should become 10:30 local. Got local={}", local);
        assert!(local.contains("10:30"), "Local time should be 10:30, got: {}", local);
    }

    #[test]
    fn test_bogota_midnight_boundary() {
        // UTC 02:00 on March 16 → Bogotá 21:00 on March 15 (day changes!)
        let t = utc("2026-03-16T02:00:00Z");
        let (cron, local) = build_eventbridge_cron(&t, "America/Bogota");

        assert_eq!(cron, "cron(0 21 15 3 ? 2026)",
            "UTC 02:00 March 16 = Bogotá 21:00 March 15. Got local={}", local);
    }

    #[test]
    fn test_new_york_dst_utc_minus_4() {
        // America/New_York in summer (EDT = UTC-4)
        // UTC 20:00 July 1 → New York 16:00
        let t = utc("2026-07-01T20:00:00Z");
        let (cron, local) = build_eventbridge_cron(&t, "America/New_York");

        assert_eq!(cron, "cron(0 16 1 7 ? 2026)",
            "EDT is UTC-4: 20:00 UTC = 16:00 New York. Got local={}", local);
    }

    #[test]
    fn test_madrid_cet_utc_plus_1() {
        // Europe/Madrid in winter (CET = UTC+1)
        // UTC 09:00 Jan 10 → Madrid 10:00
        let t = utc("2026-01-10T09:00:00Z");
        let (cron, local) = build_eventbridge_cron(&t, "Europe/Madrid");

        assert_eq!(cron, "cron(0 10 10 1 ? 2026)",
            "CET is UTC+1: 09:00 UTC = 10:00 Madrid. Got local={}", local);
    }

    #[test]
    fn test_invalid_timezone_falls_back_to_bogota() {
        // An invalid TZ string should silently fall back to America/Bogota (UTC-5)
        // UTC 15:00 → Bogotá 10:00
        let t = utc("2026-06-01T15:00:00Z");
        let (cron, _) = build_eventbridge_cron(&t, "Not/A_Valid_Timezone");

        assert_eq!(cron, "cron(0 10 1 6 ? 2026)",
            "Fallback to Bogota (UTC-5): 15:00 UTC = 10:00 local");
    }

    #[test]
    fn test_utc_vs_local_cron_differ_when_offset_nonzero() {
        // Prove by example that UTC-based cron != local cron for any non-UTC timezone.
        // If someone accidentally uses UTC fields with ScheduleExpressionTimezone=Bogota,
        // EventBridge would fire 5 hours LATE.
        let t = utc("2026-03-15T15:30:00Z");
        let (local_cron, _) = build_eventbridge_cron(&t, "America/Bogota");
        let utc_cron = format!(
            "cron({} {} {} {} ? {})",
            t.minute(), t.hour(), t.day(), t.month(), t.year()
        );

        assert_ne!(local_cron, utc_cron,
            "UTC cron and local cron must differ for non-UTC timezones: {} vs {}", local_cron, utc_cron);
        assert_eq!(utc_cron,  "cron(30 15 15 3 ? 2026)"); // The WRONG value that would be sent
        assert_eq!(local_cron, "cron(30 10 15 3 ? 2026)"); // The CORRECT local value
    }
}

/// Convert a UTC datetime to a local cron expression for EventBridge Scheduler.
/// Must produce the same result as the TypeScript:
///   new Intl.DateTimeFormat({ timeZone, ... }).formatToParts(date)
/// Returns (cron_expr, local_datetime_string) for logging/testing.
pub fn build_eventbridge_cron(utc: &DateTime<Utc>, timezone_str: &str) -> (String, String) {
    let tz: Tz = timezone_str.parse().unwrap_or(chrono_tz::America::Bogota);
    let local = utc.with_timezone(&tz);
    let cron = format!(
        "cron({} {} {} {} ? {})",
        local.minute(), local.hour(), local.day(), local.month(), local.year()
    );
    (cron, local.to_rfc3339())
}

async fn process_batch_from_db(
    supabase: &SupabaseService,
    provider: &dyn EmailProvider,
    execution_id: &str,
    business_id: &str,
    batch_id: &str,
    client_ids: &[String],
    business_name: &str,
    execution: &models::CollectionExecution,
) -> Result<i32, Box<dyn Error + Send + Sync>> {
    info!("[process_batch_from_db] Starting batch_id={} with {} client_ids", batch_id, client_ids.len());
    
    if client_ids.is_empty() {
        warn!("[process_batch_from_db] No client_ids provided for batch {}, returning 0", batch_id);
        return Ok(0);
    }
    
    let clients = supabase.get_clients_by_ids(client_ids).await?;
    info!("[process_batch_from_db] Fetched {} clients from Supabase", clients.len());

    let attachments = if let Some(ids) = &execution.attachment_ids {
        supabase.get_attachments(ids).await.unwrap_or_default()
    } else {
        vec![]
    };

    let is_dev = std::env::var("APP_ENV").unwrap_or_else(|_| "pro".to_string()) == "dev";
    let mut sent_count = 0i32;

    let total_clients = clients.len();
    info!("[process_batch_from_db] Processing {} clients for batch {}", total_clients, batch_id);

    for (index, client) in clients.into_iter().enumerate() {
        info!("[process_batch_from_db] Processing client {}/{}: id={}", index + 1, total_clients, client.id);
        
        if is_dev && index > 0 {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }

        // ========== IDEMPOTENCY CHECK #1: Verify if client was already processed ==========
        match supabase.check_client_processed(&client.id).await {
            Ok((true, Some(message_id))) => {
                info!("[IDEMPOTENCY] Client {} already processed with message_id: {}. Skipping.", client.id, message_id);
                continue;
            }
            Ok((true, None)) => {
                info!("[IDEMPOTENCY] Client {} already processed (status: {}). Skipping.", client.id, client.status);
                continue;
            }
            Ok((false, _)) => {
                // Client not processed yet, continue with processing
            }
            Err(e) => {
                error!("[IDEMPOTENCY] Failed to check client {} status: {}. Will attempt to process anyway.", client.id, e);
            }
        }

        // ========== IDEMPOTENCY CHECK #2: Atomically claim the client ==========
        match supabase.claim_client(&client.id).await {
            Ok(true) => {
                info!("[IDEMPOTENCY] Successfully claimed client {} for processing", client.id);
            }
            Ok(false) => {
                warn!("[IDEMPOTENCY] Client {} was already claimed by another worker or not in pending status. Skipping.", client.id);
                continue;
            }
            Err(e) => {
                error!("[IDEMPOTENCY] Failed to claim client {}: {}. Will attempt to process anyway.", client.id, e);
            }
        }

        let emails = client.emails();
        info!("[process_batch_from_db] Client {} has {} emails: {:?}", client.id, emails.len(), emails);
        
        if emails.is_empty() {
            warn!("[process_batch_from_db] Client {} has no emails, skipping", client.id);
            continue;
        }

        let template_id = if let Some(client_template) = &client.email_template_id {
            client_template.clone()
        } else if let Some(exec_template) = &execution.email_template_id {
            exec_template.clone()
        } else {
            error!("No template for client {} in execution {}", client.id, execution_id);
            let _ = supabase.update_client_status(&client.id, "failed", Some(json!({
                "error": "No email template configured"
            }))).await;
            continue;
        };

        let template = match supabase.get_template(&template_id).await {
            Ok(t) => t,
            Err(e) => {
                error!("Failed to fetch template {} for client {}: {}", template_id, client.id, e);
                let _ = supabase.update_client_status(&client.id, "failed", Some(json!({
                    "error": format!("Failed to fetch template: {}", e)
                }))).await;
                continue;
            }
        };

        // Send with retry: max 5 attempts, 5s between each
        let mut last_err: Option<String> = None;
        let mut success = false;
        let mut final_message_id: Option<String> = None;

        info!("[process_batch_from_db] Sending email to client {} (attempt 1/5)", client.id);

        for attempt in 1u8..=5 {
            // ========== IDEMPOTENCY CHECK #3: Before each retry, verify if another worker already sent it ==========
            if attempt > 1 {
                match supabase.check_client_processed(&client.id).await {
                    Ok((true, Some(msg_id))) => {
                        info!("[IDEMPOTENCY] Client {} was already processed by another worker during retry. Message ID: {}. Stopping retries.", 
                            client.id, msg_id);
                        final_message_id = Some(msg_id);
                        success = true;
                        break;
                    }
                    Ok((true, None)) => {
                        info!("[IDEMPOTENCY] Client {} was already processed by another worker during retry. Stopping retries.", client.id);
                        success = true;
                        break;
                    }
                    _ => {
                        // Continue with retry
                    }
                }
            }

            match send_client_email(supabase, provider, &template, &client, &emails, &attachments, execution_id, business_name).await {
                Ok(message_id) => {
                    info!("[process_batch_from_db] Email sent successfully to client {}: message_id={}", client.id, message_id);
                    
                    // ========== IDEMPOTENCY CHECK #4: Verify if event already exists before marking as accepted ==========
                    match supabase.check_event_exists(&client.id, "email_sent", &message_id).await {
                        Ok(true) => {
                            warn!("[IDEMPOTENCY] Event email_sent for client {} with message_id {} already exists. Duplicate detected, skipping status update.", 
                                client.id, message_id);
                            // Still count as success but don't insert duplicate
                            success = true;
                            final_message_id = Some(message_id);
                            break;
                        }
                        Ok(false) => {
                            // Event doesn't exist, proceed normally
                            let mut custom_data = client.custom_data.clone().unwrap_or(json!({}));
                            if let Some(obj) = custom_data.as_object_mut() {
                                obj.insert("message_id".into(), json!(message_id));
                                obj.insert("email_sent_at".into(), json!(Utc::now().to_rfc3339()));
                                obj.insert("template_id".into(), json!(&template_id));
                                if let Some(tid) = &client.threshold_id {
                                    obj.insert("threshold_id".into(), json!(tid));
                                }
                            }
                            let _ = supabase.update_client_status(&client.id, "accepted", Some(custom_data)).await;
                            sent_count += 1;
                            success = true;
                            final_message_id = Some(message_id);
                            break;
                        }
                        Err(e) => {
                            error!("[IDEMPOTENCY] Failed to check event existence for client {}: {}. Proceeding with status update anyway.", 
                                client.id, e);
                            // Proceed with update even if check failed
                            let mut custom_data = client.custom_data.clone().unwrap_or(json!({}));
                            if let Some(obj) = custom_data.as_object_mut() {
                                obj.insert("message_id".into(), json!(message_id));
                                obj.insert("email_sent_at".into(), json!(Utc::now().to_rfc3339()));
                                obj.insert("template_id".into(), json!(&template_id));
                                if let Some(tid) = &client.threshold_id {
                                    obj.insert("threshold_id".into(), json!(tid));
                                }
                            }
                            let _ = supabase.update_client_status(&client.id, "accepted", Some(custom_data)).await;
                            sent_count += 1;
                            success = true;
                            final_message_id = Some(message_id);
                            break;
                        }
                    }
                }
                Err(e) => {
                    last_err = Some(e.to_string());
                    if attempt < 5 {
                        warn!("[process_batch_from_db] Attempt {}/5 failed for client {}: {}. Retrying in 5s...", attempt, client.id, e);
                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    } else {
                        error!("[process_batch_from_db] All 5 attempts failed for client {}: {}", client.id, e);
                    }
                }
            }
        }

        if !success {
            let err_msg = last_err.unwrap_or_else(|| "Unknown error".to_string());
            error!("All 5 attempts failed for client {}: {}", client.id, err_msg);
            
            // Check one more time if another worker succeeded
            match supabase.check_client_processed(&client.id).await {
                Ok((true, _)) => {
                    info!("[IDEMPOTENCY] Client {} was processed by another worker after all retries failed. Not marking as failed.", client.id);
                }
                _ => {
                    let _ = supabase.update_client_status(&client.id, "failed", Some(json!({
                        "error": err_msg,
                        "template_id": &template_id
                    }))).await;
                }
            }
        }
    }

    Ok(sent_count)
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
    info!("[send_client_email] Preparing email for client {}: emails={:?}, template={}", 
          client.id, emails, template.id);
    
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
        from: format!("{} - Cartera <siesa@borls.com>", business_name),
        attachments: attachments.to_vec(),
        client_id: Some(client.id.clone()),
        execution_id: Some(execution_id.to_string()),
        message_id: None,
    };
    
    info!("[send_client_email] Sending email via provider to {:?}", emails);
    
    let result = provider.send_email(email_message).await?;
    
    info!("[send_client_email] Email sent successfully: message_id={}, provider={}", 
          result.message_id, result.provider);
    
    Ok(result.message_id)
}
