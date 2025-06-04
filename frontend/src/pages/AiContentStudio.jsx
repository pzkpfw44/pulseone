// frontend/src/pages/AiContentStudio.jsx - Enhanced Version
import React, { useState, useEffect } from 'react';
import { 
  FileText, Users, TrendingUp, BookOpen, Settings, Briefcase,
  PlusCircle, Download, Eye, Clock, CheckCircle, AlertCircle,
  Sparkles, Brain, Target, Lightbulb, Zap, Globe, Shield,
  Scale, Languages, FileCheck, MessageSquare, ArrowRight,
  Loader2, Info, AlertTriangle, X
} from 'lucide-react';
import api from '../services/api';

const AiContentStudio = () => {
  const [activeTab, setActiveTab] = useState('hr-docs');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generation, setGeneration] = useState({
    loading: false,
    result: null,
    error: null
  });

  // Generation form state
  const [generationForm, setGenerationForm] = useState({
    template: null,
    legalFramework: {
      country: 'IT',
      specificLaws: '',
      collectiveAgreements: ''
    },
    targetAudience: [],
    context: {
      reasons: '',
      scope: '',
      additionalInfo: ''
    },
    output: {
      language: 'italian',
      expectedLength: 'medium',
      includeExplanation: true,
      tone: 'formal'
    },
    companyInfo: {
      name: '',
      industry: '',
      size: ''
    }
  });

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
      title: 'Company Policy Generator',
      description: 'Generate comprehensive company policies with legal compliance checking',
      icon: Shield,
      category: 'Policies',
      estimatedTime: '10-15 min',
      features: ['Legal compliance checking', 'Multi-country support', 'Version control'],
      legalConsiderations: ['Labor law compliance', 'Data protection (GDPR)', 'Local regulations'],
      prompts: {
        main: 'Create a comprehensive company policy for {topic} that complies with {country} labor laws',
        legal: 'Ensure compliance with {specificLaws} and consider {collectiveAgreements}',
        audience: 'This policy will be communicated to {targetAudience}'
      }
    },
    {
      id: 'job-descriptions',
      title: 'Job Description Generator',
      description: 'Create detailed job descriptions with competency mapping and legal compliance',
      icon: Briefcase,
      category: 'Recruitment',
      estimatedTime: '8-12 min',
      features: ['Competency mapping', 'Salary benchmarking', 'Anti-discrimination compliance'],
      legalConsiderations: ['Equal opportunity compliance', 'Fair hiring practices', 'Salary transparency laws'],
      prompts: {
        main: 'Create a detailed job description for {role} position in {industry}',
        legal: 'Ensure compliance with {country} employment laws and anti-discrimination regulations',
        audience: 'This will be used for {targetAudience} recruitment process'
      }
    },
    {
      id: 'procedure-docs',
      title: 'Procedure Documentation',
      description: 'Step-by-step process guides with legal compliance and audit trails',
      icon: BookOpen,
      category: 'Operations',
      estimatedTime: '15-20 min',
      features: ['Step-by-step guides', 'Visual workflows', 'Compliance checkpoints'],
      legalConsiderations: ['Audit trail requirements', 'Regulatory compliance', 'Safety standards'],
      prompts: {
        main: 'Create a detailed procedure for {process} following {country} regulatory standards',
        legal: 'Include mandatory compliance checkpoints for {specificLaws}',
        audience: 'This procedure will be used by {targetAudience}'
      }
    },
    {
      id: 'collective-agreement',
      title: 'Collective Agreement Analysis',
      description: 'Analyze and implement collective bargaining agreements (Contratti Collettivi)',
      icon: Scale,
      category: 'Legal Compliance',
      estimatedTime: '20-30 min',
      features: ['CCNL analysis', 'Implementation guide', 'Compliance mapping'],
      legalConsiderations: ['Collective bargaining law', 'Union agreements', 'Worker rights'],
      prompts: {
        main: 'Analyze the collective agreement {agreementName} and create implementation guidelines',
        legal: 'Ensure full compliance with {country} collective bargaining laws',
        audience: 'This will be used by {targetAudience} for implementation'
      }
    }
  ];

  const countries = [
    { code: 'IT', name: 'Italy', laws: ['Statuto dei Lavoratori', 'Codice Civile', 'D.Lgs. 81/2008'] },
    { code: 'US', name: 'United States', laws: ['FLSA', 'Title VII', 'ADA', 'FMLA'] },
    { code: 'UK', name: 'United Kingdom', laws: ['Employment Rights Act', 'Equality Act', 'GDPR UK'] },
    { code: 'DE', name: 'Germany', laws: ['Arbeitsgesetzbuch', 'Betriebsverfassungsgesetz', 'DSGVO'] },
    { code: 'FR', name: 'France', laws: ['Code du travail', 'RGPD', 'Loi El Khomri'] }
  ];

  const targetAudienceOptions = [
    { id: 'all_employees', label: 'All Employees', icon: Users },
    { id: 'management', label: 'Management Team', icon: Target },
    { id: 'unions', label: 'Union Representatives', icon: Scale },
    { id: 'external_partners', label: 'External Partners', icon: Globe },
    { id: 'regulatory_bodies', label: 'Regulatory Bodies', icon: Shield },
    { id: 'new_hires', label: 'New Hires', icon: PlusCircle }
  ];

  const languages = [
    { code: 'italian', name: 'Italiano' },
    { code: 'english', name: 'English' },
    { code: 'german', name: 'Deutsch' },
    { code: 'french', name: 'Français' },
    { code: 'spanish', name: 'Español' }
  ];

  const lengthOptions = [
    { value: 'brief', label: 'Brief (1-2 pages)', description: 'Concise overview with key points' },
    { value: 'medium', label: 'Standard (3-5 pages)', description: 'Comprehensive coverage with details' },
    { value: 'detailed', label: 'Detailed (6-10 pages)', description: 'In-depth analysis with examples' },
    { value: 'comprehensive', label: 'Comprehensive (10+ pages)', description: 'Complete documentation with appendices' }
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setGenerationForm(prev => ({
      ...prev,
      template: template
    }));
    setShowGenerator(true);
  };

  const handleGenerateDocument = async () => {
    setGeneration({ loading: true, result: null, error: null });
    
    try {
      const response = await api.post('/ai-content-studio/generate', {
        ...generationForm,
        templateId: selectedTemplate.id
      });

      if (response.data.success) {
        setGeneration({
          loading: false,
          result: response.data.result,
          error: null
        });
      } else {
        setGeneration({
          loading: false,
          result: null,
          error: response.data.error || 'Generation failed'
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGeneration({
        loading: false,
        result: null,
        error: error.response?.data?.error || 'Failed to generate document'
      });
    }
  };

  const updateFormField = (section, field, value) => {
    setGenerationForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const toggleTargetAudience = (audienceId) => {
    setGenerationForm(prev => ({
      ...prev,
      targetAudience: prev.targetAudience.includes(audienceId)
        ? prev.targetAudience.filter(id => id !== audienceId)
        : [...prev.targetAudience, audienceId]
    }));
  };

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

  const selectedCountry = countries.find(c => c.code === generationForm.legalFramework.country);

  if (showGenerator && selectedTemplate) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setShowGenerator(false);
                setSelectedTemplate(null);
                setGeneration({ loading: false, result: null, error: null });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.title}</h1>
              <p className="text-gray-600">{selectedTemplate.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Legal Framework Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Scale className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Legal Framework</h3>
                  <p className="text-sm text-gray-500">Specify the legal context and compliance requirements</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country/Jurisdiction</label>
                  <select
                    value={generationForm.legalFramework.country}
                    onChange={(e) => updateFormField('legalFramework', 'country', e.target.value)}
                    className="pulse-one-select"
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedCountry && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Relevant Laws for {selectedCountry.name}:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCountry.laws.map((law, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {law}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Specific Laws/Regulations
                  </label>
                  <textarea
                    value={generationForm.legalFramework.specificLaws}
                    onChange={(e) => updateFormField('legalFramework', 'specificLaws', e.target.value)}
                    placeholder="e.g., Article 2103 of Italian Civil Code, specific labor regulations..."
                    rows={3}
                    className="pulse-one-input"
                  />
                </div>

                {generationForm.legalFramework.country === 'IT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contratti Collettivi (CCNL)
                    </label>
                    <textarea
                      value={generationForm.legalFramework.collectiveAgreements}
                      onChange={(e) => updateFormField('legalFramework', 'collectiveAgreements', e.target.value)}
                      placeholder="e.g., CCNL Commercio, CCNL Metalmeccanici, specific collective agreements..."
                      rows={2}
                      className="pulse-one-input"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Target Audience Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Target Audience</h3>
                  <p className="text-sm text-gray-500">Who will use or be affected by this document?</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {targetAudienceOptions.map(option => (
                    <label key={option.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={generationForm.targetAudience.includes(option.id)}
                        onChange={() => toggleTargetAudience(option.id)}
                        className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                      />
                      <option.icon className="w-4 h-4 ml-3 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Context Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Context & Purpose</h3>
                  <p className="text-sm text-gray-500">Provide background information to improve AI generation</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reasons for Creating This Document
                  </label>
                  <textarea
                    value={generationForm.context.reasons}
                    onChange={(e) => updateFormField('context', 'reasons', e.target.value)}
                    placeholder="e.g., Compliance with new regulations, response to workplace incidents, organizational restructuring..."
                    rows={3}
                    className="pulse-one-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scope and Coverage
                  </label>
                  <textarea
                    value={generationForm.context.scope}
                    onChange={(e) => updateFormField('context', 'scope', e.target.value)}
                    placeholder="e.g., Applies to all full-time employees, covers remote work policies, specific to Italian operations..."
                    rows={2}
                    className="pulse-one-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    value={generationForm.context.additionalInfo}
                    onChange={(e) => updateFormField('context', 'additionalInfo', e.target.value)}
                    placeholder="Any other relevant information, special considerations, or requirements..."
                    rows={2}
                    className="pulse-one-input"
                  />
                </div>
              </div>
            </div>

            {/* Output Configuration Section */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Output Configuration</h3>
                  <p className="text-sm text-gray-500">Define how the document should be generated</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={generationForm.output.language}
                      onChange={(e) => updateFormField('output', 'language', e.target.value)}
                      className="pulse-one-select"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                    <select
                      value={generationForm.output.tone}
                      onChange={(e) => updateFormField('output', 'tone', e.target.value)}
                      className="pulse-one-select"
                    >
                      <option value="formal">Formal/Legal</option>
                      <option value="professional">Professional</option>
                      <option value="accessible">Accessible/Clear</option>
                      <option value="authoritative">Authoritative</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Length</label>
                  <div className="space-y-2">
                    {lengthOptions.map(option => (
                      <label key={option.value} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="expectedLength"
                          value={option.value}
                          checked={generationForm.output.expectedLength === option.value}
                          onChange={(e) => updateFormField('output', 'expectedLength', e.target.value)}
                          className="mt-1 border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-700">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={generationForm.output.includeExplanation}
                      onChange={(e) => updateFormField('output', 'includeExplanation', e.target.checked)}
                      className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Include consultant-style explanations and reasoning
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    AI will explain why certain approaches were chosen and provide implementation guidance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview & Actions Panel */}
          <div className="space-y-6">
            {/* Template Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <selectedTemplate.icon className="w-6 h-6 text-charcoal-600" />
                <h3 className="font-medium text-gray-900">{selectedTemplate.title}</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="ml-2 text-gray-600">{selectedTemplate.category}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Est. Time:</span>
                  <span className="ml-2 text-gray-600">{selectedTemplate.estimatedTime}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Legal Considerations:</span>
                  <ul className="mt-1 space-y-1">
                    {selectedTemplate.legalConsiderations.map((consideration, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-center">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                        {consideration}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Generation Status */}
            {generation.loading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <h4 className="font-medium text-blue-900">Generating Document...</h4>
                    <p className="text-sm text-blue-700">AI is analyzing your requirements and generating content</p>
                  </div>
                </div>
              </div>
            )}

            {generation.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Generation Failed</h4>
                    <p className="text-sm text-red-700 mt-1">{generation.error}</p>
                  </div>
                </div>
              </div>
            )}

            {generation.result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900">Document Generated</h4>
                    <p className="text-sm text-green-700 mt-1">Your document is ready for review</p>
                    <div className="mt-3 space-y-2">
                      <button className="btn-brand-primary text-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </button>
                      <button className="btn-brand-outline text-sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerateDocument}
              disabled={generation.loading || generationForm.targetAudience.length === 0}
              className="w-full btn-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generation.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Document
                </>
              )}
            </button>

            {/* Validation Messages */}
            {generationForm.targetAudience.length === 0 && (
              <div className="text-sm text-amber-600 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Please select at least one target audience
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main template selection view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Content Studio</h1>
        <p className="text-gray-600">Generate AI-powered HR documents with legal compliance and local law integration</p>
      </div>

      {/* Enhanced Feature Highlight */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Scale className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Legal-Compliant Content Generation</h3>
            <p className="text-purple-700 mb-3">
              Generate HR documents that comply with local laws and regulations. Supports Italian collective agreements (CCNL), 
              EU labor laws, and multi-country legal frameworks with consultant-style explanations.
            </p>
            <div className="flex items-center space-x-4 text-sm text-purple-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Multi-country legal compliance
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                CCNL integration (Italy)
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Consultant explanations
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Multi-language output
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
          {activeTab === 'hr-docs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hrDocTemplates.map((template) => (
                  <div key={template.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-charcoal-100 rounded-lg">
                          <template.icon className="w-5 h-5 text-charcoal-600" />
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

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-medium text-gray-700">Legal Considerations:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {template.legalConsiderations.map((consideration, index) => (
                            <li key={index} className="flex items-center">
                              <Scale className="w-3 h-3 text-red-500 mr-2" />
                              {consideration}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <button
                        onClick={() => handleTemplateSelect(template)}
                        className="w-full bg-charcoal-600 text-white py-2 px-4 rounded-lg hover:bg-charcoal-700 transition-colors flex items-center justify-center"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Start Generation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'people-strategy' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-yellow-600 mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">Phase 2 Development</h3>
              <p className="text-yellow-700">
                People Strategy Documents are currently in development and will include advanced 
                legal compliance features for strategic HR planning.
              </p>
            </div>
          )}

          {activeTab === 'dashboard-builder' && (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AiContentStudio;