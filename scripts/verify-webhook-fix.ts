import { parseBrevoEvent } from '../lib/webhooks/parsers/brevo-parser';
import { processEmailEvent } from '../lib/webhooks/handlers/email-webhook-handler';

// Mock context for Supabase
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://eecssalgotbcknehikof.supabase.co';
process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || 'sb_secret_XuAdsWGCgtGgedvgiYcB_Q_y8VJVu7C';

async function testWebhook() {
    console.log('--- Testing Brevo Webhook Fixes ---');

    // Test Case 1: 'request' event type (should be normalized to 'delivered')
    const requestEventPayload = {
        event: 'request',
        'message-id': '<202602270408.87469687366@smtp-relay.mailin.fr>',
        email: 'bryanriosb01@gmail.com',
        date: new Date().toISOString()
    };

    console.log('\n1. Testing "request" event parsing:');
    const parsedRequest = parseBrevoEvent(requestEventPayload);
    console.log('Parsed Event:', JSON.stringify(parsedRequest, null, 2));

    if (parsedRequest?.eventType === 'delivered') {
        console.log('✅ OK: "request" mapped to "delivered"');
    } else {
        console.error('❌ FAIL: "request" not mapped correctly');
    }

    // Test Case 2: Process event (lookup logic)
    // Note: This will actually attempt to hit Supabase
    console.log('\n2. Testing lookup logic (simulation):');
    try {
        console.log('Attempting to process event for existing client (by email fallback)...');
        await processEmailEvent('brevo', parsedRequest!);
        console.log('✅ processEmailEvent finished execution.');
    } catch (error) {
        console.error('❌ Error processing email event:', error);
    }

    // Test Case 3: Case sensitivity and variations
    const mixedCasePayload = {
        event: '  Delivered  ', // Mixed case and spaces
        'message-id': '202602270408.87469687366@smtp-relay.mailin.fr', // No brackets
        email: 'bryanriosb01@gmail.com',
        date: new Date().toISOString()
    };

    console.log('\n3. Testing normalization and variations:');
    const parsedMixed = parseBrevoEvent(mixedCasePayload);
    console.log('Parsed Mixed Event:', JSON.stringify(parsedMixed, null, 2));

    if (parsedMixed?.eventType === 'delivered') {
        console.log('✅ OK: Normalization works');
    } else {
        console.error('❌ FAIL: Normalization failed');
    }

    console.log('\n--- Test Completed ---');
}

testWebhook().catch(console.error);
