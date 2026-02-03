import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

// Force dynamic route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'states' or 'cities'
    const state_id = searchParams.get('state_id')

    const client = await getSupabaseAdminClient()

    if (type === 'states') {
      // Obtener todos los departamentos
      try {
        // Intentamos acceder a través de una vista en el schema public
        const { data, error } = await client
          .from('colombia_states')
          .select('id_state, state_name')
          .order('state_name')

        if (error) {
          console.error('Error accessing colombia_states view:', error.message)
          
          // Si la vista no existe, devolvemos un mensaje claro
          return NextResponse.json({
            data: [],
            error: 'La vista public.colombia_states no existe. Ejecute: CREATE VIEW public.colombia_states AS SELECT * FROM col.states;'
          })
        }

        return NextResponse.json({
          data: data || [],
        })
      } catch (err) {
        console.error('Error getting states:', err)
        return NextResponse.json(
          { error: 'Error al obtener los departamentos: ' + (err as Error).message },
          { status: 500 }
        )
      }
    }

    if (type === 'cities') {
      if (!state_id) {
        return NextResponse.json(
          { error: 'state_id es requerido para obtener ciudades' },
          { status: 400 }
        )
      }

      // Obtener ciudades del departamento especificado
      try {
        // Intentamos acceder a través de una vista en el schema public
        const { data, error } = await client
          .from('colombia_cities')
          .select('id_city, city_name, is_active, state_id')
          .eq('state_id', parseInt(state_id))
          .eq('is_active', true)
          .order('city_name')

        if (error) {
          console.error('Error accessing colombia_cities view:', error.message)
          
          // Si la vista no existe, devolvemos un mensaje claro
          return NextResponse.json({
            data: [],
            error: 'La vista public.colombia_cities no existe. Ejecute: CREATE VIEW public.colombia_cities AS SELECT * FROM col.cities;'
          })
        }

        return NextResponse.json({
          data: data || [],
        })
      } catch (err) {
        console.error('Error getting cities:', err)
        return NextResponse.json(
          { error: 'Error al obtener las ciudades: ' + (err as Error).message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Tipo no válido. Use "states" o "cities"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in colombia-locations API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}