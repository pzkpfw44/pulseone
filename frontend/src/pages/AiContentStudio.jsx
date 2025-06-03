import React, { useState } from 'react';
import { 
  FileText, Users, TrendingUp, BookOpen, Settings, Briefcase,
  PlusCircle, Download, Eye, Clock, CheckCircle, AlertCircle,
  Sparkles, Brain, Target, Lightbulb, Zap, Globe, Shield
} from 'lucide-react';

const AiContentStudio = () => {
  const [activeTab, setActiveTab] = useState('hr-docs');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const tabs = [
    {
      id: 'hr-docs',
      name: 'HR Docs & Templates',
      icon: FileText,
      description: 'Essential HR documentation and templates',
      priority: 'High Priority',
      status: 'active'
    },
    {
      id: 'people-strategy',
      name: 'People Strategy Documents',
      icon: Users,
      description: 'Strategic HR documents and frameworks',
      priority: 'Phase 2',
      status: 'coming-soon'
    },
    {
      id: 'dashboard-builder',
      name: 'Dashboard Builder',
      icon: TrendingUp,
      description: 'Custom analytics and reporting dashboards',
      priority: 'Phase 3',
      status: 'future'
    }
  ];

  const hrDocTemplates = [
    {
      id: 'policy-generator',
      title: 'Policy Generator',
      description: 'Generate comprehensive company policies with compliance checking',
      icon: Shield,
      category: 'Policies',
      estimatedTime: '10-15 min',
      features: ['Compliance checking', 'Legal review points', 'Version control']
    },
    {
      id: 'job-descriptions',
      title: 'Job Descriptions',
      description: 'Create detailed job descriptions with competency mapping',
      icon: Briefcase,
      category: 'Recruitment',
      estimatedTime: '8-12 min',
      features: ['Competency mapping', 'Salary benchmarking', 'Requirements analysis']
    },
    {
      id: 'procedure-docs',
      title: 'Procedure Documentation',
      description: 'Step-by-step process guides and workflows',
      icon: BookOpen,
      category: 'Operations',
      estimatedTime: '15-20 min',
      features: ['Step-by-step guides', 'Visual workflows', 'Approval processes']
    },
    {
      id: 'onboarding-materials',
      title: 'Onboarding Materials',
      description: 'Welcome guides and training materials for new hires',
      icon: Users,
      category: 'Onboarding',
      estimatedTime: '12-18 min',
      features: ['Personalized content', 'Interactive checklists', 'Progress tracking']
    },
    {
      id: 'functional-booklets',
      title: 'Functional Booklets',
      description: 'Department-specific handbooks and guidelines',
      icon: Globe,
      category: 'Documentation',
      estimatedTime: '20-30 min',
      features: ['Department customization', 'Role-specific content', 'Regular updates']
    }
  ];

  const peopleStrategyTemplates = [
    {
      id: 'leadership-models',
      title: 'Leadership Models',
      description: 'Competency frameworks and development paths',
      icon: Target,
      category: 'Leadership',
      status: 'coming-soon'
    },
    {
      id: 'strategic-memos',
      title: 'Strategic Memos',
      description: 'Executive briefings and strategy documents',
      icon: TrendingUp,
      category: 'Strategy',
      status: 'coming-soon'
    },
    {
      id: 'training-outlines',
      title: 'Training Outlines',
      description: 'Learning path design and curriculum development',
      icon: BookOpen,
      category: 'Learning',
      status: 'coming-soon'
    }
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Available Now</span>;
      case 'coming-soon':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Coming Soon</span>;
      case 'future':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Future Release</span>;
      default:
        return null;
    }
  };

  const handleCreateDocument = (templateId) => {
    setSelectedTemplate(templateId);
    // Here you would implement the document creation logic
    console.log('Creating document with template:', templateId);
  };

  const renderHRDocsContent = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">AI-Powered Content Generation</h4>
            <p className="text-sm text-blue-700 mt-1">
              All templates use advanced AI to generate contextually relevant content based on your company's 
              knowledge base, industry standards, and uploaded documents.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hrDocTemplates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${'bg-charcoal-100'}`}>
                  <template.icon className={`w-5 h-5 ${'text-charcoal-600'}`} />
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{template.description}</p>
              
              <div className="flex items-center text-xs text-gray-500 mb-4">
                <Clock className="w-3 h-3 mr-1" />
                {template.estimatedTime}
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-gray-700">Key Features:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => handleCreateDocument(template.id)}
                className="w-full bg-charcoal-600 text-white py-2 px-4 rounded-lg hover:bg-charcoal-700 transition-colors flex items-center justify-center"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Document
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPeopleStrategyContent = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Phase 2 Development</h4>
            <p className="text-sm text-yellow-700 mt-1">
              People Strategy Documents are currently in development. These advanced templates will include 
              leadership frameworks, strategic planning tools, and organizational development resources.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {peopleStrategyTemplates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg shadow-sm opacity-75">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <template.icon className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                  {template.category}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-500 mb-2">{template.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{template.description}</p>
              
              <button
                disabled
                className="w-full bg-gray-100 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center"
              >
                <Clock className="w-4 h-4 mr-2" />
                Coming Soon
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDashboardBuilderContent = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Builder</h3>
        <p className="text-gray-500 mb-4">
          Advanced dashboard creation tools are planned for Phase 3 development.
        </p>
        <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-600 rounded-full">
          Future Release
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Content Studio</h1>
        <p className="text-gray-600">Generate AI-powered HR documents, policies, and strategic content</p>
      </div>

      {/* Feature Highlight */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Sparkles className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Intelligent Content Generation</h3>
            <p className="text-purple-700 mb-3">
              Leverage your uploaded knowledge base and company data to generate contextually relevant, 
              professional HR documents with built-in compliance checking and best practices.
            </p>
            <div className="flex items-center space-x-4 text-sm text-purple-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Multi-format output
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Version control
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Approval workflows
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
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
                      ? 'border-charcoal-500 text-charcoal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                  {getStatusBadge(tab.status)}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'hr-docs' && renderHRDocsContent()}
          {activeTab === 'people-strategy' && renderPeopleStrategyContent()}
          {activeTab === 'dashboard-builder' && renderDashboardBuilderContent()}
        </div>
      </div>
    </div>
  );
};

export default AiContentStudio;