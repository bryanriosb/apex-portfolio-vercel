import {
  fetchRevenueStatsAction,
  fetchRevenueTrendAction,
  fetchTopServicesAction,
  fetchSpecialistStatsAction,
  fetchCustomerStatsAction,
  fetchHourlyDistributionAction,
  fetchDailyDistributionAction,
  fetchRevenueByServiceAction,
  fetchRevenueBySpecialistAction,
  type DateRangeParams,
  type RevenueData,
  type RevenueTrendItem,
  type ServiceStats,
  type SpecialistStats,
  type CustomerStats,
  type HourlyDistribution,
  type DailyDistribution,
} from '@/lib/actions/reports'

export interface ReportDateRange {
  startDate: Date
  endDate: Date
}

export default class ReportsService {
  private formatParams(businessId: string, range: ReportDateRange): DateRangeParams {
    return {
      business_id: businessId,
      start_date: range.startDate.toISOString(),
      end_date: range.endDate.toISOString(),
    }
  }

  async getRevenueStats(
    businessId: string,
    range: ReportDateRange
  ): Promise<RevenueData> {
    return fetchRevenueStatsAction(this.formatParams(businessId, range))
  }

  async getRevenueTrend(
    businessId: string,
    range: ReportDateRange
  ): Promise<RevenueTrendItem[]> {
    return fetchRevenueTrendAction(this.formatParams(businessId, range))
  }

  async getTopServices(
    businessId: string,
    range: ReportDateRange,
    limit = 10
  ): Promise<ServiceStats[]> {
    return fetchTopServicesAction(this.formatParams(businessId, range), limit)
  }

  async getSpecialistStats(
    businessId: string,
    range: ReportDateRange
  ): Promise<SpecialistStats[]> {
    return fetchSpecialistStatsAction(this.formatParams(businessId, range))
  }

  async getCustomerStats(
    businessId: string,
    range: ReportDateRange
  ): Promise<CustomerStats> {
    return fetchCustomerStatsAction(this.formatParams(businessId, range))
  }

  async getHourlyDistribution(
    businessId: string,
    range: ReportDateRange
  ): Promise<HourlyDistribution[]> {
    return fetchHourlyDistributionAction(this.formatParams(businessId, range))
  }

  async getDailyDistribution(
    businessId: string,
    range: ReportDateRange
  ): Promise<DailyDistribution[]> {
    return fetchDailyDistributionAction(this.formatParams(businessId, range))
  }

  async getRevenueByService(
    businessId: string,
    range: ReportDateRange
  ): Promise<{ name: string; value: number }[]> {
    return fetchRevenueByServiceAction(this.formatParams(businessId, range))
  }

  async getRevenueBySpecialist(
    businessId: string,
    range: ReportDateRange
  ): Promise<{ name: string; value: number }[]> {
    return fetchRevenueBySpecialistAction(this.formatParams(businessId, range))
  }
}
