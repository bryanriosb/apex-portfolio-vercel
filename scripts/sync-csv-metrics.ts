import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://eecssalgotbcknehikof.supabase.co'
const supabaseKey = 'sb_secret_XuAdsWGCgtGgedvgiYcB_Q_y8VJVu7C'

const supabase = createClient(supabaseUrl, supabaseKey)

interface CsvEvent {
  eventType: string
  timestamp: string
  subject: string
  from: string
  email: string
  tag: string
  messageId: string
  link: string
}

async function processCsvAndSyncMetrics(csvPath: string, executionId: string) {
  console.log(`Processing CSV: ${csvPath}`)
  console.log(`Execution ID: ${executionId}`)
  
  // Read CSV
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  console.log(`Total lines in CSV: ${lines.length}`)
  
  // Parse events
  const events: CsvEvent[] = []
  const headers = lines[0].split(',')
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // Handle commas within quoted fields
    const parts: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current.trim())
    
    if (parts.length >= 7) {
      events.push({
        eventType: parts[0],
        timestamp: parts[1],
        subject: parts[2],
        from: parts[3],
        email: parts[4],
        tag: parts[5],
        messageId: parts[6],
        link: parts[7] || 'NA'
      })
    }
  }
  
  console.log(`\n📊 CSV EVENT ANALYSIS`)
  console.log('=' .repeat(50))
  
  // Count unique events by messageId and email
  const uniqueByMessageId = {
    firstOpening: new Set<string>(),
    opened: new Set<string>(),
    clicked: new Set<string>(),
    loadedByProxy: new Set<string>(),
    sent: new Set<string>(),
    delivered: new Set<string>(),
    bounced: new Set<string>()
  }
  
  const uniqueByEmail = {
    firstOpening: new Set<string>(),
    opened: new Set<string>(),
    clicked: new Set<string>(),
    loadedByProxy: new Set<string>(),
    sent: new Set<string>(),
    delivered: new Set<string>(),
    bounced: new Set<string>()
  }
  
  // Track all unique messageIds and emails
  const allMessageIds = new Set<string>()
  const allEmails = new Set<string>()
  
  for (const event of events) {
    allMessageIds.add(event.messageId)
    allEmails.add(event.email)
    
    const eventTypeLower = event.eventType.toLowerCase()
    
    switch (eventTypeLower) {
      case 'first opening':
        uniqueByMessageId.firstOpening.add(event.messageId)
        uniqueByEmail.firstOpening.add(event.email)
        break
      case 'opened':
        uniqueByMessageId.opened.add(event.messageId)
        uniqueByEmail.opened.add(event.email)
        break
      case 'clicked':
        uniqueByMessageId.clicked.add(event.messageId)
        uniqueByEmail.clicked.add(event.email)
        break
      case 'loaded by proxy':
        uniqueByMessageId.loadedByProxy.add(event.messageId)
        uniqueByEmail.loadedByProxy.add(event.email)
        break
      case 'sent':
      case 'request':
        uniqueByMessageId.sent.add(event.messageId)
        uniqueByEmail.sent.add(event.email)
        break
      case 'delivered':
        uniqueByMessageId.delivered.add(event.messageId)
        uniqueByEmail.delivered.add(event.email)
        break
      case 'hard bounce':
      case 'soft bounce':
      case 'blocked':
      case 'invalid email':
        uniqueByMessageId.bounced.add(event.messageId)
        uniqueByEmail.bounced.add(event.email)
        break
    }
  }
  
  console.log(`\n📧 Unique Message IDs: ${allMessageIds.size}`)
  console.log(`👤 Unique Emails: ${allEmails.size}`)
  
  console.log(`\n📈 BY MESSAGE ID:`)
  console.log(`  First Opening: ${uniqueByMessageId.firstOpening.size}`)
  console.log(`  Opened (subsequent): ${uniqueByMessageId.opened.size}`)
  console.log(`  Clicked: ${uniqueByMessageId.clicked.size}`)
  console.log(`  Loaded by Proxy: ${uniqueByMessageId.loadedByProxy.size}`)
  console.log(`  Sent: ${uniqueByMessageId.sent.size}`)
  console.log(`  Delivered: ${uniqueByMessageId.delivered.size}`)
  console.log(`  Bounced: ${uniqueByMessageId.bounced.size}`)
  
  console.log(`\n📈 BY EMAIL:`)
  console.log(`  First Opening: ${uniqueByEmail.firstOpening.size}`)
  console.log(`  Opened (subsequent): ${uniqueByEmail.opened.size}`)
  console.log(`  Clicked: ${uniqueByEmail.clicked.size}`)
  console.log(`  Loaded by Proxy: ${uniqueByEmail.loadedByProxy.size}`)
  console.log(`  Sent: ${uniqueByEmail.sent.size}`)
  console.log(`  Delivered: ${uniqueByEmail.delivered.size}`)
  console.log(`  Bounced: ${uniqueByEmail.bounced.size}`)
  
  // Get current DB state
  console.log(`\n🔍 DATABASE STATE`)
  console.log('=' .repeat(50))
  
  const { data: execution, error: execError } = await supabase
    .from('collection_executions')
    .select('*')
    .eq('id', executionId)
    .single()
  
  if (execError) {
    console.error('Error fetching execution:', execError)
    return
  }
  
  console.log(`Current DB Metrics:`)
  console.log(`  Total Clients: ${execution.total_clients}`)
  console.log(`  Emails Sent: ${execution.emails_sent}`)
  console.log(`  Emails Delivered: ${execution.emails_delivered}`)
  console.log(`  Emails Opened: ${execution.emails_opened}`)
  console.log(`  Emails Bounced: ${execution.emails_bounced}`)
  console.log(`  Delivery Rate: ${execution.delivery_rate}%`)
  console.log(`  Open Rate: ${execution.open_rate}%`)
  
  // Get clients by status
  const { data: clients, error: clientsError } = await supabase
    .from('collection_clients')
    .select('id, status, custom_data, email_sent_at, email_delivered_at, email_opened_at')
    .eq('execution_id', executionId)
  
  if (clientsError) {
    console.error('Error fetching clients:', clientsError)
    return
  }
  
  const statusCounts: Record<string, number> = {}
  clients?.forEach(client => {
    statusCounts[client.status] = (statusCounts[client.status] || 0) + 1
  })
  
  console.log(`\n📊 Client Status Counts:`)
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })
  
  // Calculate what metrics SHOULD be
  // For opened count: First Opening is the key metric (unique opens)
  // Total opened = First Opening + Opened (subsequent) - but only count unique by email
  const totalUniqueOpens = uniqueByEmail.firstOpening.size
  const totalUniqueDelivered = uniqueByEmail.delivered.size || uniqueByEmail.sent.size || uniqueByMessageId.firstOpening.size
  const totalUniqueSent = allEmails.size
  
  console.log(`\n🎯 CORRECTED METRICS (from CSV)`)
  console.log('=' .repeat(50))
  console.log(`  Total Sent (unique emails): ${totalUniqueSent}`)
  console.log(`  Total Delivered (unique): ${totalUniqueDelivered}`)
  console.log(`  Total Opened (First Opening only): ${totalUniqueOpens}`)
  console.log(`  Total Clicked (unique): ${uniqueByEmail.clicked.size}`)
  
  // Calculate rates
  const deliveryRate = totalUniqueSent > 0 ? (totalUniqueDelivered / totalUniqueSent) * 100 : 0
  const openRate = totalUniqueDelivered > 0 ? (totalUniqueOpens / totalUniqueDelivered) * 100 : 0
  
  console.log(`\n📊 Calculated Rates:`)
  console.log(`  Delivery Rate: ${deliveryRate.toFixed(2)}%`)
  console.log(`  Open Rate: ${openRate.toFixed(2)}%`)
  
  // Compare with DB
  console.log(`\n⚠️  DISCREPANCIES DETECTED:`)
  console.log('=' .repeat(50))
  
  const discrepancies = []
  
  if (execution.emails_sent !== totalUniqueSent) {
    discrepancies.push(`emails_sent: ${execution.emails_sent} → ${totalUniqueSent}`)
  }
  if (execution.emails_delivered !== totalUniqueDelivered) {
    discrepancies.push(`emails_delivered: ${execution.emails_delivered} → ${totalUniqueDelivered}`)
  }
  if (execution.emails_opened !== totalUniqueOpens) {
    discrepancies.push(`emails_opened: ${execution.emails_opened} → ${totalUniqueOpens}`)
  }
  
  if (discrepancies.length === 0) {
    console.log('✅ No discrepancies found!')
  } else {
    discrepancies.forEach(d => console.log(`  ${d}`))
  }
  
  // Update execution metrics
  console.log(`\n🔄 UPDATING EXECUTION METRICS...`)
  
  const { error: updateError } = await supabase
    .from('collection_executions')
    .update({
      emails_sent: totalUniqueSent,
      emails_delivered: totalUniqueDelivered,
      emails_opened: totalUniqueOpens,
      delivery_rate: Number(deliveryRate.toFixed(2)),
      open_rate: Number(openRate.toFixed(2))
    })
    .eq('id', executionId)
  
  if (updateError) {
    console.error('❌ Error updating execution:', updateError)
  } else {
    console.log('✅ Execution metrics updated successfully!')
  }
  
  // Now update individual client statuses based on CSV data
  console.log(`\n🔄 UPDATING CLIENT STATUSES...`)
  
  let updatedCount = 0
  let errorCount = 0
  
  // Build email -> highest event type mapping
  const emailToEventType: Record<string, string> = {}
  
  for (const event of events) {
    const eventTypeLower = event.eventType.toLowerCase()
    const email = event.email
    
    // Priority: first opening > opened > clicked > loaded by proxy > delivered > sent
    const priority: Record<string, number> = {
      'first opening': 5,
      'opened': 4,
      'clicked': 4,
      'loaded by proxy': 4,
      'delivered': 3,
      'sent': 2,
      'request': 2
    }
    
    const currentPriority = priority[emailToEventType[email]] || 0
    const newPriority = priority[eventTypeLower] || 0
    
    if (newPriority > currentPriority) {
      emailToEventType[email] = eventTypeLower
    }
  }
  
  console.log(`  Found ${Object.keys(emailToEventType).length} unique emails with events`)
  
  // Find clients by email and update their status
  for (const [email, eventType] of Object.entries(emailToEventType)) {
    // Find client by email in custom_data
    const { data: matchingClients, error: findError } = await supabase
      .from('collection_clients')
      .select('id, status, custom_data')
      .eq('execution_id', executionId)
      .or(`custom_data->emails.cs.["${email}"],custom_data->>email.eq.${email}`)
    
    if (findError) {
      console.error(`  Error finding client for ${email}:`, findError)
      errorCount++
      continue
    }
    
    if (!matchingClients || matchingClients.length === 0) {
      // Try searching in customer email
      const { data: customers } = await supabase
        .from('business_customers')
        .select('id, emails')
        .contains('emails', [email])
      
      if (customers && customers.length > 0) {
        const customerIds = customers.map(c => c.id)
        const { data: clientByCustomer } = await supabase
          .from('collection_clients')
          .select('id, status, custom_data')
          .eq('execution_id', executionId)
          .in('customer_id', customerIds)
        
        if (clientByCustomer && clientByCustomer.length > 0) {
          matchingClients.push(...clientByCustomer)
        }
      }
    }
    
    if (matchingClients && matchingClients.length > 0) {
      for (const client of matchingClients) {
        let newStatus = client.status
        
        switch (eventType) {
          case 'first opening':
          case 'opened':
          case 'clicked':
          case 'loaded by proxy':
            newStatus = 'opened'
            break
          case 'delivered':
            if (client.status !== 'opened') {
              newStatus = 'delivered'
            }
            break
          case 'sent':
          case 'request':
            if (client.status === 'pending' || client.status === 'accepted') {
              newStatus = 'sent'
            }
            break
        }
        
        if (newStatus !== client.status) {
          const { error: updateClientError } = await supabase
            .from('collection_clients')
            .update({ status: newStatus })
            .eq('id', client.id)
          
          if (updateClientError) {
            console.error(`  Error updating client ${client.id}:`, updateClientError)
            errorCount++
          } else {
            updatedCount++
          }
        }
      }
    }
  }
  
  console.log(`  ✅ Updated ${updatedCount} clients`)
  console.log(`  ❌ Errors: ${errorCount}`)
  
  console.log(`\n✅ SYNC COMPLETE`)
}

// Run with CSV path and execution ID
const csvPath = process.argv[2] || '/home/bryan/Desktop/logs-10600062-1772225550373.csv'
const executionId = process.argv[3] || '3c5319ce-bc80-459e-bf48-c54ff0dee8f9'

processCsvAndSyncMetrics(csvPath, executionId)
