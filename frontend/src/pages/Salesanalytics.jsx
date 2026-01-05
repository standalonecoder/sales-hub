import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { salesApi } from '../services/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Loader2,
  Calendar,
  Award
} from 'lucide-react';

export default function SalesAnalytics() {
  const [period, setPeriod] = useState(30);

  // Fetch sales overview
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-overview', period],
    queryFn: async () => {
      const response = await salesApi.getOverview(period);
      return response.data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch top closers
  const { data: topClosersData, isLoading: closersLoading } = useQuery({
    queryKey: ['top-closers', period],
    queryFn: async () => {
      const response = await salesApi.getTopClosers(period, 10);
      return response.data;
    },
    refetchInterval: 60000
  });

  const summary = salesData?.data?.summary || {};
  const topClosers = topClosersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales & Revenue Analytics</h1>
        <p className="text-gray-600 mt-2">Track sales performance and revenue metrics</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === days
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
            }`}
          >
            Last {days} Days
          </button>
        ))}
      </div>

      {salesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Monthly Revenue */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                Monthly Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(summary.monthRevenue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {summary.monthSales || 0} sales this month
              </p>
            </motion.div>

            {/* Today's Revenue */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border-2 border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Today's Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(summary.todayRevenue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {summary.todaySales || 0} sales today
              </p>
            </motion.div>

            {/* Average Sale Value */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border-2 border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Average Sale
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                ${(summary.averageSaleValue || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {summary.completedSales || 0} completed sales
              </p>
            </motion.div>

            {/* Active Closers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border-2 border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Active Closers
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {summary.activeClosers || 0}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {summary.totalSales || 0} total sales
              </p>
            </motion.div>
          </div>

          {/* Top Closers Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <Award className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">Top Performers</h2>
              </div>
            </div>

            {closersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : topClosers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No sales data available for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Closer
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Avg Sale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {topClosers.map((closer, index) => (
                      <tr
                        key={closer.closer}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{closer.closer}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-green-700">
                            ${closer.revenue.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-semibold text-gray-900">
                            {closer.totalSales}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-gray-700">
                            ${closer.averageSaleValue.toLocaleString()}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}