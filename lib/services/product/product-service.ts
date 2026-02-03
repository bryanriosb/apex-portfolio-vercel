import {
  fetchProductsAction,
  getProductByIdAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  deleteProductsAction,
  fetchLowStockProductsAction,
} from '@/lib/actions/product'
import {
  fetchProductCategoriesAction,
  fetchUnitOfMeasuresAction,
} from '@/lib/actions/product-category'
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  ProductWithDetails,
  ProductListResponse,
  ProductCategory,
  UnitOfMeasure,
} from '@/lib/models/product'

export default class ProductService {
  async fetchItems(params?: {
    page?: number
    page_size?: number
    business_id?: string
    category_id?: string
    type?: 'SUPPLY' | 'RETAIL'
    is_active?: boolean
    low_stock_only?: boolean
  }): Promise<ProductListResponse> {
    try {
      return await fetchProductsAction(params)
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  }

  async getById(id: string): Promise<ProductWithDetails | null> {
    try {
      return await getProductByIdAction(id)
    } catch (error) {
      console.error('Error fetching product by ID:', error)
      throw error
    }
  }

  async createItem(
    data: ProductInsert
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      return await createProductAction(data)
    } catch (error: any) {
      console.error('Error creating product:', error)
      throw error
    }
  }

  async updateItem(
    data: Product | Partial<Product>,
    partial = true
  ): Promise<{ success: boolean; data?: Product; error?: string }> {
    try {
      if (!data.id) {
        throw new Error('Product ID is required for update')
      }
      return await updateProductAction(data.id, data)
    } catch (error: any) {
      console.error('Error updating product:', error)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      const result = await deleteProductAction(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete product')
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      throw new Error(`Failed to destroy product: ${error}`)
    }
  }

  async destroyMany(
    ids: string[]
  ): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      return await deleteProductsAction(ids)
    } catch (error: any) {
      console.error('Error batch deleting products:', error)
      return { success: false, deletedCount: 0, error: error.message }
    }
  }

  async fetchCategories(): Promise<ProductCategory[]> {
    try {
      return await fetchProductCategoriesAction()
    } catch (error) {
      console.error('Error fetching product categories:', error)
      throw error
    }
  }

  async fetchUnitOfMeasures(): Promise<UnitOfMeasure[]> {
    try {
      return await fetchUnitOfMeasuresAction()
    } catch (error) {
      console.error('Error fetching unit of measures:', error)
      throw error
    }
  }

  async fetchLowStock(businessId: string): Promise<ProductWithDetails[]> {
    try {
      return await fetchLowStockProductsAction(businessId)
    } catch (error) {
      console.error('Error fetching low stock products:', error)
      throw error
    }
  }
}
