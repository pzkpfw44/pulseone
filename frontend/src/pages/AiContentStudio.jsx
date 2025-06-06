// frontend/src/pages/AiContentStudio.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Users, TrendingUp, BookOpen, Settings, Briefcase,
  PlusCircle, Download, Eye, Clock, CheckCircle, AlertCircle,
  Sparkles, Brain, Target, Lightbulb, Zap, Globe, Shield,
  Scale, Languages, FileCheck, MessageSquare, ArrowRight,
  Loader2, Info, AlertTriangle, X, Building, UserCheck,
  HelpCircle, BarChart3, Coins, Activity, ChevronDown,
  ChevronUp, ThumbsUp, ThumbsDown, RefreshCw, Plus
} from 'lucide-react';
import api from '../services/api';
import DocumentViewer from '../components/ui/DocumentViewer';
import DocumentSelector from '../components/ui/DocumentSelector';
import AiDocumentSuggestions from '../components/ui/AiDocumentSuggestions';

const AiContentStudio = () => {
  const [activeTab, setActiveTab] = useState('hr-docs');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generation, setGeneration] = useState({
    loading: false,
    result: null,
    error: null
  });

  // Preview and download states
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Document selection states
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [documentAnalysis, setDocumentAnalysis] = useState(null);

  // AI features states
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [userContext, setUserContext] = useState({
    userId: 'system',
    preferences: null,
    history: []
  });
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  // Token estimation state
  const [estimatedTokens, setEstimatedTokens] = useState({ input: 0, output: 0, total: 0, cost: 0 });

  // Custom audience state
  const [customTargetAudience, setCustomTargetAudience] = useState('');

  // Generation form state with template-specific structure
  const [generationForm, setGenerationForm] = useState({
    template: null,
    // Common fields
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
      tone: 'formal',
      consultantConfidence: true
    },
    companyInfo: {
      name: '',
      industry: '',
      size: ''
    },
    // Template-specific fields
    jobDescription: {
      roleTitle: '',
      department: '',
      level: '',
      sector: '',
      keySkills: [],
      demographics: ''
    },
    companyPolicy: {
      policyType: '',
      legalRequirements: '',
      stakeholders: [],
      complianceLevel: 'high'
    },
    procedureDoc: {
      processName: '',
      processType: '',
      safetyLevel: '',
      workflowSteps: '',
      auditRequirements: ''
    },
    functionalBooklet: {
      mode: 'easy',
      organizationType: '',
      departmentCount: '',
      hierarchyLevels: '',
      decisionMaking: '',
      communicationFlow: '',
      selectedDocuments: []
    },
    customTargetAudience: ''
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

  // Updated template definitions
  const hrDocTemplates = [
    // HARD HR ACTIVITIES
    {
      id: 'policy-generator',
      title: 'Company Policy Generator',
      description: 'Generate comprehensive company policies with legal compliance checking',
      icon: Shield,
      category: 'Hard HR Activities',
      estimatedTime: '10-15 min',
      difficulty: 'High',
      features: ['Legal compliance checking', 'Multi-country support', 'Version control'],
      legalConsiderations: ['Labor law compliance', 'Data protection (GDPR)', 'Local regulations'],
      formFields: ['legalFramework', 'companyPolicy', 'targetAudience', 'context', 'output'],
      requiredFields: ['companyPolicy.policyType', 'legalFramework.country', 'targetAudience']
    },
    {
      id: 'procedure-docs',
      title: 'Procedure Documentation',
      description: 'Step-by-step process guides with legal compliance and audit trails',
      icon: BookOpen,
      category: 'Hard HR Activities',
      estimatedTime: '15-20 min',
      difficulty: 'High',
      features: ['Step-by-step guides', 'Visual workflows', 'Compliance checkpoints'],
      legalConsiderations: ['Audit trail requirements', 'Regulatory compliance', 'Safety standards'],
      formFields: ['procedureDoc', 'legalFramework', 'targetAudience', 'context', 'output'],
      requiredFields: ['procedureDoc.processName', 'procedureDoc.processType', 'targetAudience']
    },
    // SOFT HR ACTIVITIES
    {
      id: 'job-descriptions',
      title: 'Job Description Generator',
      description: 'Create detailed job descriptions with competency mapping and sector targeting',
      icon: Briefcase,
      category: 'Soft HR Activities',
      estimatedTime: '8-12 min',
      difficulty: 'Medium',
      features: ['Competency mapping', 'Sector targeting', 'Skills-focused approach'],
      legalConsiderations: ['Equal opportunity compliance', 'Fair hiring practices', 'Non-discrimination'],
      formFields: ['jobDescription', 'targetAudience', 'context', 'output'],
      requiredFields: ['jobDescription.roleTitle', 'jobDescription.sector', 'targetAudience']
    },
    {
      id: 'functional-booklet',
      title: 'Functional Organizational Booklet',
      description: 'Map organizational structure, roles, levels, and interactions with guided approach',
      icon: Building,
      category: 'Soft HR Activities',
      estimatedTime: '12-25 min',
      difficulty: 'Variable',
      features: ['Organizational mapping', 'Role relationships', 'Hierarchy visualization'],
      legalConsiderations: ['Organizational compliance', 'Role clarity', 'Reporting structures'],
      formFields: ['functionalBooklet', 'targetAudience', 'context', 'output'],
      requiredFields: ['functionalBooklet.mode', 'functionalBooklet.organizationType', 'targetAudience']
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
    { id: 'new_hires', label: 'New Hires', icon: PlusCircle },
    { id: 'hr_team', label: 'HR Team', icon: UserCheck }
  ];

  const skillsOptions = [
    'Leadership', 'Communication', 'Technical Skills', 'Project Management',
    'Data Analysis', 'Customer Service', 'Problem Solving', 'Team Collaboration',
    'Strategic Thinking', 'Digital Literacy', 'Compliance Knowledge', 'Languages'
  ];

  // Token estimation function
  const estimateTokenUsage = (formData) => {
    const charMultiplier = formData.output?.language === 'english' ? 0.25 : 0.33;
    
    let inputText = '';
    inputText += formData.context?.reasons || '';
    inputText += formData.context?.scope || '';
    inputText += formData.context?.additionalInfo || '';
    inputText += formData.companyPolicy?.legalRequirements || '';
    inputText += formData.legalFramework?.specificLaws || '';
    inputText += (formData.targetAudience || []).join(' ');
    inputText += formData.customTargetAudience || '';
    
    const inputTokens = Math.round(inputText.length * charMultiplier) + 500;

    const outputTokens = {
      brief: 1200,
      medium: 2500,
      detailed: 4000,
      comprehensive: 6500
    }[formData.output?.expectedLength] || 2500;

    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = (totalTokens / 1000) * 0.02;

    return {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
      cost: estimatedCost
    };
  };

  // Update estimation when form changes
  useEffect(() => {
    const tokens = estimateTokenUsage(generationForm);
    setEstimatedTokens(tokens);
  }, [generationForm]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setGenerationForm(prev => ({
      ...prev,
      template: template
    }));
    setShowGenerator(true);
  };

  const handleDocumentsSelected = async (documents) => {
    setSelectedDocuments(documents);
    
    if (documents.length > 0) {
      try {
        const response = await api.post('/ai-content-studio/analyze-documents', {
          documentIds: documents.map(d => d.id),
          templateId: selectedTemplate.id
        });
        
        if (response.data.success) {
          setDocumentAnalysis(response.data.analysis);
        }
      } catch (error) {
        console.error('Document analysis failed:', error);
      }
    } else {
      setDocumentAnalysis(null);
    }

    await updateAiSuggestions();
  };

  const handleAiSuggestionSelect = (document) => {
    const isSelected = selectedDocuments.some(d => d.id === document.id);
    
    if (isSelected) {
      const newDocs = selectedDocuments.filter(d => d.id !== document.id);
      handleDocumentsSelected(newDocs);
    } else {
      const newDocs = [...selectedDocuments, document];
      handleDocumentsSelected(newDocs);
    }
  };

  const updateAiSuggestions = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await api.post('/smart-rag/document-recommendations', {
        templateId: selectedTemplate.id,
        userContext,
        excludeDocuments: selectedDocuments.map(d => d.id),
        includeInsights: true
      });

      if (response.data.success) {
        setAiSuggestions(response.data.recommendations || []);
      }
    } catch (error) {
      console.error('Error updating AI suggestions:', error);
    }
  };

  const handleGenerateDocument = async () => {
    setGeneration({ loading: true, result: null, error: null });
    
    const startTime = Date.now();
    
    try {
      const response = await api.post('/ai-content-studio/generate', {
        ...generationForm,
        templateId: selectedTemplate.id,
        selectedDocuments: selectedDocuments.map(d => ({
          id: d.id,
          filename: d.originalName,
          category: d.category,
          summary: d.summary
        })),
        documentAnalysis,
        userContext,
        performanceTracking: true
      });

      if (response.data.success) {
        const generationTime = Date.now() - startTime;
        
        setGeneration({
          loading: false,
          result: response.data.result,
          error: null
        });

        setPerformanceMetrics({
          generationTime,
          tokenUsage: response.data.result.metadata.tokenUsage,
          qualityScore: response.data.result.metadata.qualityScore,
          documentsUsed: selectedDocuments.length
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

  const handleUserFeedback = async (feedbackData) => {
    try {
      await api.post('/smart-rag/user-feedback', {
        ...feedbackData,
        templateId: selectedTemplate.id,
        selectedDocuments,
        userContext
      });

      await updateAiSuggestions();
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  };

  const handleRemoveDocument = (documentId) => {
    const newDocs = selectedDocuments.filter(d => d.id !== documentId);
    handleDocumentsSelected(newDocs);
  };

  const handlePreviewDocument = () => {
    if (generation.result) {
      setShowPreview(true);
    }
  };

  const handleDownloadDocument = async (format = 'pdf') => {
    if (!generation.result) return;
    
    setDownloading(true);
    try {
      const response = await api.post('/ai-content-studio/download', {
        content: generation.result.content,
        metadata: generation.result.metadata,
        format: format
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${generation.result.metadata?.templateTitle || 'document'}.${format}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (generation.result.metadata?.id) {
        await api.post(`/ai-content-studio/track-download/${generation.result.metadata.id}`);
      }

    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
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

  const updateTemplateSpecificField = (templateKey, field, value) => {
    setGenerationForm(prev => ({
      ...prev,
      [templateKey]: {
        ...prev[templateKey],
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

  const toggleSkill = (skill) => {
    setGenerationForm(prev => ({
      ...prev,
      jobDescription: {
        ...prev.jobDescription,
        keySkills: prev.jobDescription.keySkills.includes(skill)
          ? prev.jobDescription.keySkills.filter(s => s !== skill)
          : [...prev.jobDescription.keySkills, skill]
      }
    }));
  };

  const validateForm = () => {
    if (!selectedTemplate) return { isValid: false, errors: [] };
    
    const errors = [];
    const required = selectedTemplate.requiredFields || [];
    
    required.forEach(fieldPath => {
      const [section, field] = fieldPath.split('.');
      if (section && field) {
        if (!generationForm[section] || !generationForm[section][field]) {
          errors.push(fieldPath);
        }
      } else if (!generationForm[fieldPath] || (Array.isArray(generationForm[fieldPath]) && generationForm[fieldPath].length === 0)) {
        errors.push(fieldPath);
      }
    });

    return { isValid: errors.length === 0, errors };
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

  const getDifficultyBadge = (difficulty) => {
    const badges = {
      'Low': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'High': 'bg-red-100 text-red-800',
      'Variable': 'bg-blue-100 text-blue-800'
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[difficulty]}`}>{difficulty}</span>;
  };

  const selectedCountry = countries.find(c => c.code === generationForm.legalFramework.country);

  // Render template-specific form sections
  const renderTemplateSpecificForm = () => {
    if (!selectedTemplate) return null;

    switch (selectedTemplate.id) {
      case 'job-descriptions':
        return (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Job Description Details</h3>
                <p className="text-sm text-gray-500">Specify role requirements and focus areas</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={generationForm.jobDescription.roleTitle}
                    onChange={(e) => updateTemplateSpecificField('jobDescription', 'roleTitle', e.target.value)}
                    placeholder="e.g., Senior Marketing Manager"
                    className="pulse-one-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={generationForm.jobDescription.department}
                    onChange={(e) => updateTemplateSpecificField('jobDescription', 'department', e.target.value)}
                    placeholder="e.g., Marketing, IT, Operations"
                    className="pulse-one-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sector <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={generationForm.jobDescription.sector}
                    onChange={(e) => updateTemplateSpecificField('jobDescription', 'sector', e.target.value)}
                    className="pulse-one-select"
                  >
                    <option value="">Select sector...</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="retail">Retail</option>
                    <option value="education">Education</option>
                    <option value="consulting">Consulting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={generationForm.jobDescription.level}
                    onChange={(e) => updateTemplateSpecificField('jobDescription', 'level', e.target.value)}
                    className="pulse-one-select"
                  >
                    <option value="">Select level...</option>
                    <option value="entry">Entry Level</option>
                    <option value="junior">Junior</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead/Principal</option>
                    <option value="management">Management</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Skills Focus</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {skillsOptions.map(skill => (
                    <label key={skill} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={generationForm.jobDescription.keySkills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                        className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Demographics & Diversity Considerations</label>
                <textarea
                  value={generationForm.jobDescription.demographics}
                  onChange={(e) => updateTemplateSpecificField('jobDescription', 'demographics', e.target.value)}
                  placeholder="e.g., Equal opportunity employer, flexible work arrangements, diversity initiatives..."
                  rows={2}
                  className="pulse-one-input"
                />
              </div>
            </div>
          </div>
        );

      case 'policy-generator':
        return (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Policy Configuration & Legal Framework</h3>
                <p className="text-sm text-gray-500">Define policy type, compliance requirements, and legal context</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Basic Policy Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={generationForm.companyPolicy.policyType}
                    onChange={(e) => updateTemplateSpecificField('companyPolicy', 'policyType', e.target.value)}
                    className="pulse-one-select"
                  >
                    <option value="">Select policy type...</option>
                    <option value="remote-work">Remote Work Policy</option>
                    <option value="code-of-conduct">Code of Conduct</option>
                    <option value="data-protection">Data Protection Policy</option>
                    <option value="health-safety">Health & Safety Policy</option>
                    <option value="disciplinary">Disciplinary Procedures</option>
                    <option value="leave-vacation">Leave & Vacation Policy</option>
                    <option value="anti-harassment">Anti-Harassment Policy</option>
                    <option value="expense-travel">Expense & Travel Policy</option>
                    <option value="social-media">Social Media Policy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country/Jurisdiction <span className="text-red-500">*</span>
                  </label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compliance Level</label>
                <select
                  value={generationForm.companyPolicy.complianceLevel}
                  onChange={(e) => updateTemplateSpecificField('companyPolicy', 'complianceLevel', e.target.value)}
                  className="pulse-one-select"
                >
                  <option value="basic">Basic Compliance</option>
                  <option value="standard">Standard Compliance</option>
                  <option value="high">High Compliance (Regulated Industries)</option>
                  <option value="maximum">Maximum Compliance (Financial/Healthcare)</option>
                </select>
              </div>

              {/* Legal Framework Integration */}
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

              {/* Enhanced Legal Requirements with Free Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Legal Requirements
                  <span className="text-sm font-normal text-gray-500 ml-2">(Select predefined or add custom)</span>
                </label>
                
                {/* Predefined Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                  {[
                    'GDPR Compliance', 'SOX Requirements', 'Industry-specific regulations',
                    'Data retention policies', 'Audit requirements', 'Safety standards'
                  ].map(requirement => (
                    <label key={requirement} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={generationForm.companyPolicy.legalRequirements.includes(requirement)}
                        onChange={(e) => {
                          const current = generationForm.companyPolicy.legalRequirements || '';
                          const requirements = current.split(',').map(s => s.trim()).filter(Boolean);
                          if (e.target.checked) {
                            if (!requirements.includes(requirement)) {
                              updateTemplateSpecificField('companyPolicy', 'legalRequirements', 
                                [...requirements, requirement].join(', '));
                            }
                          } else {
                            updateTemplateSpecificField('companyPolicy', 'legalRequirements', 
                              requirements.filter(r => r !== requirement).join(', '));
                          }
                        }}
                        className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{requirement}</span>
                    </label>
                  ))}
                </div>

                {/* Free Text Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Additional Custom Requirements (max 300 characters)
                  </label>
                  <textarea
                    value={generationForm.companyPolicy.legalRequirements}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        updateTemplateSpecificField('companyPolicy', 'legalRequirements', e.target.value);
                      }
                    }}
                    placeholder="e.g., Specific local regulations, company-specific compliance needs..."
                    rows={3}
                    maxLength={300}
                    className="pulse-one-input"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {(generationForm.companyPolicy.legalRequirements || '').length}/300 characters
                  </div>
                </div>
              </div>

              {/* Specific Laws/Regulations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific Laws/Regulations (Optional)
                </label>
                <textarea
                  value={generationForm.legalFramework.specificLaws}
                  onChange={(e) => updateFormField('legalFramework', 'specificLaws', e.target.value)}
                  placeholder="e.g., Article 2103 of Italian Civil Code, specific labor regulations..."
                  rows={2}
                  className="pulse-one-input"
                />
              </div>

              {/* CCNL for Italy */}
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

              {/* Key Stakeholders */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Stakeholders</label>
                <div className="grid grid-cols-2 gap-2">
                  {['HR Team', 'Legal Team', 'Management', 'Employee Representatives', 'Union Representatives', 'External Auditors'].map(stakeholder => (
                    <label key={stakeholder} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={generationForm.companyPolicy.stakeholders.includes(stakeholder)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateTemplateSpecificField('companyPolicy', 'stakeholders', [...generationForm.companyPolicy.stakeholders, stakeholder]);
                          } else {
                            updateTemplateSpecificField('companyPolicy', 'stakeholders', generationForm.companyPolicy.stakeholders.filter(s => s !== stakeholder));
                          }
                        }}
                        className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{stakeholder}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'procedure-docs':
        return (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Procedure Configuration</h3>
                <p className="text-sm text-gray-500">Define process details and compliance requirements</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Process Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={generationForm.procedureDoc.processName}
                    onChange={(e) => updateTemplateSpecificField('procedureDoc', 'processName', e.target.value)}
                    placeholder="e.g., Employee Onboarding, Performance Review"
                    className="pulse-one-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Process Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={generationForm.procedureDoc.processType}
                    onChange={(e) => updateTemplateSpecificField('procedureDoc', 'processType', e.target.value)}
                    className="pulse-one-select"
                  >
                    <option value="">Select type...</option>
                    <option value="hr-administrative">HR Administrative</option>
                    <option value="operational">Operational</option>
                    <option value="safety-security">Safety & Security</option>
                    <option value="compliance-audit">Compliance & Audit</option>
                    <option value="emergency">Emergency Procedures</option>
                    <option value="it-technical">IT & Technical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Safety/Risk Level</label>
                <select
                  value={generationForm.procedureDoc.safetyLevel}
                  onChange={(e) => updateTemplateSpecificField('procedureDoc', 'safetyLevel', e.target.value)}
                  className="pulse-one-select"
                >
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                  <option value="critical">Critical Safety</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Workflow Overview</label>
                <textarea
                  value={generationForm.procedureDoc.workflowSteps}
                  onChange={(e) => updateTemplateSpecificField('procedureDoc', 'workflowSteps', e.target.value)}
                  placeholder="Describe the main steps or workflow phases..."
                  rows={3}
                  className="pulse-one-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Audit & Documentation Requirements</label>
                <textarea
                  value={generationForm.procedureDoc.auditRequirements}
                  onChange={(e) => updateTemplateSpecificField('procedureDoc', 'auditRequirements', e.target.value)}
                  placeholder="e.g., Monthly reviews, documentation retention, approval workflows..."
                  rows={2}
                  className="pulse-one-input"
                />
              </div>
            </div>
          </div>
        );

      case 'functional-booklet':
        return (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Organizational Structure</h3>
                <p className="text-sm text-gray-500">Define your organization's structure and relationships</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Generation Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="functionalMode"
                      value="easy"
                      checked={generationForm.functionalBooklet.mode === 'easy'}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'mode', e.target.value)}
                      className="mt-1 border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900 flex items-center">
                        <HelpCircle className="w-4 h-4 mr-2 text-blue-500" />
                        Easy Mode (Guided)
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Answer guided questions about your organization
                      </div>
                      <div className="flex items-center mt-2 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        General templates - May require accuracy review
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="functionalMode"
                      value="advanced"
                      checked={generationForm.functionalBooklet.mode === 'advanced'}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'mode', e.target.value)}
                      className="mt-1 border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                    />
                    <div className="ml-3">
                      <div className="font-medium text-gray-900 flex items-center">
                        <FileText className="w-4 h-4 mr-2 text-green-500" />
                        Advanced Mode (Document-Based)
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Use your organizational documents for accuracy
                      </div>
                      <div className="text-xs text-green-600 mt-2">
                        Higher accuracy with document support
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Easy Mode Fields */}
              {generationForm.functionalBooklet.mode === 'easy' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-amber-900">Accuracy Notice</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Easy mode provides general organizational templates. For accurate mapping of your specific organization, 
                          consider using Advanced mode with your actual organizational documents.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={generationForm.functionalBooklet.organizationType}
                        onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'organizationType', e.target.value)}
                        className="pulse-one-select"
                      >
                        <option value="">Select type...</option>
                        <option value="startup">Startup (10-50 employees)</option>
                        <option value="small-business">Small Business (50-200 employees)</option>
                        <option value="medium-company">Medium Company (200-1000 employees)</option>
                        <option value="large-corporation">Large Corporation (1000+ employees)</option>
                        <option value="nonprofit">Non-Profit Organization</option>
                        <option value="government">Government/Public Sector</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Departments</label>
                      <select
                        value={generationForm.functionalBooklet.departmentCount}
                        onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'departmentCount', e.target.value)}
                        className="pulse-one-select"
                      >
                        <option value="">Select...</option>
                        <option value="2-5">2-5 departments</option>
                        <option value="6-10">6-10 departments</option>
                        <option value="11-20">11-20 departments</option>
                        <option value="20+">20+ departments</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hierarchy Levels</label>
                    <select
                      value={generationForm.functionalBooklet.hierarchyLevels}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'hierarchyLevels', e.target.value)}
                      className="pulse-one-select"
                    >
                      <option value="">Select hierarchy structure...</option>
                      <option value="flat">Flat (2-3 levels)</option>
                      <option value="moderate">Moderate (4-5 levels)</option>
                      <option value="traditional">Traditional (6+ levels)</option>
                      <option value="matrix">Matrix Organization</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decision Making Process</label>
                    <textarea
                      value={generationForm.functionalBooklet.decisionMaking}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'decisionMaking', e.target.value)}
                      placeholder="Describe how decisions are made (centralized, decentralized, committee-based...)"
                      rows={2}
                      className="pulse-one-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication Flow</label>
                    <textarea
                      value={generationForm.functionalBooklet.communicationFlow}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'communicationFlow', e.target.value)}
                      placeholder="Describe how information flows through the organization..."
                      rows={2}
                      className="pulse-one-input"
                    />
                  </div>
                </div>
              )}

              {/* Advanced Mode Fields */}
              {generationForm.functionalBooklet.mode === 'advanced' && (
                <div className="space-y-4 border-t pt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="font-medium text-green-900">Document-Enhanced Generation</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Select organizational documents from your library to ensure accurate mapping of your actual structure.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={generationForm.functionalBooklet.organizationType}
                      onChange={(e) => updateTemplateSpecificField('functionalBooklet', 'organizationType', e.target.value)}
                      className="pulse-one-select"
                    >
                      <option value="">Select type...</option>
                      <option value="startup">Startup</option>
                      <option value="small-business">Small Business</option>
                      <option value="medium-company">Medium Company</option>
                      <option value="large-corporation">Large Corporation</option>
                      <option value="nonprofit">Non-Profit Organization</option>
                      <option value="government">Government/Public Sector</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Supporting Documents
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Enhances accuracy with your organizational data)
                      </span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <button
                          type="button"
                          onClick={() => setShowDocumentSelector(true)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Browse and Select Documents
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          Recommended: Org charts, job descriptions, policy documents, meeting minutes
                        </p>
                      </div>
                      
                      {selectedDocuments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                            Selected Documents ({selectedDocuments.length})
                          </h4>
                          <div className="space-y-2">
                            {selectedDocuments.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-900">{doc.originalName}</span>
                                </div>
                                <button
                                  onClick={() => handleRemoveDocument(doc.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (showGenerator && selectedTemplate) {
    const validation = validateForm();

    return (
      <>
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
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">{selectedTemplate.category}</span>
                  {getDifficultyBadge(selectedTemplate.difficulty)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Template-specific form section */}
              {renderTemplateSpecificForm()}

              {/* Document Selection Section - Compact */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Document-Enhanced Generation</h3>
                      <p className="text-sm text-gray-500">Select documents to improve accuracy and context</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-semibold text-blue-900">{selectedDocuments.length}</div>
                      <div className="text-xs text-blue-600">Selected</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-semibold text-green-900">
                        {documentAnalysis ? Math.round(documentAnalysis.avgRelevance * 100) + '%' : '--'}
                      </div>
                      <div className="text-xs text-green-600">Relevance</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-lg font-semibold text-purple-900">
                        {performanceMetrics ? (performanceMetrics.generationTime / 1000).toFixed(1) + 's' : '--'}
                      </div>
                      <div className="text-xs text-purple-600">Last Gen</div>
                    </div>
                  </div>

                  {/* Document Selection Area - Compact */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                    {selectedDocuments.length === 0 ? (
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-3">No documents selected</p>
                        <button
                          type="button"
                          onClick={() => setShowDocumentSelector(true)}
                          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Browse Library
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">
                            Selected Documents ({selectedDocuments.length})
                          </h4>
                          <button
                            onClick={() => setShowDocumentSelector(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700"
                          >
                            Modify
                          </button>
                        </div>
                        
                        {/* Compact Document List */}
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedDocuments.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-indigo-50 rounded text-sm">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span className="text-indigo-900 truncate">{doc.originalName || doc.filename}</span>
                              </div>
                              <button
                                onClick={() => handleRemoveDocument(doc.id)}
                                className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Analysis Summary - Compact */}
                        {documentAnalysis && (
                          <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-700">
                                Avg. Relevance: <strong>{Math.round(documentAnalysis.avgRelevance * 100)}%</strong>
                              </span>
                              <span className="text-blue-700">
                                Coverage: <strong>{documentAnalysis.coverageAreas?.length || 0} areas</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Document Suggestions - Compact */}
              {selectedTemplate && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Brain className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">AI Document Suggestions</h3>
                        <p className="text-sm text-gray-500">Smart recommendations to improve your document</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {aiSuggestions.length} suggestions
                    </span>
                  </div>
                  
                  <div className="p-4">
                    <AiDocumentSuggestions
                      templateId={selectedTemplate.id}
                      userContext={userContext}
                      onDocumentSelect={handleAiSuggestionSelect}
                      selectedDocuments={selectedDocuments}
                      isVisible={true}
                      compact={true}
                    />
                  </div>
                </div>
              )}

              {/* Target Audience Section - Enhanced */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Target Audience <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-sm text-gray-500">Who will use or be affected by this document?</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  
                  {/* Predefined Audience Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Predefined Audiences</label>
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

                  {/* Custom Audience Input */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Custom Audience
                      <span className="text-sm font-normal text-gray-500 ml-2">(max 150 characters)</span>
                    </label>
                    <textarea
                      value={customTargetAudience}
                      onChange={(e) => {
                        if (e.target.value.length <= 150) {
                          setCustomTargetAudience(e.target.value);
                          const customId = 'custom_audience';
                          if (e.target.value.trim()) {
                            if (!generationForm.targetAudience.includes(customId)) {
                              setGenerationForm(prev => ({
                                ...prev,
                                targetAudience: [...prev.targetAudience, customId],
                                customTargetAudience: e.target.value
                              }));
                            } else {
                              setGenerationForm(prev => ({
                                ...prev,
                                customTargetAudience: e.target.value
                              }));
                            }
                          } else {
                            setGenerationForm(prev => ({
                              ...prev,
                              targetAudience: prev.targetAudience.filter(id => id !== customId),
                              customTargetAudience: ''
                            }));
                          }
                        }
                      }}
                      placeholder="e.g., Remote employees in specific regions, contractors, specific departments..."
                      rows={2}
                      maxLength={150}
                      className="pulse-one-input"
                    />
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                      <span>{customTargetAudience.length}/150 characters</span>
                      {customTargetAudience.trim() && (
                        <span className="text-green-600">✓ Custom audience added</span>
                      )}
                    </div>
                  </div>

                  {/* Summary of Selected Audiences */}
                  {generationForm.targetAudience.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border-t">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Audiences:</h4>
                      <div className="flex flex-wrap gap-2">
                        {generationForm.targetAudience.map(audienceId => {
                          if (audienceId === 'custom_audience') {
                            return customTargetAudience ? (
                              <span key={audienceId} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                Custom: {customTargetAudience.substring(0, 30)}{customTargetAudience.length > 30 ? '...' : ''}
                              </span>
                            ) : null;
                          }
                          const option = targetAudienceOptions.find(opt => opt.id === audienceId);
                          return option ? (
                            <span key={audienceId} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {option.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Context Section - Streamlined */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Context & Purpose</h3>
                    <p className="text-sm text-gray-500">Provide background to improve AI generation quality</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose & Reasons for Creating This Document
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
                      Scope & Coverage
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (What areas/activities does this document cover - different from target audience)
                      </span>
                    </label>
                    <textarea
                      value={generationForm.context.scope}
                      onChange={(e) => updateFormField('context', 'scope', e.target.value)}
                      placeholder="e.g., Applies to all remote work activities, covers data handling procedures, specific to Italian operations, includes vendor management..."
                      rows={2}
                      className="pulse-one-input"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      <strong>Tip:</strong> Scope defines WHAT is covered; Target Audience defines WHO it applies to
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Context & Special Requirements
                    </label>
                    <textarea
                      value={generationForm.context.additionalInfo}
                      onChange={(e) => updateFormField('context', 'additionalInfo', e.target.value)}
                      placeholder="Any other relevant information, special considerations, industry context, or unique requirements..."
                      rows={2}
                      className="pulse-one-input"
                    />
                  </div>
                </div>
              </div>

              {/* Output Configuration Section - Enhanced */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="flex items-center space-x-3 p-6 border-b border-gray-200">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Output Configuration & Estimation</h3>
                    <p className="text-sm text-gray-500">Define output format and view usage estimates</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  
                  {/* Language and Tone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={generationForm.output.language}
                        onChange={(e) => updateFormField('output', 'language', e.target.value)}
                        className="pulse-one-select"
                      >
                        <option value="italian">Italiano</option>
                        <option value="english">English</option>
                        <option value="german">Deutsch</option>
                        <option value="french">Français</option>
                        <option value="spanish">Español</option>
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

                  {/* Expected Length with Token Estimation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Expected Length & Token Estimation
                    </label>
                    <div className="space-y-3">
                      {[
                        { value: 'brief', label: 'Brief (1-2 pages)', description: 'Concise overview with key points', pages: '1-2', tokens: '~1,200' },
                        { value: 'medium', label: 'Standard (3-5 pages)', description: 'Comprehensive coverage with details', pages: '3-5', tokens: '~2,500' },
                        { value: 'detailed', label: 'Detailed (6-10 pages)', description: 'In-depth analysis with examples', pages: '6-10', tokens: '~4,000' },
                        { value: 'comprehensive', label: 'Comprehensive (10+ pages)', description: 'Complete documentation with appendices', pages: '10+', tokens: '~6,500' }
                      ].map(option => (
                        <label key={option.value} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 relative">
                          <input
                            type="radio"
                            name="expectedLength"
                            value={option.value}
                            checked={generationForm.output.expectedLength === option.value}
                            onChange={(e) => updateFormField('output', 'expectedLength', e.target.value)}
                            className="mt-1 border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-gray-700">{option.label}</div>
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {option.tokens} tokens
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                            <div className="text-xs text-blue-600 mt-1">{option.pages} pages estimated</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Current Estimation Panel */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-blue-900 flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Current Estimation
                      </h4>
                      <button 
                        onClick={() => setEstimatedTokens(estimateTokenUsage(generationForm))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-blue-600 font-medium">Input Tokens</div>
                        <div className="text-blue-900 font-semibold">{estimatedTokens.input.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 font-medium">Output Tokens</div>
                        <div className="text-blue-900 font-semibold">{estimatedTokens.output.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 font-medium">Total Tokens</div>
                        <div className="text-blue-900 font-semibold">{estimatedTokens.total.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 font-medium">Est. Cost</div>
                        <div className="text-blue-900 font-semibold">${estimatedTokens.cost.toFixed(3)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-700 mt-2">
                      <Info className="w-3 h-3 inline mr-1" />
                      Estimates are approximate. Actual usage may vary based on content complexity.
                    </div>
                  </div>

                  {/* Consultant Features */}
                  <div className="space-y-3">
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
                        AI will explain why certain approaches were chosen and provide implementation guidance (+15% tokens)
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={generationForm.output.consultantConfidence}
                          onChange={(e) => updateFormField('output', 'consultantConfidence', e.target.checked)}
                          className="rounded border-gray-300 text-charcoal-600 focus:ring-charcoal-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Show confidence percentages for recommendations
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Display AI confidence levels (e.g., 85%) for each section and recommendation (+5% tokens)
                      </p>
                    </div>
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
                    <span className="font-medium text-gray-700">Difficulty:</span>
                    <span className="ml-2">{getDifficultyBadge(selectedTemplate.difficulty)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Features:</span>
                    <ul className="mt-1 space-y-1">
                      {selectedTemplate.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-600 flex items-center">
                          <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                          {feature}
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
                      
                      {/* Token Usage Display */}
                      {generation.result.metadata?.tokenUsage && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <div className="flex items-center">
                              <Activity className="w-3 h-3 mr-1" />
                              Token Usage
                            </div>
                            <div className="flex items-center space-x-3">
                              {generation.result.metadata.tokenUsage.prompt_tokens && (
                                <span>Input: {generation.result.metadata.tokenUsage.prompt_tokens}</span>
                              )}
                              {generation.result.metadata.tokenUsage.completion_tokens && (
                                <span>Output: {generation.result.metadata.tokenUsage.completion_tokens}</span>
                              )}
                              {generation.result.metadata.tokenUsage.total_tokens && (
                                <span className="font-medium">Total: {generation.result.metadata.tokenUsage.total_tokens}</span>
                              )}
                            </div>
                          </div>
                          {generation.result.metadata.generationTime && (
                            <div className="text-xs text-gray-500 mt-1">
                              Generated in {generation.result.metadata.generationTime}ms
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 space-y-2">
                        <button 
                          onClick={() => handleDownloadDocument('pdf')}
                          disabled={downloading}
                          className="btn-brand-primary text-sm w-full disabled:opacity-50"
                        >
                          {downloading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download PDF
                        </button>
                        <button 
                          onClick={handlePreviewDocument}
                          className="btn-brand-outline text-sm w-full"
                        >
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
                disabled={generation.loading || !validation.isValid}
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
              {!validation.isValid && (
                <div className="text-sm text-amber-600">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Please complete required fields:
                  </div>
                  <ul className="text-xs space-y-1 ml-6">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error.replace(/([A-Z])/g, ' $1').replace('.', ' → ')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Document Viewer Modal */}
        <DocumentViewer
          document={generation.result}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownloadDocument}
        />

        {/* Document Selector Modal */}
        <DocumentSelector
          isOpen={showDocumentSelector}
          onClose={() => setShowDocumentSelector(false)}
          onDocumentsSelected={handleDocumentsSelected}
          selectedDocuments={selectedDocuments}
          templateId={selectedTemplate?.id}
        />
      </>
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
              Generate HR documents that comply with local laws and regulations. Features template-specific forms, 
              consultant confidence levels, and enhanced token tracking for optimal results.
            </p>
            <div className="flex items-center space-x-4 text-sm text-purple-600">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Template-specific forms
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Confidence percentages
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Token usage tracking
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
            <div className="space-y-8">
              {/* Hard HR Activities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-red-600" />
                  Hard HR Activities
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Legal compliance focused)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hrDocTemplates.filter(t => t.category === 'Hard HR Activities').map((template) => (
                    <div key={template.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-charcoal-100 rounded-lg">
                            <template.icon className="w-5 h-5 text-charcoal-600" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {template.category}
                            </span>
                            {getDifficultyBadge(template.difficulty)}
                          </div>
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

              {/* Soft HR Activities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Soft HR Activities
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    (Skills and organization focused)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {hrDocTemplates.filter(t => t.category === 'Soft HR Activities').map((template) => (
                    <div key={template.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-2 bg-charcoal-100 rounded-lg">
                            <template.icon className="w-5 h-5 text-charcoal-600" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {template.category}
                            </span>
                            {getDifficultyBadge(template.difficulty)}
                          </div>
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