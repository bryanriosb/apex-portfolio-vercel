import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { fetchCompanyRevenueStatsAction } from '@/lib/actions/company-reports'

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión
    const session = await getServerSession(AUTH_OPTIONS)
    if (!session?.user || session.user.role !== 'company_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener parámetros de fecha
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    console.log('🔍 Debug endpoint called:', { days, startDate, endDate })

    // Obtener datos
    const data = await fetchCompanyRevenueStatsAction(startDate.toISOString(), endDate.toISOString())

    return NextResponse.json({
      success: true,
      data,
      debug: {
        dateRange: { startDate, endDate },
        user: session.user.role
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}