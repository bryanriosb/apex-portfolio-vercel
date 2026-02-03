import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import fs from 'fs'
import path from 'path'

/**
 * Ejecuta un archivo SQL usando el cliente admin de Supabase
 */
export async function executeSqlFile(filePath: string) {
  try {
    const supabase = await getSupabaseAdminClient()
    
    // Leer el contenido del archivo SQL
    const sqlContent = fs.readFileSync(filePath, 'utf8')
    
    // Dividir el contenido en sentencias individuales (simple split por ;)
    // Esto es básico pero funciona para la mayoría de los casos
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Ejecutando ${statements.length} sentencias desde ${filePath}`)
    
    const results = []
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
          
          if (error) {
            console.error(`Error ejecutando: ${statement.substring(0, 100)}...`, error)
            results.push({ statement: statement.substring(0, 100) + '...', error })
          } else {
            console.log(`✅ Ejecutado: ${statement.substring(0, 100)}...`)
            results.push({ statement: statement.substring(0, 100) + '...', success: true })
          }
        } catch (err) {
          console.error(`Error catch ejecutando: ${statement.substring(0, 100)}...`, err)
          results.push({ statement: statement.substring(0, 100) + '...', error: err })
        }
      }
    }
    
    return { success: true, results }
  } catch (error) {
    console.error('Error ejecutando archivo SQL:', error)
    return { success: false, error }
  }
}

/**
 * Ejecuta el SQL para crear la tabla signature_requests y sus funciones
 */
export async function createSignatureRequestsTable() {
  const sqlFilePath = path.join(process.cwd(), 'lib/sql/create-signature-requests-table.sql')
  return await executeSqlFile(sqlFilePath)
}

/**
 * Ejecuta el SQL para las funciones de firma
 */
export async function createSignatureFunctions() {
  const sqlFilePath = path.join(process.cwd(), 'lib/sql/medical-record-signature.sql')
  return await executeSqlFile(sqlFilePath)
}