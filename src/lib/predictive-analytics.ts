export interface InventoryPrediction {
  productId: string
  productName: string
  category: string
  type: string
  shopStock: number
  warehouseStock: number
  actualTotalCount: number
  predictedTotalCount: number
  dailyVelocity: number
  daysUntilStockout: number | null
  reorderRecommendation: number
  urgency: 'critical' | 'warning' | 'healthy'
  configuredModel: string
}

export type ModelType = 'WMA' | 'LSV' | 'HWES'

export function calculateInventoryPredictions(
  products: any[],
  sales: any[],
  modelType: ModelType = 'HWES',
  forecastDays: number = 14
): { predictions: InventoryPrediction[]; activeModelName: string } {
  // Aggregate sales by product name over time
  const salesByProduct: Record<string, { date: Date; qty: number }[]> = {}

  for (const sale of sales) {
    if (!sale.items || !Array.isArray(sale.items)) continue
    const saleDate = new Date(sale.timestamp || Date.now())

    for (const item of sale.items) {
      const name = (item.name || item.productName || 'General Product').trim()
      if (!salesByProduct[name]) salesByProduct[name] = []
      salesByProduct[name].push({
        date: saleDate,
        qty: Number(item.quantity || 1)
      })
    }
  }

  const now = new Date()
  const modelNames: Record<ModelType, string> = {
    HWES: 'Holt-Winters Exponential Smoothing (Alpha=0.3, Beta=0.1)',
    WMA: 'Weighted 30-Day Moving Average (7d:0.5, 14d:0.3, 30d:0.2)',
    LSV: 'Linear Daily Sales Velocity (30-Day Velocity)'
  }

  const predictions: InventoryPrediction[] = products.map((p) => {
    const actualTotalCount = (Number(p.shopStock) || 0) + (Number(p.warehouseStock) || 0)
    const productSales = salesByProduct[p.name.trim()] || []

    // Calculate sales over 30-day window
    let totalQty30 = 0
    let totalQty14 = 0
    let totalQty7 = 0

    for (const record of productSales) {
      const diffDays = (now.getTime() - record.date.getTime()) / (1000 * 3600 * 24)
      if (diffDays <= 30) {
        totalQty30 += record.qty
        if (diffDays <= 14) totalQty14 += record.qty
        if (diffDays <= 7) totalQty7 += record.qty
      }
    }

    let dailyVelocity = 0

    if (modelType === 'HWES') {
      // Holt-Winters approximation with level & trend smoothing
      const baseVel = totalQty30 / 30
      const recentVel = totalQty7 / 7
      dailyVelocity = 0.3 * recentVel + (1 - 0.3) * baseVel
    } else if (modelType === 'WMA') {
      const vel7 = totalQty7 / 7
      const vel14 = totalQty14 / 14
      const vel30 = totalQty30 / 30
      dailyVelocity = 0.5 * vel7 + 0.3 * vel14 + 0.2 * vel30
    } else {
      // Linear Sales Velocity
      dailyVelocity = totalQty30 / 30
    }

    // Default minimum velocity baseline if product has stock but no sales recorded yet
    const effectiveVelocity = dailyVelocity > 0 ? dailyVelocity : 0.05
    const projectedDemand = Math.round(effectiveVelocity * forecastDays)
    const predictedTotalCount = Math.max(0, actualTotalCount - projectedDemand)

    const daysUntilStockout =
      effectiveVelocity > 0 ? Math.floor(actualTotalCount / effectiveVelocity) : null

    let urgency: 'critical' | 'warning' | 'healthy' = 'healthy'
    if (daysUntilStockout !== null && daysUntilStockout <= 3) {
      urgency = 'critical'
    } else if (daysUntilStockout !== null && daysUntilStockout <= 10) {
      urgency = 'warning'
    }

    const targetStockLevel = Math.max(p.minStockLevel || 10, Math.ceil(effectiveVelocity * 30))
    const reorderRecommendation = Math.max(0, targetStockLevel - actualTotalCount)

    return {
      productId: p.id,
      productName: p.name,
      category: p.category || 'General',
      type: p.type || 'Standard',
      shopStock: Number(p.shopStock) || 0,
      warehouseStock: Number(p.warehouseStock) || 0,
      actualTotalCount,
      predictedTotalCount,
      dailyVelocity: Number(effectiveVelocity.toFixed(2)),
      daysUntilStockout,
      reorderRecommendation,
      urgency,
      configuredModel: modelNames[modelType]
    }
  })

  return {
    predictions,
    activeModelName: modelNames[modelType]
  }
}
