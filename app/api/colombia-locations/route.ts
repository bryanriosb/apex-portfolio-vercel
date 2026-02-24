import { NextRequest, NextResponse } from 'next/server'

// Force dynamic route
export const dynamic = 'force-dynamic'

interface State {
  id_state: number
  state_name: string
}

interface City {
  id_city: number
  city_name: string
  is_active: boolean
  state_id: number
}

// Cargar datos estáticos de los archivos JSON
const statesData: State[] = require('@/assets/data/col/states.json')
const citiesData: City[] = require('@/assets/data/col/cities.json')

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'states' or 'cities'
    const state_id = searchParams.get('state_id')

    if (type === 'states') {
      const sortedStates = statesData
        .slice()
        .sort((a, b) => a.state_name.localeCompare(b.state_name))

      return NextResponse.json({
        data: sortedStates,
      })
    }

    if (type === 'cities') {
      if (!state_id) {
        return NextResponse.json(
          { error: 'state_id es requerido para obtener ciudades' },
          { status: 400 }
        )
      }

      const stateIdNum = parseInt(state_id)
      const filteredCities = citiesData
        .filter((city) => city.state_id === stateIdNum && city.is_active)
        .sort((a, b) => a.city_name.localeCompare(b.city_name))

      return NextResponse.json({
        data: filteredCities,
      })
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
