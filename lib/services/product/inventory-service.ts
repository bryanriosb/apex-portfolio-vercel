import {
  fetchInventoryMovementsAction,
  createInventoryMovementAction,
  createBulkConsumptionAction,
  fetchLowStockProductsAction,
  adjustStockAction,
  getInventoryStatsAction,
  type InventoryMovementListResponse,
} from '@/lib/actions/inventory'
import type {
  InventoryMovement,
  InventoryMovementInsert,
} from '@/lib/models/product'
import type { InventoryMovementType } from '@/lib/types/enums'

export class InventoryService {
  async fetchMovements(params?: {
    page?: number
    page_size?: number
    business_id?: string
    product_id?: string
    movement_type?: InventoryMovementType
    start_date?: string
    end_date?: string
  }): Promise<InventoryMovementListResponse> {
    return fetchInventoryMovementsAction(params)
  }

  async createMovement(
    data: InventoryMovementInsert
  ): Promise<{ success: boolean; data?: InventoryMovement; error?: string }> {
    return createInventoryMovementAction(data)
  }

  async registerEntry(
    productId: string,
    businessId: string,
    quantity: number,
    unitCostCents?: number,
    notes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createInventoryMovementAction({
      product_id: productId,
      business_id: businessId,
      movement_type: 'ENTRY',
      quantity,
      unit_cost_cents: unitCostCents,
      notes: notes || 'Entrada de inventario',
      created_by: createdBy,
    })
  }

  async registerConsumption(
    productId: string,
    businessId: string,
    quantity: number,
    appointmentId?: string,
    notes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createInventoryMovementAction({
      product_id: productId,
      business_id: businessId,
      movement_type: 'CONSUMPTION',
      quantity,
      appointment_id: appointmentId,
      notes: notes || 'Consumo de insumo',
      created_by: createdBy,
    })
  }

  async registerSale(
    productId: string,
    businessId: string,
    quantity: number,
    saleId?: string,
    appointmentId?: string,
    notes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createInventoryMovementAction({
      product_id: productId,
      business_id: businessId,
      movement_type: 'SALE',
      quantity,
      sale_id: saleId,
      appointment_id: appointmentId,
      notes: notes || 'Venta de producto',
      created_by: createdBy,
    })
  }

  async registerWaste(
    productId: string,
    businessId: string,
    quantity: number,
    notes: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createInventoryMovementAction({
      product_id: productId,
      business_id: businessId,
      movement_type: 'WASTE',
      quantity,
      notes,
      created_by: createdBy,
    })
  }

  async adjustStock(
    productId: string,
    businessId: string,
    newStock: number,
    notes: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return adjustStockAction(productId, businessId, newStock, notes, createdBy)
  }

  async registerTransfer(
    productId: string,
    fromBusinessId: string,
    toBusinessId: string,
    quantity: number,
    notes?: string,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    // Register outgoing movement from source business
    const outResult = await createInventoryMovementAction({
      product_id: productId,
      business_id: fromBusinessId,
      movement_type: 'TRANSFER',
      quantity,
      transfer_to_business_id: toBusinessId,
      notes: notes || `Transferencia a otra sucursal`,
      created_by: createdBy,
    })

    if (!outResult.success) {
      return outResult
    }

    // Register incoming movement to destination business
    const inResult = await createInventoryMovementAction({
      product_id: productId,
      business_id: toBusinessId,
      movement_type: 'ENTRY',
      quantity,
      notes: `Recepción por transferencia`,
      created_by: createdBy,
    })

    return inResult
  }

  async consumeAppointmentSupplies(
    appointmentId: string,
    businessId: string,
    supplies: Array<{
      product_id: string
      quantity: number
      unit_price_cents: number
    }>,
    createdBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    return createBulkConsumptionAction(
      appointmentId,
      businessId,
      supplies,
      createdBy
    )
  }

  async getLowStockProducts(
    businessId: string
  ): Promise<{ data: any[]; count: number }> {
    return fetchLowStockProductsAction(businessId)
  }

  async getStats(
    businessId: string
  ): Promise<{ activeProducts: number; movementsThisMonth: number }> {
    return getInventoryStatsAction(businessId)
  }
}

export const inventoryService = new InventoryService()
