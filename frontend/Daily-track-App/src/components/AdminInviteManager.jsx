import React, { useState, useEffect } from 'react';
import { FaPlus, FaCopy, FaTrash, FaToggleOn, FaToggleOff, FaClock, FaUser, FaLink } from 'react-icons/fa';
import axiosInstance from '../../utils/axiosInstance';

const AdminInviteManager = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    maxUses: '',
    expiresInDays: ''
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch all invites
  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/invites/my-invites');
      setInvites(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch invites');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      const payload = {
        description: formData.description || 'Admin Invite',
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        expiresInDays: formData.expiresInDays ? parseInt(formData.expiresInDays) : null
      };

      const response = await axiosInstance.post('/api/invites/generate', payload);
      
      if (response.data.success) {
        setSuccess('Invite link generated successfully!');
        setFormData({ description: '', maxUses: '', expiresInDays: '' });
        setShowModal(false);
        await fetchInvites();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invite');
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeactivateInvite = async (inviteId) => {
    try {
      await axiosInstance.put(`/api/invites/${inviteId}/deactivate`);
      setSuccess('Invite deactivated successfully');
      await fetchInvites();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deactivate invite');
    }
  };

  const handleDeleteInvite = async (inviteId) => {
    if (window.confirm('Are you sure you want to delete this invite?')) {
      try {
        await axiosInstance.delete(`/api/invites/${inviteId}`);
        setSuccess('Invite deleted successfully');
        await fetchInvites();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete invite');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Invite Manager</h1>
          <p className="text-gray-400">Generate and manage team member invitations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-orange-500/50 active:scale-95"
        >
          <FaPlus />
          <span>Generate Invite</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Invites List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin inline-block">⟳</div>
            <p className="text-gray-400 mt-2">Loading invites...</p>
          </div>
        ) : invites.length === 0 ? (
          <div className="bg-black/40 border border-white/10 rounded-lg p-8 text-center">
            <FaLink className="text-gray-500 text-4xl mx-auto mb-3" />
            <p className="text-gray-400 mb-3">No invite links yet</p>
            <p className="text-gray-500 text-sm">Create your first invite to invite team members</p>
          </div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite._id}
              className="bg-black/40 border border-white/10 rounded-lg p-6 hover:border-orange-500/30 transition-all duration-200"
            >
              {/* Invite Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{invite.description}</h3>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                    <FaUser className="text-blue-400" />
                    <span>Used by {invite.timesUsed} member{invite.timesUsed !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {invite.isActive ? (
                    <button
                      onClick={() => handleDeactivateInvite(invite._id)}
                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
                      title="Deactivate invite"
                    >
                      <FaToggleOn size={18} />
                    </button>
                  ) : (
                    <div className="p-2 text-gray-500">
                      <FaToggleOff size={18} />
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteInvite(invite._id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Delete invite"
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              </div>

              {/* Invite Code and Link */}
              <div className="space-y-3 mb-4">
                {/* Code */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-2 font-semibold">INVITE CODE</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-orange-400 font-mono text-sm">{invite.inviteCode}</code>
                    <button
                      onClick={() => copyToClipboard(invite.inviteCode, `code-${invite._id}`)}
                      className="p-2 text-gray-400 hover:text-orange-400 transition-colors"
                    >
                      <FaCopy size={14} />
                    </button>
                    {copiedId === `code-${invite._id}` && (
                      <span className="text-green-400 text-xs">Copied!</span>
                    )}
                  </div>
                </div>

                {/* Link */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-2 font-semibold">INVITE LINK</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-blue-400 text-xs break-all">{invite.inviteLink}</p>
                    <button
                      onClick={() => copyToClipboard(invite.inviteLink, `link-${invite._id}`)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors flex-shrink-0"
                    >
                      <FaCopy size={14} />
                    </button>
                    {copiedId === `link-${invite._id}` && (
                      <span className="text-green-400 text-xs">Copied!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Invite Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <p className={`text-sm font-semibold ${invite.isActive && !isExpired(invite.expiresAt) ? 'text-green-400' : 'text-red-400'}`}>
                    {isExpired(invite.expiresAt) ? 'Expired' : invite.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Max Uses</p>
                  <p className="text-sm font-semibold text-gray-200">
                    {invite.maxUses ? invite.maxUses : 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1 flex items-center gap-1">
                    <FaClock size={10} /> Expires
                  </p>
                  <p className="text-sm font-semibold text-gray-200">{formatDate(invite.expiresAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Created</p>
                  <p className="text-sm font-semibold text-gray-200">{formatDate(invite.createdAt)}</p>
                </div>
              </div>

              {/* Usage Bar */}
              {invite.maxUses && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-400 text-xs">Usage</p>
                    <p className="text-gray-300 text-xs font-semibold">
                      {invite.timesUsed} / {invite.maxUses}
                    </p>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(invite.timesUsed / invite.maxUses) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Users who used this invite */}
              {invite.usedBy && invite.usedBy.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-xs mb-2 font-semibold">MEMBERS JOINED</p>
                  <div className="flex flex-wrap gap-2">
                    {invite.usedBy.map((usage, idx) => (
                      usage.userId && (
                        <div key={idx} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">
                          {usage.userId.name}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Generate Invite */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-white/10 rounded-lg p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Generate New Invite</h2>

            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm font-semibold block mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Q1 Project Team"
                  className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block p-3 outline-none placeholder-gray-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm font-semibold block mb-2">Max Uses (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder="Leave blank for unlimited"
                    min="1"
                    className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block p-3 outline-none placeholder-gray-600 transition-all"
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-sm font-semibold block mb-2">Expires In (Days)</label>
                  <input
                    type="number"
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: e.target.value })}
                    placeholder="Leave blank for never"
                    min="1"
                    className="w-full bg-white/5 border border-white/10 text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 block p-3 outline-none placeholder-gray-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-all active:scale-95"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInviteManager;
