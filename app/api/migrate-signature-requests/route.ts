import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseAdminClient()
    
    // SQL para agregar las columnas faltantes
    const sqlStatements = [
      `ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses (id) ON DELETE CASCADE;`,
      `ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers (id) ON DELETE CASCADE;`,
      `CREATE INDEX IF NOT EXISTS idx_signature_requests_business ON signature_requests (business_id);`,
      `CREATE INDEX IF NOT EXISTS idx_signature_requests_customer ON signature_requests (customer_id);`
    ]
    
    const results = []
    
    for (const sql of sqlStatements) {
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
          console.error(`Error ejecutando SQL: ${sql}`, error)
          results.push({ sql, error: error.message })
        } else {
          console.log(`✅ SQL ejecutado: ${sql}`)
          results.push({ sql, success: true })
        }
      } catch (err) {
        console.error(`Error catch ejecutando SQL: ${sql}`, err)
        results.push({ sql, error: (err as Error).message })
      }
    }
    
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Error en endpoint de migración:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}