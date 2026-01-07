// API-ONLY MODE: Sales analytics disabled
// This service previously queried the database for sales data
// Now returns empty/mock data to prevent database dependency

class SalesAnalyticsService {
  
  // Get sales overview (returns empty data)
  async getSalesOverview(days = 30) {
    console.log(`[Sales Analytics] Database mode disabled - returning empty overview`);
    console.log(`[Sales Analytics] Integrate with your CRM/payment platform API for real data`);
    
    return {
      period: `${days} days`,
      totalRevenue: 0,
      totalSales: 0,
      completedSales: 0,
      pendingSales: 0,
      averageSaleValue: 0,
      todayRevenue: 0,
      yesterdayRevenue: 0,
      topClosers: [],
      recentSales: [],
      note: 'Database analytics disabled. Integrate with payment platform API.',
      source: 'api-only-mode'
    };
  }
  
  // Get sales by closer (returns empty data)
  async getSalesByCloser(days = 30) {
    console.log(`[Sales Analytics] Database mode disabled - returning empty closer data`);
    
    return {
      period: `${days} days`,
      closers: [],
      summary: {
        totalClosers: 0,
        totalRevenue: 0,
        totalSales: 0
      },
      note: 'Database analytics disabled.',
      source: 'api-only-mode'
    };
  }
  
  // Get sales trends (returns empty data)
  async getSalesTrends(days = 30) {
    console.log(`[Sales Analytics] Database mode disabled - returning empty trends`);
    
    return {
      period: `${days} days`,
      dailyRevenue: [],
      dailySales: [],
      note: 'Database analytics disabled.',
      source: 'api-only-mode'
    };
  }
  
  // Get recent sales (returns empty data)
  async getRecentSales(limit = 20) {
    console.log(`[Sales Analytics] Database mode disabled - returning empty sales`);
    
    return {
      sales: [],
      total: 0,
      note: 'Database analytics disabled.',
      source: 'api-only-mode'
    };
  }
  
  // Get sales by product (returns empty data)
  async getSalesByProduct(days = 30) {
    console.log(`[Sales Analytics] Database mode disabled - returning empty product data`);
    
    return {
      period: `${days} days`,
      products: [],
      totalRevenue: 0,
      note: 'Database analytics disabled.',
      source: 'api-only-mode'
    };
  }
  
  // Sync sales to database (no-op)
  async syncSalesToDatabase(sales) {
    console.log(`[Sales Analytics] Database sync disabled - skipping ${sales?.length || 0} sales`);
    return {
      success: true,
      synced: 0,
      note: 'Database sync disabled in API-only mode'
    };
  }
}

const salesAnalyticsService = new SalesAnalyticsService();
export default salesAnalyticsService;