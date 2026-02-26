const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
)

async function testUpsert() {
    const testData = {
        business_id: '328f6c2f-dc0f-4383-96d2-dc9d020fa323',
        nit: '900123457',
        email: 'test_upsert@example.com',
        full_name: 'Test Upsert',
        status: 'active'
    }

    console.log('Testing upsert with business_id and nit conflict resolution...')
    const { data, error } = await supabase
        .from('business_customers')
        .upsert([testData], {
            onConflict: 'business_id,nit',
            ignoreDuplicates: false
        })

    if (error) {
        console.error('ERROR:', error.message)
        console.error('DETAILS:', error.details)
    } else {
        console.log('SUCCESS: Upsert worked, which means the unique constraint exists.')
    }
}

testUpsert()
