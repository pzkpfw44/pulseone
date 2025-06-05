// frontend/src/components/ui/CollaborativeFeatures.jsx - Phase 3
import React, { useState, useEffect } from 'react';
import { 
  Users, Share2, MessageSquare, ThumbsUp, ThumbsDown, 
  CheckCircle, Clock, AlertCircle, Star, Eye, Edit3,
  UserPlus, Settings, Bell, Archive, Download, Copy,
  GitBranch, History, Award, Target, Activity, Calendar
} from 'lucide-react';
import api from '../../services/api';

const CollaborativeFeatures = ({ 
  generationId, 
  templateId, 
  selectedDocuments, 
  isVisible = true,
  currentUser = { id: 'system', name: 'User' }
}) => {
  const [activeTab, setActiveTab] = useState('sharing');
  const [collaborators, setCollaborators] = useState([]);
  const [sharedConfigs, setSharedConfigs] = useState([]);
  const [teamFeedback, setTeamFeedback] = useState([]);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'sharing', name: 'Team Sharing', icon: Share2 },
    { id: 'feedback', name: 'Team Feedback', icon: MessageSquare },
    { id: 'approval', name: 'Approval Workflow', icon: CheckCircle },
    { id: 'templates', name: 'Shared Templates', icon: GitBranch }
  ];

  useEffect(() => {
    if (isVisible && generationId) {
      fetchCollaborativeData();
    }
  }, [isVisible, generationId]);

  const fetchCollaborativeData = async () => {
    setLoading(true);
    try {
      const [collaboratorsRes, feedbackRes, approvalRes, configsRes] = await Promise.all([
        api.get(`/collaborative/collaborators/${generationId}`),
        api.get(`/collaborative/feedback/${generationId}`),
        api.get(`/collaborative/approval-status/${generationId}`),
        api.get(`/collaborative/shared-configs/${templateId}`)
      ]);

      setCollaborators(collaboratorsRes.data.collaborators || []);
      setTeamFeedback(feedbackRes.data.feedback || []);
      setApprovalStatus(approvalRes.data.status || null);
      setSharedConfigs(configsRes.data.configs || []);
    } catch (error) {
      console.error('Error fetching collaborative data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Team Collaboration</h3>
            <p className="text-sm text-gray-600">Share, review, and collaborate on AI generations</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {collaborators.length} collaborator{collaborators.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'sharing' && (
          <SharingTab 
            generationId={generationId}
            collaborators={collaborators}
            onCollaboratorsUpdate={setCollaborators}
            currentUser={currentUser}
          />
        )}
        
        {activeTab === 'feedback' && (
          <FeedbackTab 
            generationId={generationId}
            teamFeedback={teamFeedback}
            onFeedbackUpdate={setTeamFeedback}
            currentUser={currentUser}
          />
        )}
        
        {activeTab === 'approval' && (
          <ApprovalTab 
            generationId={generationId}
            approvalStatus={approvalStatus}
            onApprovalUpdate={setApprovalStatus}
            currentUser={currentUser}
          />
        )}
        
        {activeTab === 'templates' && (
          <SharedTemplatesTab 
            templateId={templateId}
            sharedConfigs={sharedConfigs}
            selectedDocuments={selectedDocuments}
            onConfigsUpdate={setSharedConfigs}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
};

// Sharing Tab Component
const SharingTab = ({ generationId, collaborators, onCollaboratorsUpdate, currentUser }) => {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [shareLink, setShareLink] = useState('');

  const handleInviteCollaborator = async () => {
    try {
      const response = await api.post('/collaborative/invite', {
        generationId,
        email: inviteEmail,
        role: inviteRole
      });

      if (response.data.success) {
        onCollaboratorsUpdate(prev => [...prev, response.data.collaborator]);
        setInviteEmail('');
        setShowInvite(false);
      }
    } catch (error) {
      console.error('Error inviting collaborator:', error);
    }
  };

  const generateShareLink = async () => {
    try {
      const response = await api.post('/collaborative/generate-link', {
        generationId,
        permissions: 'view'
      });

      if (response.data.success) {
        setShareLink(response.data.shareLink);
      }
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Collaboration Actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">Team Access</h4>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </button>
          <button
            onClick={generateShareLink}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Generate Link
          </button>
        </div>
      </div>

      {/* Current Collaborators */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Current Team Members</h5>
        <div className="space-y-3">
          {collaborators.map((collaborator, index) => (
            <CollaboratorCard key={index} collaborator={collaborator} />
          ))}
          {collaborators.length === 0 && (
            <p className="text-sm text-gray-500">No team members added yet</p>
          )}
        </div>
      </div>

      {/* Share Link */}
      {shareLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h5 className="font-medium text-blue-900 mb-2">Share Link Generated</h5>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 text-sm text-blue-800 bg-white border border-blue-300 rounded px-3 py-2"
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareLink)}
              className="px-3 py-2 text-sm text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={handleInviteCollaborator}
          email={inviteEmail}
          setEmail={setInviteEmail}
          role={inviteRole}
          setRole={setInviteRole}
        />
      )}
    </div>
  );
};

// Feedback Tab Component
const FeedbackTab = ({ generationId, teamFeedback, onFeedbackUpdate, currentUser }) => {
  const [newFeedback, setNewFeedback] = useState('');
  const [rating, setRating] = useState(0);

  const handleSubmitFeedback = async () => {
    try {
      const response = await api.post('/collaborative/feedback', {
        generationId,
        feedback: newFeedback,
        rating,
        userId: currentUser.id
      });

      if (response.data.success) {
        onFeedbackUpdate(prev => [...prev, response.data.feedback]);
        setNewFeedback('');
        setRating(0);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit Feedback */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Provide Feedback</h5>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-6 h-6 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star className="w-full h-full fill-current" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Share your thoughts on this generation..."
            />
          </div>
          <button
            onClick={handleSubmitFeedback}
            disabled={!newFeedback.trim() || rating === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Submit Feedback
          </button>
        </div>
      </div>

      {/* Team Feedback */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Team Feedback</h5>
        <div className="space-y-4">
          {teamFeedback.map((feedback, index) => (
            <FeedbackCard key={index} feedback={feedback} />
          ))}
          {teamFeedback.length === 0 && (
            <p className="text-sm text-gray-500">No feedback yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Approval Tab Component
const ApprovalTab = ({ generationId, approvalStatus, onApprovalUpdate, currentUser }) => {
  const [approvers, setApprovers] = useState([]);
  const [approvalComments, setApprovalComments] = useState('');

  const handleApprovalAction = async (action) => {
    try {
      const response = await api.post('/collaborative/approval', {
        generationId,
        action, // 'approve', 'reject', 'request-changes'
        comments: approvalComments,
        userId: currentUser.id
      });

      if (response.data.success) {
        onApprovalUpdate(response.data.status);
        setApprovalComments('');
      }
    } catch (error) {
      console.error('Error submitting approval:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Approval Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Approval Status</h5>
        <ApprovalStatus status={approvalStatus} />
      </div>

      {/* Approval Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium text-gray-900 mb-3">Take Action</h5>
        <div className="space-y-3">
          <textarea
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            placeholder="Add comments for your approval decision..."
          />
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleApprovalAction('approve')}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2 inline" />
              Approve
            </button>
            <button
              onClick={() => handleApprovalAction('request-changes')}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
            >
              <Edit3 className="w-4 h-4 mr-2 inline" />
              Request Changes
            </button>
            <button
              onClick={() => handleApprovalAction('reject')}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              <AlertCircle className="w-4 h-4 mr-2 inline" />
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Approval History */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Approval History</h5>
        <ApprovalHistory generationId={generationId} />
      </div>
    </div>
  );
};

// Shared Templates Tab Component
const SharedTemplatesTab = ({ templateId, sharedConfigs, selectedDocuments, onConfigsUpdate, currentUser }) => {
  const [showSaveConfig, setShowSaveConfig] = useState(false);
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');

  const handleSaveConfiguration = async () => {
    try {
      const response = await api.post('/collaborative/save-config', {
        templateId,
        name: configName,
        description: configDescription,
        configuration: {
          selectedDocuments: selectedDocuments.map(d => d.id),
          documentAnalysis: true,
          // Include other form data as needed
        },
        userId: currentUser.id
      });

      if (response.data.success) {
        onConfigsUpdate(prev => [...prev, response.data.config]);
        setConfigName('');
        setConfigDescription('');
        setShowSaveConfig(false);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const handleLoadConfiguration = async (configId) => {
    try {
      const response = await api.get(`/collaborative/load-config/${configId}`);
      
      if (response.data.success) {
        // Load configuration into current form
        // This would trigger parent component updates
        console.log('Loading configuration:', response.data.config);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Current Configuration */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-gray-900">Current Configuration</h5>
          <button
            onClick={() => setShowSaveConfig(true)}
            className="px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            <Archive className="w-4 h-4 mr-2 inline" />
            Save for Team
          </button>
        </div>
        <div className="text-sm text-gray-600">
          <p>Documents: {selectedDocuments.length} selected</p>
          <p>Template: {templateId}</p>
        </div>
      </div>

      {/* Shared Configurations */}
      <div>
        <h5 className="font-medium text-gray-900 mb-3">Team Configurations</h5>
        <div className="space-y-3">
          {sharedConfigs.map((config, index) => (
            <SharedConfigCard
              key={index}
              config={config}
              onLoad={() => handleLoadConfiguration(config.id)}
            />
          ))}
          {sharedConfigs.length === 0 && (
            <p className="text-sm text-gray-500">No shared configurations yet</p>
          )}
        </div>
      </div>

      {/* Save Configuration Modal */}
      {showSaveConfig && (
        <SaveConfigModal
          onClose={() => setShowSaveConfig(false)}
          onSave={handleSaveConfiguration}
          name={configName}
          setName={setConfigName}
          description={configDescription}
          setDescription={setConfigDescription}
        />
      )}
    </div>
  );
};

// Helper Components
const CollaboratorCard = ({ collaborator }) => (
  <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-green-800">
          {collaborator.name?.charAt(0) || 'U'}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
        <p className="text-xs text-gray-500">{collaborator.email}</p>
      </div>
    </div>
    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
      {collaborator.role}
    </span>
  </div>
);

const FeedbackCard = ({ feedback }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-900">{feedback.userName}</span>
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
          ))}
        </div>
      </div>
      <span className="text-xs text-gray-500">{feedback.createdAt}</span>
    </div>
    <p className="text-sm text-gray-700">{feedback.comments}</p>
  </div>
);

const ApprovalStatus = ({ status }) => {
  if (!status) return <p className="text-sm text-gray-500">No approval workflow active</p>;

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(status.status)}`}>
        {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
      </span>
      <span className="text-sm text-gray-600">
        {status.approvedBy ? `by ${status.approvedBy}` : 'Waiting for approval'}
      </span>
    </div>
  );
};

const ApprovalHistory = ({ generationId }) => {
  // This would fetch and display approval history
  return (
    <div className="text-sm text-gray-500">
      <p>Approval history will be displayed here</p>
    </div>
  );
};

const SharedConfigCard = ({ config, onLoad }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h6 className="text-sm font-medium text-gray-900">{config.name}</h6>
        <p className="text-xs text-gray-600 mt-1">{config.description}</p>
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
          <span>By {config.createdBy}</span>
          <span>{config.documentsCount} documents</span>
          <span>{config.createdAt}</span>
        </div>
      </div>
      <button
        onClick={onLoad}
        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
      >
        Load
      </button>
    </div>
  </div>
);

// Modal Components
const InviteModal = ({ onClose, onInvite, email, setEmail, role, setRole }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="colleague@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="approver">Approver</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onInvite}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Send Invite
        </button>
      </div>
    </div>
  </div>
);

const SaveConfigModal = ({ onClose, onSave, name, setName, description, setDescription }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg max-w-md w-full p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Save Configuration</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Configuration name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Describe this configuration..."
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
);

export default CollaborativeFeatures;