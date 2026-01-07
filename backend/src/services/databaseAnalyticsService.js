// API-ONLY MODE: Database analytics disabled
// This service previously queried the database for analytics
// Now returns empty/mock data to prevent database dependency

class DatabaseAnalyticsService {
  
  // Get setter performance (returns empty data - use Twilio API instead)
  async getSetterPerformance(days = 7) {
    console.log(`[DB Analytics] Database mode disabled - returning empty data`);
    console.log(`[DB Analytics] Use Twilio API analytics instead (/api/analytics/setter-performance)`);
    
    return {
      period: `${days} days`,
      setters: [],
      summary: {
        totalSetters: 0,
        totalCalls: 0,
        avgCallsPerSetter: 0
      },
      note: 'Database analytics disabled. Use Twilio API analytics instead.',
      source: 'api-only-mode'
    };
  }
  
  // Get sales analytics (returns empty data)
  async getSalesAnalytics(days = 30) {
    console.log(`[DB Analytics] Database mode disabled - returning empty sales data`);
    
    return {
      period: `${days} days`,
      totalSales: 0,
      totalRevenue: 0,
      avgDealSize: 0,
      salesByCloser: [],
      note: 'Database analytics disabled. Use API-based analytics instead.',
      source: 'api-only-mode'
    };
  }
  
  // Get call logs (returns empty data)
  async getCallLogs(filters = {}) {
    console.log(`[DB Analytics] Database mode disabled - returning empty call logs`);
    
    return {
      calls: [],
      total: 0,
      note: 'Database analytics disabled. Use Twilio API for call logs.',
      source: 'api-only-mode'
    };
  }
  
  // Sync calls to database (no-op)
  async syncCallsToDatabase(calls) {
    console.log(`[DB Analytics] Database sync disabled - skipping ${calls?.length || 0} calls`);
    return {
      success: true,
      synced: 0,
      note: 'Database sync disabled in API-only mode'
    };
  }
  
  // Sync bookings to database (no-op)
  async syncBookingsToDatabase(bookings) {
    console.log(`[DB Analytics] Database sync disabled - skipping ${bookings?.length || 0} bookings`);
    return {
      success: true,
      synced: 0,
      note: 'Database sync disabled in API-only mode'
    };
  }
}

const databaseAnalyticsService = new DatabaseAnalyticsService();
export default databaseAnalyticsService;