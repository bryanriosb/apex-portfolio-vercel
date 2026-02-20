export interface APIService {
  API_PATH: string
  fetchItems(params?: any): Promise<any>
  createItem(data: any, config?: any): Promise<any>
  updateItem(data: any, partial: boolean): Promise<any>
  destroyItem(id: string): Promise<void>
}
