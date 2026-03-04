import { getSupabaseAdminClient } from '../lib/actions/supabase'

async function main() {
    console.log('Checking for collection-attachments bucket...')
    try {
        const supabase = await getSupabaseAdminClient()
        const bucketName = 'collection-attachments'

        const { data: buckets, error: listError } = await supabase.storage.listBuckets()
        if (listError) {
            console.error('Error listing buckets:', listError)
            process.exit(1)
        }

        const exists = buckets.find(b => b.name === bucketName)
        if (exists) {
            console.log(`Bucket '${bucketName}' already exists.`)
        } else {
            console.log(`Bucket '${bucketName}' not found. Creating...`)
            const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'text/csv', 'text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
            })
            if (createError) {
                console.error('Error creating bucket:', createError)
                process.exit(1)
            }
            console.log(`Bucket '${bucketName}' created successfully.`)
        }
    } catch (e) {
        console.error("Script error:", e)
    }
}

main()
