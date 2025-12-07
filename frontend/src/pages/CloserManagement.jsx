import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { closersApi } from '../services/api';
import { 
  UserPlus, 
  UserMinus, 
  Phone, 
  Mail, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase
} from 'lucide-react';

export default function CloserManagement() {
  const queryClient = useQueryClient();
  const [showOnboardForm, setShowOnboardForm] = useState(false);
  const [showOffboardModal, setShowOffboardModal] = useState(false);
  const [selectedCloser, setSelectedCloser] = useState(null);
  const [platformIds, setPlatformIds] = useState({ zoom: null, calendly: null, ghl: null, googleWorkspace: null });
  const [loadingStages, setLoadingStages] = useState({
    twilio: false,
    googleWorkspace: false,
    calendly: false,
    zoom: false,
    ghl: false
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState({
    googleWorkspace: true,
    calendly: true,
    zoom: true,
    twilio: true,
    ghl: true
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  // Fetch all closers (phone numbers already included from backend)
  const { data: closersData, isLoading } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const response = await closersApi.getClosers();
      return response.data;
    },
    refetchInterval: 10000
  });

  const closers = closersData?.closers || [];
  const closersWithNumbers = closers.filter(c => c.assignedPhoneNumber);

  // Onboard mutation
  const onboardMutation = useMutation({
    mutationFn: (data) => closersApi.onboardCloser(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['closers']);
      setShowOnboardForm(false);
      setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '' });
    }
  });

  // Offboard mutation
  const offboardMutation = useMutation({
    mutationFn: ({ closerId, platforms }) => closersApi.offboardCloser(closerId, platforms),
    onSuccess: () => {
      queryClient.invalidateQueries(['closers']);
      setShowOffboardModal(false);
      setSelectedCloser(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const handleOffboard = (closer) => {
    setSelectedCloser(closer);
    setSelectedPlatforms({
      googleWorkspace: true,
      calendly: true,
      zoom: true,
      twilio: true,
      ghl: true
    });
    
    // Reset states
    setPlatformIds({ zoom: null, calendly: null, ghl: null, googleWorkspace: null });
    setLoadingStages({
      twilio: false,
      googleWorkspace: false,
      calendly: false,
      zoom: false,
      ghl: false
    });
    
    setShowOffboardModal(true);
    
    // Sequential loading animation
    const loadSequentially = async () => {
      // Stage 1: Twilio (1.5s)
      setLoadingStages(prev => ({ ...prev, twilio: true }));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoadingStages(prev => ({ ...prev, twilio: false }));
      
      // Stage 2: Google Workspace (1.5s)
      setLoadingStages(prev => ({ ...prev, googleWorkspace: true }));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoadingStages(prev => ({ ...prev, googleWorkspace: false }));
      
      // Stage 3: Calendly (1.5s)
      setLoadingStages(prev => ({ ...prev, calendly: true }));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoadingStages(prev => ({ ...prev, calendly: false }));
      
      // Stage 4: Zoom (fetch real data)
      setLoadingStages(prev => ({ ...prev, zoom: true }));
      try {
        const response = await closersApi.getPlatforms(closer.id);
        setPlatformIds(response.data.platforms);
      } catch (error) {
        console.error('Error fetching platform IDs:', error);
        setPlatformIds({ zoom: null, calendly: null });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingStages(prev => ({ ...prev, zoom: false }));
      
      // Stage 5: GHL (1.5s)
      setLoadingStages(prev => ({ ...prev, ghl: true }));
      await new Promise(resolve => setTimeout(resolve, 1500));
      setLoadingStages(prev => ({ ...prev, ghl: false }));
    };
    
    loadSequentially();
  };

  const handleConfirmOffboard = () => {
    if (!selectedCloser) return;
    
    // Check if at least one platform is selected
    const hasSelection = Object.values(selectedPlatforms).some(v => v);
    if (!hasSelection) {
      alert('Please select at least one platform to offboard from');
      return;
    }

    offboardMutation.mutate({
      closerId: selectedCloser.id,
      platforms: selectedPlatforms
    });
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const selectAllPlatforms = () => {
    setSelectedPlatforms({
      googleWorkspace: true,
      calendly: true,
      zoom: true,
      twilio: true,
      ghl: true
    });
  };

  const deselectAllPlatforms = () => {
    setSelectedPlatforms({
      googleWorkspace: false,
      calendly: false,
      zoom: false,
      twilio: false,
      ghl: false
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Closer Management</h1>
          <p className="text-gray-600 mt-1">Onboard and manage closers across all platforms</p>
        </div>
        <button
          onClick={() => setShowOnboardForm(!showOnboardForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span>Onboard New Closer</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Closers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{closers.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">With 650 Numbers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{closersWithNumbers.length}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Onboarding Form */}
      <AnimatePresence>
        {showOnboardForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6 overflow-hidden"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboard New Closer</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john.doe@tjr-trades.com"
                />
              </div>

              {/* Automation Steps Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Automated Onboarding Steps
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Create Google Workspace account
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Send Calendly invitation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Add to Zoom (may require manual approval)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Assign 650 area code number
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Add to GHL
                  </li>
                </ul>
              </div>

              {onboardMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                  <strong>Error:</strong> {onboardMutation.error?.response?.data?.error || onboardMutation.error?.message}
                </div>
              )}

              {onboardMutation.isSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <strong>Success!</strong> Closer onboarding completed.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={onboardMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {onboardMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Onboarding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" />
                      <span>Start Onboarding</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOnboardForm(false)}
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Closers Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Closers</h2>
          <p className="text-sm text-gray-600 mt-0.5">Manage your closer accounts</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : closers.length === 0 ? (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No closers yet</p>
            <p className="text-sm text-gray-500 mt-1">Click "Onboard New Closer" to get started</p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {closers.map((closer, index) => (
                <motion.div
                  key={closer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all"
                >
                  {/* Avatar and Name */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xl mb-3">
                      {closer.firstName?.charAt(0) || '?'}{closer.lastName?.charAt(0) || ''}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-base mb-1">
                      {closer.firstName} {closer.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{closer.email}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Info Grid */}
                  <div className="space-y-3">
                    {/* GHL Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">GHL Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">Phone Number</span>
                      {closer.assignedPhoneNumber ? (
                        <span className="text-sm font-mono text-green-700 font-semibold">
                          {closer.assignedPhoneNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No number assigned
                        </span>
                      )}
                    </div>

                    {/* Role */}
                    {closer.role && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 font-medium">Role</span>
                        <span className="text-sm text-gray-700 capitalize">{closer.role}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Offboard Button - Full Width at Bottom */}
                  <button
                    onClick={() => handleOffboard(closer)}
                    disabled={offboardMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-300 hover:border-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {offboardMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Offboard Closer</span>
                      </>
                    )}
                  </button>

                  {/* Joined Date - Footer */}
                  {closer.createdAt && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        Joined {new Date(closer.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Offboard Confirmation Modal */}
      <AnimatePresence>
        {showOffboardModal && selectedCloser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowOffboardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Offboard Closer</h3>
                    <p className="text-red-100 text-sm mt-0.5">
                      {selectedCloser.firstName} {selectedCloser.lastName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-gray-600 text-sm mb-3">
                  Select which platforms to remove this closer from. This action cannot be undone.
                </p>

                {/* Platform Checkboxes */}
                <div className="space-y-2 mb-4">
                  {/* Google Workspace */}
                  <label className="flex items-center gap-2.5 p-3 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.googleWorkspace}
                      onChange={() => togglePlatform('googleWorkspace')}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-2.5 flex-1">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Google Workspace</p>
                        <p className="text-xs text-gray-500">Email account & workspace access</p>
                        {loadingStages.googleWorkspace ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                            <p className="text-xs text-gray-500">Checking workspace...</p>
                          </div>
                        ) : platformIds.googleWorkspace ? (
                          <>
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">Workspace ID:</span> <span className="font-mono text-blue-600">{platformIds.googleWorkspace.userId}</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              ⚠️ Deleting will free up 1 license for new user
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Not connected to Google Workspace</p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Calendly */}
                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.calendly}
                      onChange={() => togglePlatform('calendly')}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Calendly</p>
                        <p className="text-xs text-gray-500">Scheduling & calendar integration</p>
                        {loadingStages.calendly ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-green-600" />
                            <p className="text-xs text-gray-500">Checking calendar...</p>
                          </div>
                        ) : platformIds.calendly ? (
                          <>
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">Calendly ID:</span> <span className="font-mono text-green-600">{platformIds.calendly.uri.split('/').pop()}</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              ⚠️ Deleting will free up 1 license for new user
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Not connected to Calendly</p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Zoom */}
                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.zoom}
                      onChange={() => togglePlatform('zoom')}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 4h-1V3c0-.55-.45-1-1-1s-1 .45-1 1v1H8V3c0-.55-.45-1-1-1s-1 .45-1 1v1H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM7 11h5v5H7z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Zoom</p>
                        <p className="text-xs text-gray-500">Video conferencing account</p>
                        {loadingStages.zoom ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                            <p className="text-xs text-gray-500">Checking Zoom account...</p>
                          </div>
                        ) : platformIds.zoom ? (
                          <>
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">Zoom ID:</span> <span className="font-mono text-indigo-600">{platformIds.zoom.userId}</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              ⚠️ Deleting will free up 1 license for new user
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Not connected to Zoom</p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Twilio */}
                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.twilio}
                      onChange={() => togglePlatform('twilio')}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Twilio (650 Number)</p>
                        {loadingStages.twilio ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-red-600" />
                            <p className="text-xs text-gray-500">Loading phone number...</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            {selectedCloser.assignedPhoneNumber || 'No number assigned'}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* GHL */}
                  <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.ghl}
                      onChange={() => togglePlatform('ghl')}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">GoHighLevel</p>
                        <p className="text-xs text-gray-500">CRM & user account</p>
                        {loadingStages.ghl ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                            <p className="text-xs text-gray-500">Checking CRM...</p>
                          </div>
                        ) : platformIds.ghl ? (
                          <>
                            <p className="text-xs text-gray-700 mt-1">
                              <span className="font-medium">GHL ID:</span> <span className="font-mono text-purple-600">{platformIds.ghl.userId}</span>
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              ⚠️ Deleting will free up 1 license for new user
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">Not connected to GHL</p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={selectAllPlatforms}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllPlatforms}
                    className="text-xs font-medium text-gray-600 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>

                {/* Warning Message */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex gap-2.5">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-900 mb-0.5">Warning</p>
                      <p className="text-xs text-red-700">
                        This action is permanent and cannot be undone. The closer will lose access to all selected platforms immediately.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowOffboardModal(false)}
                    disabled={offboardMutation.isPending}
                    className="flex-1 px-3 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmOffboard}
                    disabled={offboardMutation.isPending || loadingStages.twilio || loadingStages.googleWorkspace || loadingStages.calendly || loadingStages.zoom || loadingStages.ghl}
                    className="flex-1 px-3 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold text-sm rounded-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {offboardMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : loadingStages.twilio || loadingStages.googleWorkspace || loadingStages.calendly || loadingStages.zoom || loadingStages.ghl ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-5 w-5" />
                        <span>Confirm Offboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}