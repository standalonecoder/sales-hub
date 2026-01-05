import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class SalesAnalyticsService {
  
  // Get sales overview for dashboard
  async getSalesOverview(days = 30) {
    try {
      console.log(`[Sales Analytics] Getting sales overview for last ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get all sales from the period
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startDate
          },
          status: {
            not: 'refunded' // Exclude refunded sales
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`[Sales Analytics] Found ${sales.length} sales`);
      
      // Calculate metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'paid');
      const completedRevenue = completedSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const averageSaleValue = completedSales.length > 0 
        ? completedRevenue / completedSales.length 
        : 0;
      
      // Get unique closers who made sales
      const uniqueClosers = new Set();
      sales.forEach(sale => {
        if (sale.closer) uniqueClosers.add(sale.closer);
        if (sale.closerId) uniqueClosers.add(sale.closerId);
      });
      
      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= today;
      });
      const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      
      // Calculate this month's revenue
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= monthStart;
      });
      const monthRevenue = monthSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      
      // Revenue by day (last 7 days for trend)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const daySales = sales.filter(s => {
          const saleDate = new Date(s.createdAt);
          return saleDate >= date && saleDate < nextDate;
        });
        
        const dayRevenue = daySales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
        
        last7Days.push({
          date: date.toISOString().split('T')[0],
          revenue: dayRevenue,
          count: daySales.length
        });
      }
      
      return {
        period: `${days} days`,
        summary: {
          totalSales: sales.length,
          completedSales: completedSales.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          completedRevenue: Math.round(completedRevenue * 100) / 100,
          averageSaleValue: Math.round(averageSaleValue * 100) / 100,
          activeClosers: uniqueClosers.size,
          todayRevenue: Math.round(todayRevenue * 100) / 100,
          todaySales: todaySales.length,
          monthRevenue: Math.round(monthRevenue * 100) / 100,
          monthSales: monthSales.length
        },
        trend: last7Days
      };
      
    } catch (error) {
      console.error('[Sales Analytics] Error:', error);
      // Return empty data instead of throwing to prevent dashboard from breaking
      return {
        period: `${days} days`,
        summary: {
          totalSales: 0,
          completedSales: 0,
          totalRevenue: 0,
          completedRevenue: 0,
          averageSaleValue: 0,
          activeClosers: 0,
          todayRevenue: 0,
          todaySales: 0,
          monthRevenue: 0,
          monthSales: 0
        },
        trend: [],
        error: error.message
      };
    }
  }
  
  // Get top closers by revenue
  async getTopClosers(days = 30, limit = 10) {
    try {
      console.log(`[Sales Analytics] Getting top closers for last ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startDate
          },
          status: {
            not: 'refunded'
          }
        }
      });
      
      // Group by closer
      const closerStats = {};
      
      sales.forEach(sale => {
        const closer = sale.closer || sale.closerId || 'Unknown';
        
        if (!closerStats[closer]) {
          closerStats[closer] = {
            closer: closer,
            totalSales: 0,
            revenue: 0,
            averageSaleValue: 0
          };
        }
        
        closerStats[closer].totalSales++;
        closerStats[closer].revenue += (sale.amount || 0);
      });
      
      // Calculate averages and sort
      const topClosers = Object.values(closerStats)
        .map(stats => ({
          ...stats,
          revenue: Math.round(stats.revenue * 100) / 100,
          averageSaleValue: Math.round((stats.revenue / stats.totalSales) * 100) / 100
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
      
      return topClosers;
      
    } catch (error) {
      console.error('[Sales Analytics] Error getting top closers:', error);
      return [];
    }
  }
}

export default new SalesAnalyticsService();