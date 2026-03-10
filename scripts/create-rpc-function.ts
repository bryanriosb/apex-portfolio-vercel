import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import * as fs from 'fs'
import * as path from 'path'

async function createRPCFunction() {
    try {
        const supabase = await getSupabaseAdminClient()
        
        // Leer el archivo SQL
        const sqlPath = path.join(process.cwd(), 'supabase/migrations/functions/search_clients_by_execution.sql')
        const sql = fs.readFileSync(sqlPath, 'utf-8')
        
        // Ejecutar el SQL
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
        
        if (error) {
            console.error('Error al crear función RPC:', error)
            console.log('Intentando ejecutar SQL directamente...')
            
            // Fallback: Intentar con query raw
            const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('query', sql)
            
            if (queryError) {
                console.error('No se pudo ejecutar SQL:', queryError)
                console.log('\n=== INSTRUCCIONES MANUALES ===')
                console.log('Por favor ejecuta el siguiente SQL en el editor de Supabase:')
                console.log('\n' + sql)
                return false
            }
        }
        
        console.log('✅ Función RPC creada exitosamente')
        return true
    } catch (error) {
        console.error('Error:', error)
        return false
    }
}

createRPCFunction()
