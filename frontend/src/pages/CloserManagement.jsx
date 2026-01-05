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
  Briefcase,
  Link2,
  ExternalLink,
  Copy,
  Users,
  Search,
  Settings,
  Trash2,
  Edit,
  Pencil,
  X
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
  const [copiedLink, setCopiedLink] = useState(null);
  const [activeTab, setActiveTab] = useState('closers');
  const [activeProductTab, setActiveProductTab] = useState(0);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [editingLink, setEditingLink] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    closerEmail: '',
    initialPrice: 0,
    renewalPrice: 0,
    installments: 0,
    planType: 'one_time',
    billingPeriod: 30
  });

  // Fetch Whop closer links by product
  const { data: whopProductsData, isLoading: whopLoading } = useQuery({
    queryKey: ['whop-closer-links-by-product'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8080/api/whop/closer-links-by-product');
      const data = await response.json();
      return data;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const products = whopProductsData?.data || [];
  const activeProduct = products[activeProductTab] || null;
  const [deletingCloser, setDeletingCloser] = useState(null);
  const [deletingLink, setDeletingLink] = useState(null);

  // Delete single link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: async (planId) => {
      const response = await fetch(`http://localhost:8080/api/whop/plan/${planId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete link');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whop-closer-links-by-product']);
      setDeletingLink(null);
    },
    onError: (error) => {
      console.error('Failed to delete link:', error);
      alert(`Failed to delete link: ${error.message}`);
      setDeletingLink(null);
    }
  });

  // Edit link mutation
  const editLinkMutation = useMutation({
    mutationFn: async ({ planId, updates }) => {
      const response = await fetch(`http://localhost:8080/api/whop/plan/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update link');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whop-closer-links-by-product']);
      setShowEditModal(false);
      setEditingLink(null);
    },
    onError: (error) => {
      console.error('Failed to update link:', error);
      alert(`Failed to update link: ${error.message}`);
    }
  });

  const handleDeleteLink = (link) => {
    if (window.confirm(`Are you sure you want to delete this payment link for ${link.closerEmail}?`)) {
      setDeletingLink(link.id);
      deleteLinkMutation.mutate(link.id);
    }
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setEditFormData({
      closerEmail: link.closerEmail,
      initialPrice: link.price || 0,
      renewalPrice: 0, // We'll need to fetch this from the plan details
      installments: 0,
      planType: 'one_time',
      billingPeriod: 30
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editingLink) return;

    editLinkMutation.mutate({
      planId: editingLink.id,
      updates: editFormData
    });
  };

  // Delete closer links mutation
  const deleteCloserLinksMutation = useMutation({
    mutationFn: async ({ closerEmail, planIds }) => {
      const response = await fetch(`http://localhost:8080/api/whop/closer-links/${encodeURIComponent(closerEmail)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planIds })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete links');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['whop-closer-links-by-product']);
      setDeletingCloser(null);
    },
    onError: (error) => {
      console.error('Failed to delete closer links:', error);
      alert(`Failed to delete links: ${error.message}`);
      setDeletingCloser(null);
    }
  });

  const handleDeleteCloserLinks = (closer) => {
    if (window.confirm(`Are you sure you want to delete all payment links for ${closer.closerName}? This action cannot be undone.`)) {
      setDeletingCloser(closer.email);
      // Extract all plan IDs from closer's links
      const planIds = closer.links.map(link => link.id);
      deleteCloserLinksMutation.mutate({ 
        closerEmail: closer.email,
        planIds 
      });
    }
  };

  // Filter closers in active product based on search
  const filteredClosers = activeProduct?.closers?.filter(closer => {
    if (!linkSearchQuery.trim()) return true;
    const query = linkSearchQuery.toLowerCase();
    return (
      closer.email?.toLowerCase().includes(query) ||
      closer.closerName?.toLowerCase().includes(query)
    );
  }) || [];

  const copyToClipboard = (url, linkId) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Fetch all closers (phone numbers already included from backend)
  const { data: closersData, isLoading } = useQuery({
    queryKey: ['closers'],
    queryFn: async () => {
      const response = await closersApi.getClosers();
      return response.data;
    },
    refetchInterval: 10000
  });

  // Fetch license availability
  const { data: licensesData, isLoading: licensesLoading, error: licensesError } = useQuery({
    queryKey: ['licenses'],
    queryFn: async () => {
      const response = await closersApi.getLicenses();
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 2
  });

  const closers = closersData?.closers || [];
  const closersWithNumbers = closers.filter(c => c.assignedPhoneNumber);
  const licenses = licensesData?.licenses || {};
  const canOnboard = licensesData?.canOnboard ?? true; // Default to true if loading or error
  
  // Log for debugging
  console.log('[CloserManagement] License data:', licensesData);
  console.log('[CloserManagement] Can onboard:', canOnboard);
  console.log('[CloserManagement] Licenses error:', licensesError);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Closer Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage closers and payment links</p>
        </div>

        {/* License Status - Hidden on mobile, shown on tablet+ */}
        <div className="hidden md:flex items-center gap-2">
          {licensesData && !licensesLoading && licenses && (
            <>
              {licenses.zoom && !licenses.zoom.error && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  licenses.zoom.percentage >= 95
                    ? 'bg-red-50 text-red-700'
                    : licenses.zoom.percentage >= 90
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    licenses.zoom.percentage >= 95
                      ? 'bg-red-500'
                      : licenses.zoom.percentage >= 90
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}></span>
                  Zoom: {licenses.zoom.used}/{licenses.zoom.total}
                </div>
              )}
              {licenses.calendly && !licenses.calendly.error && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  licenses.calendly.percentage >= 95
                    ? 'bg-red-50 text-red-700'
                    : licenses.calendly.percentage >= 90
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-green-50 text-green-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    licenses.calendly.percentage >= 95
                      ? 'bg-red-500'
                      : licenses.calendly.percentage >= 90
                      ? 'bg-orange-500'
                      : 'bg-green-500'
                  }`}></span>
                  Calendly: {licenses.calendly.used}/{licenses.calendly.total}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 sm:gap-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('closers')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'closers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Onboarding</span>
            <span className="sm:hidden">Onboard</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {closers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('offboarding')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'offboarding'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserMinus className="h-4 w-4" />
            <span className="hidden sm:inline">Offboarding</span>
            <span className="sm:hidden">Offboard</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {closers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Payment Links</span>
            <span className="sm:hidden">Links</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {products.length}
            </span>
          </button>
        </nav>
      </div>

      {/* ========== MANAGE CLOSERS TAB ========== */}
      {activeTab === 'closers' && (
        <div className="space-y-6">
          {/* Onboard Button */}
          <div className="flex justify-end">
            <button
              onClick={() => canOnboard && setShowOnboardForm(!showOnboardForm)}
              disabled={!canOnboard}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-colors ${
                canOnboard
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title={!canOnboard ? 'No licenses available. Notify Sales Manager to purchase licenses.' : ''}
            >
              <UserPlus className="h-5 w-5" />
              <span className="hidden sm:inline">Onboard New Closer</span>
              <span className="sm:hidden">Onboard</span>
            </button>
          </div>

          {/* License Warning */}
          {licensesData && !canOnboard && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    No Licenses Available
                  </p>
                  <p className="text-sm text-red-800">
                    {licensesData?.summary?.unavailablePlatforms?.join(' and ')} license{licensesData?.summary?.unavailablePlatforms?.length > 1 ? 's are' : ' is'} full.
                    Please notify your Sales Manager to purchase additional licenses before onboarding new closers.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

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
      </div>
      )}

      {/* ========== OFFBOARDING TAB ========== */}
      {activeTab === 'offboarding' && (
        <div className="space-y-6">
          {/* Warning Banner - Improved */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-base font-bold text-red-900 mb-2">
                  ⚠️ Offboarding Closer
                </p>
                <p className="text-sm text-red-800 leading-relaxed">
                  Select a closer below to remove them from all platforms. This will delete their accounts and release their phone number.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview - Improved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-1">Active Closers</p>
                  <p className="text-4xl font-bold text-green-900 mt-2">{closers.length}</p>
                  <p className="text-xs text-green-600 mt-2">Total team members</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-green-500 flex items-center justify-center shadow-lg">
                  <Briefcase className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-1">With 650 Numbers</p>
                  <p className="text-4xl font-bold text-blue-900 mt-2">{closersWithNumbers.length}</p>
                  <p className="text-xs text-blue-600 mt-2">Numbers assigned</p>
                </div>
                <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg">
                  <Phone className="h-7 w-7 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Closers List for Offboarding - Improved */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
              <p className="text-gray-600 font-medium">Loading closers...</p>
            </div>
          ) : closers.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200">
              <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold text-lg">No Closers Available</p>
              <p className="text-sm text-gray-500 mt-2">All closers have been offboarded</p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Select Closer to Offboard</h3>
                <span className="text-sm text-gray-500">{closers.length} total</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closers.map((closer, index) => (
                  <motion.div
                    key={closer.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-gray-400 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center text-center mb-5">
                      <div className="relative mb-3">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-2xl shadow-lg group-hover:scale-110 transition-transform">
                          {closer.firstName?.charAt(0) || '?'}{closer.lastName?.charAt(0) || ''}
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base mb-1">
                        {closer.firstName} {closer.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">{closer.email}</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-4"></div>

                    {/* Info Grid - Improved */}
                    <div className="space-y-3">
                      {/* GHL Status */}
                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-semibold text-green-700 uppercase">GHL Status</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                          Active
                        </span>
                      </div>

                      {/* Phone Number */}
                      <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-semibold text-blue-700 uppercase">Phone Number</span>
                        {closer.assignedPhoneNumber ? (
                          <span className="text-sm font-mono text-blue-900 font-bold">
                            {closer.assignedPhoneNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No number
                          </span>
                        )}
                      </div>

                      {/* Role */}
                      {closer.role && (
                        <div className="flex items-center justify-between bg-purple-50 rounded-lg px-3 py-2">
                          <span className="text-xs font-semibold text-purple-700 uppercase">Role</span>
                          <span className="text-sm text-purple-900 capitalize font-medium">{closer.role}</span>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-200 my-4"></div>

                    {/* Offboard Button - Enhanced */}
                    <button
                      onClick={() => handleOffboard(closer)}
                      disabled={offboardMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105"
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
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                          <span className="font-medium">Joined</span>
                          <span>{new Date(closer.createdAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== PAYMENT LINKS TAB ========== */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          {whopLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Link2 className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No products with closer links found</p>
              <p className="text-sm text-gray-500 mt-1">Payment links will appear here when created in Whop</p>
            </div>
          ) : (
            <>
              {/* Product Sub-tabs */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 overflow-x-auto">
                  <nav className="flex min-w-max" aria-label="Product tabs">
                    {products.map((product, index) => (
                      <button
                        key={product.productId}
                        onClick={() => {
                          setActiveProductTab(index);
                          setLinkSearchQuery('');
                        }}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeProductTab === index
                            ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{product.productName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          activeProductTab === index
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {product.totalClosers}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by closer name or email..."
                      value={linkSearchQuery}
                      onChange={(e) => setLinkSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {linkSearchQuery && (
                      <button
                        onClick={() => setLinkSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {linkSearchQuery && activeProduct && (
                    <p className="text-sm text-gray-500 mt-2">
                      Found {filteredClosers.length} of {activeProduct.closers.length} closers
                    </p>
                  )}
                </div>

                {/* Product Table */}
                {activeProduct && (
                  <div className="overflow-x-auto">
                    {filteredClosers.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-600 font-medium">
                          {linkSearchQuery ? 'No matching closers found' : 'No closers in this product'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {linkSearchQuery ? 'Try a different search term' : 'Add closer links in Whop'}
                        </p>
                      </div>
                    ) : (
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50">
                              Closer
                            </th>
                            {activeProduct.linkTypes.map((type) => {
                              const typeColors = {
                                pif: 'text-green-700',
                                deposit: 'text-blue-700',
                                deposit500: 'text-indigo-700',
                                split: 'text-purple-700',
                                psplit: 'text-orange-700',
                                other: 'text-gray-700'
                              };
                              const typeLabels = {
                                pif: '7k PIF',
                                deposit: 'Deposit $250',
                                deposit500: 'Deposit $500',
                                split: '3500 Split',
                                psplit: 'P-Split',
                                other: 'Other'
                              };
                              return (
                                <th key={type} className={`text-center px-3 py-3 text-xs font-semibold uppercase tracking-wider ${typeColors[type] || 'text-gray-600'}`}>
                                  {typeLabels[type] || type}
                                </th>
                              );
                            })}
                            <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Members
                            </th>
                            <th className="text-center px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredClosers.map((closer) => {
                            const getLinkByType = (type) => closer.links.find(l => l.linkType === type);

                            const LinkCell = ({ link, colorClass }) => (
                              link ? (
                                <div className="flex items-center justify-center gap-1">
                                  <a
                                    href={link.checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${colorClass}`}
                                    title="Open link"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <button
                                    onClick={() => copyToClipboard(link.checkoutUrl, link.id)}
                                    className={`p-1.5 rounded transition-colors ${
                                      copiedLink === link.id
                                        ? 'bg-green-100 text-green-700'
                                        : 'hover:bg-gray-100 text-gray-500'
                                    }`}
                                    title="Copy link"
                                  >
                                    {copiedLink === link.id ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleEditLink(link)}
                                    className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                    title="Edit link"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLink(link)}
                                    disabled={deletingLink === link.id}
                                    className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors disabled:opacity-50"
                                    title="Delete link"
                                  >
                                    {deletingLink === link.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )
                            );

                            const typeColorClasses = {
                              pif: 'text-green-600',
                              deposit: 'text-blue-600',
                              deposit500: 'text-indigo-600',
                              split: 'text-purple-600',
                              psplit: 'text-orange-600',
                              other: 'text-gray-600'
                            };

                            return (
                              <tr key={closer.email} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 sticky left-0 bg-white">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                      {closer.closerName?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-gray-900 text-sm capitalize truncate">{closer.closerName}</p>
                                      <p className="text-xs text-gray-500 truncate">{closer.email}</p>
                                    </div>
                                  </div>
                                </td>
                                {activeProduct.linkTypes.map((type) => (
                                  <td key={type} className="px-3 py-3 text-center">
                                    <LinkCell link={getLinkByType(type)} colorClass={typeColorClasses[type] || 'text-gray-600'} />
                                  </td>
                                ))}
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                                    <Users className="h-3.5 w-3.5" />
                                    {closer.totalMembers}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <button
                                    onClick={() => handleDeleteCloserLinks(closer)}
                                    disabled={deletingCloser === closer.email}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete all links for this closer"
                                  >
                                    {deletingCloser === closer.email ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

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

      {/* Edit Link Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit Payment Link</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Closer Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.closerEmail}
                    onChange={(e) => setEditFormData({ ...editFormData, closerEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <select
                    value={editFormData.planType}
                    onChange={(e) => setEditFormData({ ...editFormData, planType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="one_time">One-Time Payment</option>
                    <option value="renewal">Recurring Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Initial Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.initialPrice}
                    onChange={(e) => setEditFormData({ ...editFormData, initialPrice: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {editFormData.planType === 'renewal' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Renewal Price ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.renewalPrice}
                        onChange={(e) => setEditFormData({ ...editFormData, renewalPrice: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Number of Installments
                      </label>
                      <input
                        type="number"
                        value={editFormData.installments}
                        onChange={(e) => setEditFormData({ ...editFormData, installments: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Billing Period (days)
                      </label>
                      <input
                        type="number"
                        value={editFormData.billingPeriod}
                        onChange={(e) => setEditFormData({ ...editFormData, billingPeriod: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={editLinkMutation.isPending}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLinkMutation.isPending}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {editLinkMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}