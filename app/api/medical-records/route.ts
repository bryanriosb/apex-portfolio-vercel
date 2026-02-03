import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { getSupabaseAdminClient } from '@/lib/actions/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(AUTH_OPTIONS)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const business_id = searchParams.get('business_id')
    const page = parseInt(searchParams.get('page') || '1')
    const page_size = parseInt(searchParams.get('page_size') || '10')
    const search = searchParams.get('search')
    const record_type = searchParams.get('record_type')
    const status = searchParams.get('status')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    if (!business_id) {
      return NextResponse.json({ error: 'business_id es requerido' }, { status: 400 })
    }

    const supabase = await getSupabaseAdminClient()

    // Construir la consulta base
    let query = supabase
      .from('medical_records')
      .select(`
        *,
        customer:business_customers(
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        specialist:specialists(
          id,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .eq('business_id', business_id)
      .neq('status', 'deleted')

    // Aplicar filtros
    if (search) {
      query = query.ilike('chief_complaint', `%${search}%`)
    }

    if (record_type) {
      query = query.in('record_type', [record_type])
    }

    if (status) {
      query = query.in('status', [status])
    }

    if (start_date) {
      query = query.gte('record_date', start_date)
    }

    if (end_date) {
      query = query.lte('record_date', end_date)
    }

    // Paginación
    const offset = (page - 1) * page_size
    query = query
      .range(offset, offset + page_size - 1)
      .order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching medical records:', error)
      return NextResponse.json(
        { error: 'Error al obtener las historias clínicas' },
        { status: 500 }
      )
    }

    const total_pages = Math.ceil((count || 0) / page_size)

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      total_pages,
      current_page: page,
      page_size,
    })
  } catch (error) {
    console.error('Error in medical-records API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}