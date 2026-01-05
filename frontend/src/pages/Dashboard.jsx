import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { numbersApi, ghlApi, closersApi, salesApi } from '../services/api';
import { 
  UserPlus, 
  ShoppingCart, 
  Users, 
  AlertCircle,
  CheckCircle2,
  Phone,
  ArrowRight,
  Briefcase,
  Activity,
  Bell,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Fetch all data
  const { data: numbersData } = useQuery({
    queryKey: ['numbers'],
    queryFn: async () => {
      const response = await numbersApi.getAllNumbers();
      return response.data;
    },
    refetchInterval: 10000
  });

  const { data: ghlUsersData } = useQuery({
    queryKey: ['ghl-users-dashboard'],
    queryFn: async () => {
      const response = await ghlApi.getUsers();
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: closersData } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const response = await closersApi.getClosers();
      return response.data;
    },
    refetchInterval: 30000
  });

  const { data: numbersWithGHLData } = useQuery({
    queryKey: ['numbers-ghl-status'],
    queryFn: async () => {
      const response = await numbersApi.getNumbersWithGHLStatus();
      return response.data;
    },
    refetchInterval: 60000
  });

  // Extract data
  const allNumbers = numbersData?.numbers || [];
  const ghlUsers = ghlUsersData?.users || [];
  const closers = closersData?.closers || [];
  const numbersWithGHL = numbersWithGHLData?.numbers || [];

  // Calculate stats
  const closersWithNumbers = closers.filter(c => c.assignedPhoneNumber).length;
  const setters = ghlUsers.filter(u => !u.email?.includes('@tjr-trades.com'));
  const settersWith510 = allNumbers.filter(n => n.phoneNumber?.includes('510')).length;
  const numbersNotInGHL = numbersWithGHL.filter(n => !n.inGHL).length;

  // Recent activity (last 24 hours)
  const recentPurchases = allNumbers
    .filter(num => {
      const purchaseDate = new Date(num.dateCreated);
      const now = new Date();
      const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
      return hoursDiff <= 24;
    })
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
    .slice(0, 5);

  // Detect pending tasks
  const pendingTasks = [];
  
  // Task: Numbers not in GHL
  if (numbersNotInGHL > 0) {
    pendingTasks.push({
      id: 'ghl-sync',
      title: `${numbersNotInGHL} number${numbersNotInGHL > 1 ? 's' : ''} need to be added to GHL`,
      type: 'warning',
      action: 'View Numbers',
      link: '/numbers'
    });
  }

  // Task: Closers without 650 numbers
  const closersWithout650 = closers.length - closersWithNumbers;
  if (closersWithout650 > 0) {
    pendingTasks.push({
      id: 'closers-no-number',
      title: `${closersWithout650} closer${closersWithout650 > 1 ? 's' : ''} without 650 number`,
      type: 'info',
      action: 'Assign Numbers',
      link: '/closers'
    });
  }

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return 'Today';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor your sales operations activity</p>
      </div>

      {/* Quick Actions - 3 CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Onboard Closer Card */}
          <Link
            to="/closers"
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 hover:border-gray-900 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-8 right-8">
              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <UserPlus className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Onboard Closer</h3>
            <p className="text-gray-600">Add new closer to your team</p>
          </Link>

          {/* Assign Numbers Card */}
          <Link
            to="/bulk-purchase"
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 hover:border-gray-900 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-8 right-8">
              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assign Numbers</h3>
            <p className="text-gray-600">Assign numbers to setters</p>
          </Link>

          {/* Calls Analytics Card - LINK TO NEW PAGE */}
          <Link
            to="/calls-analytics"
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 hover:border-gray-900 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-8 right-8">
              <ArrowRight className="h-6 w-6 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gray-900 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Calls Analytics</h3>
            <p className="text-gray-600">View today's scheduled calls & capacity</p>
          </Link>

          {/* Sales & Revenue Card - LINK TO SALES PAGE */}
          <Link
            to="/sales"
            className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-10 hover:border-green-600 hover:shadow-xl transition-all duration-300"
          >
            <div className="absolute top-8 right-8">
              <ArrowRight className="h-6 w-6 text-green-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-lg">
              <DollarSign className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sales & Revenue</h3>
            <p className="text-gray-600">View sales analytics & revenue reports</p>
          </Link>

          {/* Activity Monitor Card - ACCORDION */}
          <div className="md:col-span-2">
            <div
              onClick={() => setActivityExpanded(!activityExpanded)}
              className="group relative bg-white rounded-2xl border-2 border-gray-200 p-10 hover:border-gray-900 hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <div className="absolute top-8 right-8">
                {activityExpanded ? (
                  <ChevronUp className="h-6 w-6 text-gray-900" />
                ) : (
                  <ChevronDown className="h-6 w-6 text-gray-400 group-hover:text-gray-900 transition-all" />
                )}
              </div>
              <div className="flex items-start gap-6">
                <div className="h-16 w-16 rounded-2xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">Activity Monitor</h3>
                    <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                      3 alerts
                    </span>
                  </div>
                  <p className="text-gray-600">Track system changes & critical alerts</p>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {activityExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-8 pt-8 border-t border-gray-200"
                  >
                    <div className="space-y-3">
                      {/* Alert 1: Numbers not in GHL */}
                      {numbersNotInGHL > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-900">
                              {numbersNotInGHL} Twilio number{numbersNotInGHL > 1 ? 's' : ''} not synced to GHL
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              These numbers need to be added to your GHL phone numbers
                            </p>
                          </div>
                          <Link
                            to="/numbers"
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1"
                          >
                            Fix Now
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}

                      {/* Alert 2: Recent purchases */}
                      {recentPurchases.length > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900">
                              {recentPurchases.length} number{recentPurchases.length > 1 ? 's' : ''} purchased in the last 24h
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Latest: {recentPurchases[0]?.phoneNumber} ({formatTimeAgo(recentPurchases[0]?.dateCreated)})
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Alert 3: Closers without numbers */}
                      {closersWithout650 > 0 && (
                        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <Info className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {closersWithout650} closer{closersWithout650 > 1 ? 's' : ''} without 650 number
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Assign phone numbers to complete their setup
                            </p>
                          </div>
                          <Link
                            to="/closers"
                            className="text-xs font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
                          >
                            View
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pending Tasks ({pendingTasks.length})</h2>
          </div>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-200"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <p className="text-gray-900 font-medium">{task.title}</p>
                </div>
                <Link
                  to={task.link}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  {task.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No Pending Tasks */}
      {pendingTasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-green-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-gray-900">All Caught Up!</p>
              <p className="text-sm text-gray-600">No pending tasks at the moment</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Team Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Closers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-gray-600" />
                <p className="font-medium text-gray-900">Closers</p>
              </div>
              <Link to="/closers" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                View All
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{closers.length}</p>
                <p className="text-sm text-gray-600">Active closers</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{closersWithNumbers}</p>
                <p className="text-sm text-gray-600">With 650 numbers</p>
              </div>
            </div>
          </div>

          {/* Setters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-600" />
                <p className="font-medium text-gray-900">Setters</p>
              </div>
              <Link to="/setters" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                View Performance
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{setters.length}</p>
                <p className="text-sm text-gray-600">Active setters</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{settersWith510}</p>
                <p className="text-sm text-gray-600">With 510 numbers</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity - CHANGED TO TEAM ACTIONS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Team Activity</h2>
            </div>
            <p className="text-sm text-gray-600">Last 24 hours</p>
          </div>
        </div>

        <div className="p-6">
          {closers.length > 0 ? (
            <div className="space-y-3">
              {/* Show recently added closers */}
              {closers.slice(0, 5).map((closer, index) => {
                const hasNumber = closer.assignedPhoneNumber;
                
                return (
                  <motion.div
                    key={closer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold">
                        {closer.firstName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">
                            {closer.firstName} {closer.lastName}
                          </p>
                          {hasNumber ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                              Setup Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{closer.email}</p>
                      </div>
                    </div>
                    <Link
                      to="/closers"
                      className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No team members yet</p>
              <p className="text-sm text-gray-500 mt-1">Start by onboarding your first closer</p>
            </div>
          )}

          {closers.length > 5 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link
                to="/closers"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>View All Team Members</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}