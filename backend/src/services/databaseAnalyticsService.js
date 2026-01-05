import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class DatabaseAnalyticsService {
  
  // Get setter performance from database (FAST!)
  async getSetterPerformance(days = 7) {
    try {
      console.log(`[DB Analytics] Getting setter performance for last ${days} days`);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Query setter_calls table directly
      const calls = await prisma.setterCall.findMany({
        where: {
          startTime: {
            gte: startDate
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      });
      
      console.log(`[DB Analytics] Found ${calls.length} calls from database`);
      
      // Query booked_calls for conversions
      const bookedCalls = await prisma.bookedCall.findMany({
        where: {
          eventStartTime: {
            gte: startDate
          }
        }
      });
      
      console.log(`[DB Analytics] Found ${bookedCalls.length} booked calls`);
      
      // Group by setter
      const setterStats = {};
      
      calls.forEach(call => {
        const setter = call.setter || call.setterId || 'Unknown';
        
        if (!setterStats[setter]) {
          setterStats[setter] = {
            setter: setter,
            totalCalls: 0,
            completedCalls: 0,
            bookings: 0,
            totalDuration: 0,
            callsByDay: {}
          };
        }
        
        setterStats[setter].totalCalls++;
        
        if (call.status === 'completed' && call.duration > 0) {
          setterStats[setter].completedCalls++;
          setterStats[setter].totalDuration += call.duration;
        }
        
        // Track by day (EST timezone)
        if (call.startTime) {
          const callDateUTC = new Date(call.startTime);
          const callDateEST = new Date(callDateUTC.getTime() - (5 * 60 * 60 * 1000));
          const callDate = callDateEST.toISOString().split('T')[0];
          setterStats[setter].callsByDay[callDate] = (setterStats[setter].callsByDay[callDate] || 0) + 1;
        }
      });
      
      // Add booking counts
      bookedCalls.forEach(booking => {
        const setter = booking.setter || booking.setterId;
        if (setter && setterStats[setter]) {
          setterStats[setter].bookings++;
        }
      });
      
      // Calculate metrics
      const setterPerformance = Object.values(setterStats).map(stats => {
        const answerRate = stats.totalCalls > 0 
          ? Math.round((stats.completedCalls / stats.totalCalls) * 100) 
          : 0;
          
        const avgDuration = stats.completedCalls > 0
          ? Math.round(stats.totalDuration / stats.completedCalls)
          : 0;
          
        const conversionRate = stats.completedCalls > 0
          ? Math.round((stats.bookings / stats.completedCalls) * 100)
          : 0;
        
        return {
          setter: stats.setter,
          totalCalls: stats.totalCalls,
          completedCalls: stats.completedCalls,
          bookings: stats.bookings,
          answerRate: answerRate,
          avgDuration: avgDuration,
          conversionRate: conversionRate,
          callsByDay: stats.callsByDay
        };
      });
      
      // Sort by total calls
      setterPerformance.sort((a, b) => b.totalCalls - a.totalCalls);
      
      const totalCalls = setterPerformance.reduce((sum, s) => sum + s.totalCalls, 0);
      
      console.log(`[DB Analytics] ✅ Processed ${setterPerformance.length} setters`);
      
      return {
        period: `${days} days`,
        setters: setterPerformance,
        summary: {
          totalSetters: setterPerformance.length,
          totalCalls: totalCalls,
          avgCallsPerSetter: setterPerformance.length > 0 
            ? Math.round(totalCalls / setterPerformance.length) 
            : 0
        }
      };
      
    } catch (error) {
      console.error('[DB Analytics] Error:', error);
      throw new Error(`Failed to get setter performance from database: ${error.message}`);
    }
  }
  
  // Get all calls with filters (for call management page)
  async getCallLogs(options = {}) {
    try {
      const {
        phoneNumber = null,
        startDate = null,
        endDate = null,
        limit = 1000,
        status = null,
        setter = null
      } = options;
      
      console.log('[DB Analytics] Fetching call logs from database', options);
      
      const where = {};
      
      if (phoneNumber) {
        where.from = phoneNumber;
      }
      
      if (startDate) {
        where.startTime = { gte: new Date(startDate) };
      }
      
      if (endDate) {
        if (where.startTime) {
          where.startTime.lte = new Date(endDate);
        } else {
          where.startTime = { lte: new Date(endDate) };
        }
      }
      
      if (status) {
        where.status = status;
      }
      
      if (setter) {
        where.OR = [
          { setter: setter },
          { setterId: setter }
        ];
      }
      
      const calls = await prisma.setterCall.findMany({
        where,
        take: limit,
        orderBy: {
          startTime: 'desc'
        }
      });
      
      console.log(`[DB Analytics] Found ${calls.length} calls`);
      
      return calls.map(call => ({
        sid: call.callSid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration || 0,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        answeredBy: call.answeredBy,
        price: call.price,
        priceUnit: call.priceUnit,
        phoneNumberSid: call.phoneNumberSid,
        setter: call.setter || call.setterId
      }));
      
    } catch (error) {
      console.error('[DB Analytics] Error fetching call logs:', error);
      throw new Error(`Failed to fetch call logs: ${error.message}`);
    }
  }
  
  // Get overview stats
  async getOverview(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const calls = await prisma.setterCall.findMany({
        where: {
          startTime: {
            gte: startDate
          }
        }
      });
      
      const totalCalls = calls.length;
      const completedCalls = calls.filter(c => c.status === 'completed').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const avgDuration = completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0;
      
      // Get unique setters
      const uniqueSetters = new Set();
      calls.forEach(call => {
        if (call.setter) uniqueSetters.add(call.setter);
        if (call.setterId) uniqueSetters.add(call.setterId);
      });
      
      return {
        period: `${days} days`,
        summary: {
          totalCalls,
          completedCalls,
          avgDuration,
          activeSetters: uniqueSetters.size,
          answerRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0
        }
      };
      
    } catch (error) {
      console.error('[DB Analytics] Error getting overview:', error);
      throw error;
    }
  }
}

export default new DatabaseAnalyticsService();