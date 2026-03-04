import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

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

async function syncExecutionFromCsv(csvPath: string, executionId: string) {
  console.log(`🔄 SYNC EXECUTION FROM CSV`)
  console.log(`CSV: ${csvPath}`)
  console.log(`Execution: ${executionId}`)
  console.log('='.repeat(60))
  
  // 1. Get all clients for this execution with their emails
  console.log('\n📥 Loading clients from database...')
  const { data: clients, error: clientsError } = await supabase
    .from('collection_clients')
    .select(`
      id,
      customer_id,
      status,
      custom_data,
      email_sent_at,
      email_delivered_at,
      email_opened_at
    `)
    .eq('execution_id', executionId)
  
  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError)
    return
  }
  
  console.log(`✅ Found ${clients?.length} clients in execution`)
  
  // Build email -> client mapping
  const emailToClient = new Map()
  const clientsWithoutEmail: any[] = []
  
  for (const client of clients || []) {
    // Get emails from custom_data
    const emails = client.custom_data?.emails || client.custom_data?.email
    
    if (Array.isArray(emails)) {
      emails.forEach((email: string) => {
        emailToClient.set(email.toLowerCase(), client)
      })
    } else if (typeof emails === 'string') {
      emailToClient.set(emails.toLowerCase(), client)
    } else {
      clientsWithoutEmail.push(client)
    }
  }
  
  console.log(`📧 ${emailToClient.size} clients with emails mapped`)
  console.log(`⚠️  ${clientsWithoutEmail.length} clients without email info`)
  
  // 2. Parse CSV
  console.log('\n📄 Parsing CSV...')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  const events: CsvEvent[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
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
  
  console.log(`✅ Parsed ${events.length} events from CSV`)
  
  // 3. Match events to clients
  console.log('\n🔍 Matching events to clients...')
  
  const clientEvents = new Map() // clientId -> { firstOpening: boolean, opened: boolean, clicked: boolean, delivered: boolean, messageId: string }
  let matchedEvents = 0
  let unmatchedEmails = new Set<string>()
  
  for (const event of events) {
    const email = event.email.toLowerCase()
    const client = emailToClient.get(email)
    
    if (!client) {
      unmatchedEmails.add(email)
      continue
    }
    
    matchedEvents++
    
    if (!clientEvents.has(client.id)) {
      clientEvents.set(client.id, {
        client: client,
        firstOpening: false,
        opened: false,
        clicked: false,
        delivered: false,
        messageId: event.messageId,
        email: email
      })
    }
    
    const clientEvent = clientEvents.get(client.id)
    const eventType = event.eventType.toLowerCase()
    
    switch (eventType) {
      case 'first opening':
        clientEvent.firstOpening = true
        clientEvent.opened = true
        break
      case 'opened':
        clientEvent.opened = true
        break
      case 'clicked':
        clientEvent.clicked = true
        clientEvent.opened = true
        break
      case 'loaded by proxy':
        clientEvent.opened = true
        break
      case 'delivered':
        clientEvent.delivered = true
        break
    }
    
    // Keep the messageId for updating custom_data
    if (event.messageId) {
      clientEvent.messageId = event.messageId
    }
  }
  
  console.log(`✅ Matched ${matchedEvents} events to ${clientEvents.size} clients`)
  console.log(`⚠️  ${unmatchedEmails.size} emails from CSV not found in execution`)
  
  // 4. Calculate correct metrics
  let totalSent = 0
  let totalDelivered = 0
  let totalOpened = 0
  let totalClicked = 0
  
  for (const [clientId, data] of clientEvents) {
    totalSent++
    if (data.delivered || data.opened || data.clicked) totalDelivered++
    if (data.opened || data.clicked || data.firstOpening) totalOpened++
    if (data.clicked) totalClicked++
  }
  
  // Add clients without events (they were sent but no webhook received yet)
  const clientsWithNoEvents = clients?.filter(c => !clientEvents.has(c.id)) || []
  totalSent += clientsWithNoEvents.length
  
  console.log('\n📊 CALCULATED METRICS:')
  console.log(`  Sent: ${totalSent}`)
  console.log(`  Delivered: ${totalDelivered}`)
  console.log(`  Opened: ${totalOpened}`)
  console.log(`  Clicked: ${totalClicked}`)
  
  // 5. Update execution metrics
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0
  const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0
  
  console.log('\n🔄 Updating execution metrics...')
  const { error: updateExecError } = await supabase
    .from('collection_executions')
    .update({
      emails_sent: totalSent,
      emails_delivered: totalDelivered,
      emails_opened: totalOpened,
      delivery_rate: Number(deliveryRate.toFixed(2)),
      open_rate: Number(openRate.toFixed(2))
    })
    .eq('id', executionId)
  
  if (updateExecError) {
    console.error('❌ Error updating execution:', updateExecError)
  } else {
    console.log('✅ Execution metrics updated!')
  }
  
  // 6. Update client statuses and message_ids
  console.log('\n🔄 Updating client statuses and message_ids...')
  
  let updatedStatusCount = 0
  let updatedMessageIdCount = 0
  let errorCount = 0
  
  for (const [clientId, data] of clientEvents) {
    const client = data.client
    let newStatus = client.status
    
    // Determine new status based on events
    if (data.clicked || data.firstOpening || data.opened) {
      newStatus = 'opened'
    } else if (data.delivered) {
      newStatus = 'delivered'
    } else {
      newStatus = 'sent'
    }
    
    // Prepare update payload
    const updatePayload: any = {}
    
    // Update status if changed
    if (newStatus !== client.status) {
      updatePayload.status = newStatus
    }
    
    // Update message_id in custom_data if not present
    if (data.messageId && !client.custom_data?.message_id) {
      updatePayload.custom_data = {
        ...client.custom_data,
        message_id: data.messageId,
        email: data.email
      }
    }
    
    // Only update if there are changes
    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('collection_clients')
        .update(updatePayload)
        .eq('id', clientId)
      
      if (updateError) {
        console.error(`  ❌ Error updating client ${clientId}:`, updateError)
        errorCount++
      } else {
        if (updatePayload.status) updatedStatusCount++
        if (updatePayload.custom_data) updatedMessageIdCount++
      }
    }
  }
  
  console.log(`✅ Updated ${updatedStatusCount} client statuses`)
  console.log(`✅ Updated ${updatedMessageIdCount} client message_ids`)
  console.log(`❌ Errors: ${errorCount}`)
  
  // 7. Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total clients in execution: ${clients?.length}`)
  console.log(`Clients with events: ${clientEvents.size}`)
  console.log(`Clients without events: ${clientsWithNoEvents.length}`)
  console.log(`Emails not in execution: ${unmatchedEmails.size}`)
  console.log('\nFinal Metrics:')
  console.log(`  Sent: ${totalSent}`)
  console.log(`  Delivered: ${totalDelivered} (${deliveryRate.toFixed(2)}%)`)
  console.log(`  Opened: ${totalOpened} (${openRate.toFixed(2)}%)`)
  console.log(`  Clicked: ${totalClicked}`)
  console.log('\n✅ Sync complete!')
}

// Run
const csvPath = process.argv[2] || '/home/bryan/Desktop/logs-10600062-1772225550373.csv'
const executionId = process.argv[3] || '3c5319ce-bc80-459e-bf48-c54ff0dee8f9'

syncExecutionFromCsv(csvPath, executionId)
