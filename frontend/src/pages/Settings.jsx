import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Shield,
  Globe,
  Database,
  Mail
} from 'lucide-react';
import BrandingSettings from '../components/settings/BrandingSettings';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('branding');

  const tabs = [
    {
      id: 'branding',
      name: 'Branding',
      icon: Palette,
      description: 'Company branding and voice settings',
      component: <BrandingSettings />
    },
    {
      id: 'security',
      name: 'Security',
      icon: Shield,
      description: 'Security and privacy settings',
      component: <ComingSoonCard title="Security Settings" description="Manage authentication, permissions, and security policies" />
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: Globe,
      description: 'External service integrations',
      component: <ComingSoonCard title="Integrations" description="Connect with external services and APIs" />
    },
    {
      id: 'data',
      name: 'Data Management',
      icon: Database,
      description: 'Data backup and export settings',
      component: <ComingSoonCard title="Data Management" description="Backup, export, and manage your data" />
    },
    {
      id: 'notifications',
      name: 'Notifications',
      icon: Mail,
      description: 'Email and notification preferences',
      component: <ComingSoonCard title="Notification Settings" description="Configure email notifications and alerts" />
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your Pulse One application</p>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-1/4 mb-6 lg:mb-0">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full group flex items-start px-3 py-3 text-sm font-medium rounded-lg text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon
                      className={`mr-3 mt-1 h-5 w-5 ${
                        activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    />
                    <div>
                      <div className="font-semibold">{tab.name}</div>
                      <div className="text-xs leading-snug">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-sm border min-h-[600px]">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <activeTabData.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      {activeTabData.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {activeTabData.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">{activeTabData.component}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder for tabs not implemented
const ComingSoonCard = ({ title, description }) => (
  <div className="text-center py-12">
    <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-gray-100 flex items-center justify-center">
      <SettingsIcon className="w-6 h-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 mb-4">{description}</p>
    <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg">
      <SettingsIcon className="w-4 h-4 mr-2" />
      Coming Soon
    </div>
  </div>
);

export default Settings;
