// backend/routes/ai-content-studio.routes.js - Phase 1 Implementation
const express = require('express');
const router = express.Router();
const { makeAiChatRequest } = require('../services/flux-ai.service');
const ragService = require('../services/enhanced-rag.service');
const fluxAiConfig = require('../config/flux-ai');
const { AiGenerationHistory } = require('../models');
const PDFDocument = require('pdfkit');
const { Document: DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

// Legal framework definitions
const legalFrameworks = {
  IT: {
    name: 'Italy',
    commonLaws: [
      'Statuto dei Lavoratori (L. 300/1970)',
      'Codice Civile - Libro V',
      'D.Lgs. 81/2008 (Sicurezza sul Lavoro)',
      'D.Lgs. 198/2006 (Pari Opportunità)',
      'L. 92/2012 (Riforma Fornero)'
    ],
    ccnlTypes: [
      'CCNL Commercio',
      'CCNL Metalmeccanici',
      'CCNL Edilizia',
      'CCNL Sanità Privata',
      'CCNL Turismo'
    ],
    legalPrompts: {
      policy: 'Assicurati che la policy rispetti la normativa italiana del lavoro, in particolare lo Statuto dei Lavoratori e i principi costituzionali di libertà e dignità del lavoratore.',
      procedure: 'Include riferimenti alle normative sulla sicurezza sul lavoro (D.Lgs. 81/2008) e alle procedure di consultazione sindacale previste dalla legge.',
      jobDescription: 'Rispetta i principi di non discriminazione (D.Lgs. 198/2006) e le disposizioni sui contratti di lavoro del Codice Civile.',
      functionalBooklet: 'Assicurati che la struttura organizzativa rispetti i principi di trasparenza e i diritti di informazione dei lavoratori.'
    }
  },
  US: {
    name: 'United States',
    commonLaws: [
      'Fair Labor Standards Act (FLSA)',
      'Title VII of the Civil Rights Act',
      'Americans with Disabilities Act (ADA)',
      'Family and Medical Leave Act (FMLA)',
      'Equal Employment Opportunity laws'
    ],
    legalPrompts: {
      policy: 'Ensure compliance with federal employment laws, particularly Title VII anti-discrimination provisions and state-specific employment regulations.',
      procedure: 'Include OSHA safety requirements and ensure procedures comply with federal and state employment standards.',
      jobDescription: 'Comply with ADA requirements for reasonable accommodations and EEOC guidelines for non-discriminatory hiring practices.',
      functionalBooklet: 'Ensure organizational structures comply with federal employment laws and equal opportunity requirements.'
    }
  },
  DE: {
    name: 'Germany',
    commonLaws: [
      'Arbeitsgesetzbuch (ArbGB)',
      'Betriebsverfassungsgesetz (BetrVG)',
      'Allgemeines Gleichbehandlungsgesetz (AGG)',
      'Arbeitsschutzgesetz (ArbSchG)',
      'Datenschutz-Grundverordnung (DSGVO)'
    ],
    legalPrompts: {
      policy: 'Berücksichtigen Sie das deutsche Arbeitsrecht, insbesondere das Betriebsverfassungsgesetz und die Mitbestimmungsrechte der Arbeitnehmer.',
      procedure: 'Beachten Sie die Arbeitsschutzbestimmungen und die Beteiligung des Betriebsrats bei Verfahrensänderungen.',
      jobDescription: 'Stellen Sie die Einhaltung des AGG sicher und berücksichtigen Sie die deutschen Arbeitsvertragsstandards.',
      functionalBooklet: 'Berücksichtigen Sie die deutschen Mitbestimmungsgesetze und die Rolle der Betriebsräte in der Organisationsstruktur.'
    }
  }
};

// Updated template definitions with Phase 1 restructuring
const documentTemplates = {
  'policy-generator': {
    systemPrompt: `You are an expert HR policy consultant specializing in creating legally compliant company policies. You must:

1. Create comprehensive, legally sound policies that comply with specified jurisdictions
2. Include clear implementation guidance and explanations
3. Provide consultant-style reasoning with confidence percentages for policy decisions
4. Ensure language is appropriate for the target audience
5. Include practical examples and scenarios where helpful

**CONFIDENCE SCORING**: For each major section or recommendation, provide a confidence percentage (e.g., "Confidence: 85%") indicating how certain you are about the approach based on legal requirements and best practices.`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output, companyPolicy } = formData;
      const framework = legalFrameworks[legalFramework.country];
      
      let prompt = `Create a comprehensive ${companyPolicy.policyType} policy document with the following specifications:

**POLICY CONFIGURATION:**
- Policy Type: ${companyPolicy.policyType}
- Compliance Level: ${companyPolicy.complianceLevel}
- Stakeholders: ${companyPolicy.stakeholders.join(', ')}
- Legal Requirements: ${companyPolicy.legalRequirements}

**LEGAL FRAMEWORK:**
- Country: ${framework?.name || legalFramework.country}
- Applicable Laws: ${legalFramework.specificLaws || (framework?.commonLaws.join(', ') || 'Standard employment laws')}`;

      if (legalFramework.collectiveAgreements) {
        prompt += `\n- Collective Agreements: ${legalFramework.collectiveAgreements}`;
      }

      prompt += `\n
**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**CONTEXT & PURPOSE:**
- Reasons: ${context.reasons}
- Scope: ${context.scope}
- Additional Info: ${context.additionalInfo}

**OUTPUT REQUIREMENTS:**
- Language: ${output.language}
- Length: ${output.expectedLength}
- Tone: ${output.tone}
- Include Explanations: ${output.includeExplanation ? 'Yes' : 'No'}
- Show Confidence Levels: ${output.consultantConfidence ? 'Yes' : 'No'}

**LEGAL COMPLIANCE REQUIREMENTS:**
${framework?.legalPrompts?.policy || 'Ensure compliance with local employment laws and regulations.'}

**DOCUMENT STRUCTURE REQUIRED:**
1. Policy Title and Purpose ${output.consultantConfidence ? '(with confidence rating)' : ''}
2. Scope and Applicability
3. Legal Framework and Compliance
4. Policy Details and Procedures
5. Implementation Guidelines
6. Responsibilities and Accountability
7. Review and Amendment Process

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS REQUIRED:**
For each section, explain:
- Why this approach was chosen ${output.consultantConfidence ? '(with confidence %)' : ''}
- Legal reasoning behind specific clauses
- Implementation best practices
- Potential risks and mitigation strategies
- How this compares to industry standards
` : ''}

${output.consultantConfidence ? `
**CONFIDENCE SCORING:**
For each major recommendation or section, include confidence percentages like:
- "Recommendation confidence: 92%" for high-certainty legal requirements
- "Implementation confidence: 78%" for suggested procedures
- Overall section confidence ratings based on legal certainty and best practices
` : ''}

Generate a professional, legally compliant policy document that addresses all requirements above.`;

      return prompt;
    }
  },

  'job-descriptions': {
    systemPrompt: `You are an expert HR consultant specializing in creating legally compliant job descriptions. You must:

1. Create comprehensive job descriptions that comply with employment laws
2. Ensure non-discriminatory language and equal opportunity compliance
3. Include clear competency frameworks and requirements tailored to the specified sector
4. Provide implementation guidance for hiring managers
5. Explain legal considerations and best practices with confidence ratings

**CONFIDENCE SCORING**: Provide confidence percentages for skill requirements, qualification levels, and legal compliance recommendations.`,

    generatePrompt: (formData) => {
      const { targetAudience, context, output, jobDescription } = formData;
      
      return `Create a comprehensive job description with the following specifications:

**JOB DESCRIPTION CONFIGURATION:**
- Role Title: ${jobDescription.roleTitle}
- Department: ${jobDescription.department}
- Level: ${jobDescription.level}
- Sector: ${jobDescription.sector}
- Key Skills Focus: ${jobDescription.keySkills.join(', ')}
- Demographics Considerations: ${jobDescription.demographics}

**JOB DETAILS:**
- Position Context: ${context.reasons}
- Role Scope: ${context.scope}
- Special Requirements: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**OUTPUT REQUIREMENTS:**
- Language: ${output.language}
- Length: ${output.expectedLength}
- Tone: ${output.tone}
- Include Explanations: ${output.includeExplanation ? 'Yes' : 'No'}
- Show Confidence Levels: ${output.consultantConfidence ? 'Yes' : 'No'}

**REQUIRED SECTIONS:**
1. Job Title and Department
2. Position Summary
3. Key Responsibilities and Duties
4. Required Qualifications and Skills
5. Preferred Qualifications
6. Competency Framework (sector-specific)
7. Working Conditions and Physical Requirements
8. Compensation and Benefits Overview
9. Equal Opportunity Statement
10. Application Process

**SECTOR-SPECIFIC FOCUS:**
Tailor the job description for the ${jobDescription.sector} sector, including:
- Industry-specific skills and terminology
- Sector-relevant competencies and qualifications
- Market-standard requirements for this sector
- Career progression paths typical in ${jobDescription.sector}

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
- Legal compliance reasoning ${output.consultantConfidence ? '(with confidence %)' : ''}
- Competency selection rationale for ${jobDescription.sector} sector
- Industry benchmarking insights
- Implementation recommendations
` : ''}

${output.consultantConfidence ? `
**CONFIDENCE SCORING:**
Include confidence percentages for:
- Required vs. preferred qualifications (e.g., "Requirement confidence: 88%")
- Skills prioritization for the sector
- Compensation guidance accuracy
- Legal compliance completeness
` : ''}

Ensure full compliance with anti-discrimination laws and equal opportunity requirements while being sector-appropriate.`;
    }
  },

  'procedure-docs': {
    systemPrompt: `You are an expert process consultant specializing in creating legally compliant operational procedures. You must:

1. Create clear, step-by-step procedures that ensure compliance
2. Include necessary audit trails and documentation requirements
3. Provide implementation guidance and training recommendations
4. Ensure procedures meet regulatory and safety standards
5. Explain the rationale behind each procedural step with confidence ratings

**CONFIDENCE SCORING**: Provide confidence levels for safety requirements, compliance steps, and implementation recommendations.`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output, procedureDoc } = formData;
      const framework = legalFrameworks[legalFramework.country];
      
      return `Create a comprehensive procedure document with the following specifications:

**PROCEDURE CONFIGURATION:**
- Process Name: ${procedureDoc.processName}
- Process Type: ${procedureDoc.processType}
- Safety/Risk Level: ${procedureDoc.safetyLevel}
- Workflow Overview: ${procedureDoc.workflowSteps}
- Audit Requirements: ${procedureDoc.auditRequirements}

**LEGAL FRAMEWORK:**
- Country: ${framework?.name || legalFramework.country}
- Regulatory Compliance: ${framework?.legalPrompts?.procedure || 'Ensure compliance with operational and safety regulations'}
- Specific Laws: ${legalFramework.specificLaws}

**PROCEDURE DETAILS:**
- Purpose: ${context.reasons}
- Scope: ${context.scope}
- Additional Context: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**OUTPUT REQUIREMENTS:**
- Language: ${output.language}
- Length: ${output.expectedLength}
- Tone: ${output.tone}
- Include Explanations: ${output.includeExplanation ? 'Yes' : 'No'}
- Show Confidence Levels: ${output.consultantConfidence ? 'Yes' : 'No'}

**REQUIRED STRUCTURE:**
1. Procedure Title and Identifier
2. Purpose and Scope
3. Legal and Regulatory Framework
4. Roles and Responsibilities
5. Step-by-Step Procedure (detailed for ${procedureDoc.safetyLevel} risk level)
6. Documentation Requirements
7. Compliance Checkpoints
8. Training Requirements
9. Review and Update Process
10. Related Procedures and References

**PROCESS TYPE SPECIFIC REQUIREMENTS:**
Tailor the procedure for ${procedureDoc.processType} with:
- Type-specific regulatory requirements
- Appropriate documentation levels for ${procedureDoc.safetyLevel} risk
- Industry-standard practices for ${procedureDoc.processType}

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
- Regulatory reasoning for each step ${output.consultantConfidence ? '(with confidence %)' : ''}
- Risk mitigation strategies
- Best practice recommendations
- Implementation timeline and tips
` : ''}

${output.consultantConfidence ? `
**CONFIDENCE SCORING:**
Include confidence percentages for:
- Safety requirement accuracy (e.g., "Safety confidence: 95%")
- Regulatory compliance completeness
- Implementation feasibility
- Documentation adequacy
` : ''}

Ensure all procedures include necessary compliance checkpoints and audit trails for ${procedureDoc.safetyLevel} risk level.`;
    }
  },

  'functional-booklet': {
    systemPrompt: `You are an expert organizational consultant specializing in functional organizational design. You must:

1. Create comprehensive organizational booklets that map structure, roles, and relationships
2. Provide clear guidance on organizational hierarchy and decision-making flows
3. Include practical implementation recommendations
4. Ensure organizational design supports effective communication and accountability
5. Provide confidence ratings for organizational recommendations

**CONFIDENCE SCORING**: Provide confidence levels for organizational structure recommendations, role definitions, and implementation suggestions.`,

    generatePrompt: (formData) => {
      const { targetAudience, context, output, functionalBooklet } = formData;
      
      let prompt = `Create a comprehensive functional organizational booklet with the following specifications:

**ORGANIZATIONAL CONFIGURATION:**
- Generation Mode: ${functionalBooklet.mode}
- Organization Type: ${functionalBooklet.organizationType}`;

      if (functionalBooklet.mode === 'easy') {
        prompt += `
- Department Count: ${functionalBooklet.departmentCount}
- Hierarchy Levels: ${functionalBooklet.hierarchyLevels}
- Decision Making: ${functionalBooklet.decisionMaking}
- Communication Flow: ${functionalBooklet.communicationFlow}

**MODE NOTICE:** This is generated in Easy Mode using general organizational templates. For more accurate organizational mapping, consider using Advanced Mode with actual organizational documents.`;
      } else {
        prompt += `
- Advanced Mode: Document-enhanced generation for higher accuracy
- Document Analysis: Will be integrated with company documents for precise mapping`;
      }

      prompt += `

**ORGANIZATIONAL CONTEXT:**
- Purpose: ${context.reasons}
- Scope: ${context.scope}
- Additional Information: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**OUTPUT REQUIREMENTS:**
- Language: ${output.language}
- Length: ${output.expectedLength}
- Tone: ${output.tone}
- Include Explanations: ${output.includeExplanation ? 'Yes' : 'No'}
- Show Confidence Levels: ${output.consultantConfidence ? 'Yes' : 'No'}

**REQUIRED STRUCTURE:**
1. Executive Summary and Organizational Overview
2. Organizational Chart and Structure
3. Department and Function Definitions
4. Role and Responsibility Matrix
5. Reporting Relationships and Hierarchy
6. Decision-Making Processes and Authority Levels
7. Communication Channels and Information Flow
8. Cross-Functional Relationships and Dependencies
9. Performance Management and Accountability
10. Implementation Guidelines and Change Management

**ORGANIZATION TYPE SPECIFIC REQUIREMENTS:**
Tailor the booklet for ${functionalBooklet.organizationType} including:
- Typical structures for this organization type
- Common roles and departments
- Standard reporting relationships
- Industry-appropriate hierarchy levels

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
For each organizational element, explain:
- Why this structure was recommended ${output.consultantConfidence ? '(with confidence %)' : ''}
- Benefits and potential challenges
- Implementation best practices
- Alternative organizational approaches
- Change management considerations
` : ''}

${output.consultantConfidence ? `
**CONFIDENCE SCORING:**
Include confidence percentages for:
- Organizational structure recommendations (e.g., "Structure confidence: 82%")
- Role definition accuracy
- Implementation feasibility
- Communication flow effectiveness
` : ''}

${functionalBooklet.mode === 'easy' ? `
**ACCURACY DISCLAIMER:**
Include a clear disclaimer that this booklet is based on general organizational templates and may require customization based on actual company needs and existing structures.
` : ''}

Generate a comprehensive organizational booklet that provides clear guidance on functional relationships and implementation.`;

      return prompt;
    }
  }
};

// Enhanced generation endpoint with Phase 2 document selection
router.post('/generate', async (req, res) => {
  try {
    const { 
      templateId, 
      legalFramework, 
      targetAudience, 
      context, 
      output, 
      companyInfo,
      jobDescription,
      companyPolicy,
      procedureDoc,
      functionalBooklet,
      selectedDocuments = [], // Phase 2: Selected documents
      documentAnalysis = null  // Phase 2: Document analysis
    } = req.body;

    // Validate required fields
    if (!templateId || !targetAudience || targetAudience.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Template ID and target audience are required'
      });

// Phase 2: Document analysis endpoint
router.post('/analyze-documents', async (req, res) => {
  try {
    const { documentIds, templateId } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs are required'
      });
    }

    console.log(`Analyzing ${documentIds.length} documents for template: ${templateId}`);

    // Get document information
    const documents = await Promise.all(
      documentIds.map(async (id) => {
        try {
          const docResponse = await ragService.getDocumentInfo(id);
          return docResponse;
        } catch (error) {
          console.warn(`Failed to get info for document ${id}:`, error.message);
          return null;
        }
      })
    );

    const validDocuments = documents.filter(doc => doc !== null);

    if (validDocuments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No valid documents found'
      });
    }

    // Analyze documents for template relevance
    const analysis = await analyzeDocumentsForTemplate(validDocuments, templateId);

    res.json({
      success: true,
      analysis: {
        totalDocuments: validDocuments.length,
        avgRelevance: analysis.avgRelevance,
        coverageAreas: analysis.coverageAreas,
        gaps: analysis.gaps,
        recommendations: analysis.recommendations,
        documentScores: analysis.documentScores
      }
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze documents',
      details: error.message
    });
  }
});
    }

    const template = documentTemplates[templateId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Template-specific validation
    const validationResult = validateTemplateSpecificFields(templateId, req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Required template fields missing',
        details: validationResult.errors
      });
    }

    console.log('Starting document generation for template:', templateId);
    const startTime = Date.now();

    // Get relevant context from knowledge base with Phase 2 enhancements
    const contextQueries = buildContextQueries(templateId, {
      context,
      legalFramework,
      targetAudience,
      jobDescription,
      companyPolicy,
      procedureDoc,
      functionalBooklet
    });

    let knowledgeContext = '';
    let sourceDocuments = [];
    
    // Phase 2: Use selected documents if available, otherwise use general RAG
    if (selectedDocuments && selectedDocuments.length > 0) {
      console.log(`Using ${selectedDocuments.length} selected documents for context`);
      
      for (const query of contextQueries) {
        try {
          const ragResult = await ragService.getContextFromSpecificDocuments(query, {
            documentIds: selectedDocuments.map(d => d.id),
            maxResults: 5,
            includeRelevanceScores: true,
            templateId
          });
          
          if (ragResult.foundRelevantContent) {
            knowledgeContext += `\n\n**Context from Selected Documents:**\n${ragResult.context}\n`;
            sourceDocuments = [...sourceDocuments, ...ragResult.sources];
          }
        } catch (ragError) {
          console.warn('Selected document RAG query failed:', ragError.message);
        }
      }
    } else {
      // Fallback to general RAG search
      for (const query of contextQueries) {
        try {
          const ragResult = await ragService.getContextForQuery(query, {
            maxResults: 3,
            includeRelevanceScores: true
          });
          
          if (ragResult.foundRelevantContent) {
            knowledgeContext += `\n\n**Relevant Company Information:**\n${ragResult.context}\n`;
            sourceDocuments = [...sourceDocuments, ...ragResult.sources];
          }
        } catch (ragError) {
          console.warn('RAG query failed:', ragError.message);
        }
      }
    }

    // Generate the main prompt with Phase 2 enhancements
    let userPrompt = template.generatePrompt(req.body) + knowledgeContext;
    
    // Phase 2: Add selected documents context
    if (selectedDocuments && selectedDocuments.length > 0) {
      userPrompt += `\n\n**SELECTED DOCUMENTS CONTEXT:**\nThe following ${selectedDocuments.length} documents have been specifically selected to inform this generation:\n`;
      selectedDocuments.forEach((doc, index) => {
        userPrompt += `${index + 1}. ${doc.filename} (Category: ${doc.category || 'Unspecified'})\n`;
        if (doc.summary) {
          userPrompt += `   Summary: ${doc.summary}\n`;
        }
      });
      userPrompt += `\nPlease prioritize information from these selected documents and reference them in your explanations when relevant.\n`;
      
      if (documentAnalysis) {
        userPrompt += `\n**DOCUMENT ANALYSIS:**\nAverage relevance score: ${Math.round(documentAnalysis.avgRelevance * 100)}%\n`;
        if (documentAnalysis.coverageAreas) {
          userPrompt += `Coverage areas: ${documentAnalysis.coverageAreas.join(', ')}\n`;
        }
        if (documentAnalysis.gaps) {
          userPrompt += `Identified gaps: ${documentAnalysis.gaps.join(', ')}\n`;
        }
      }
    }

    // Prepare AI request with enhanced parameters for consultant features
    const aiRequest = {
      model: fluxAiConfig.model,
      messages: [
        {
          role: 'system',
          content: template.systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent legal documents
      max_tokens: getMaxTokensForLength(output.expectedLength),
      stream: false
    };

    console.log('Sending request to AI with prompt length:', userPrompt.length);

    // Generate document with AI
    const aiResponse = await makeAiChatRequest(aiRequest);

    if (!aiResponse || !aiResponse.choices || aiResponse.choices.length === 0) {
      throw new Error('Invalid response from AI service');
    }

    const generatedContent = aiResponse.choices[0].message?.content || 
                            aiResponse.choices[0].message || 
                            aiResponse.choices[0].text;

    if (!generatedContent) {
      throw new Error('No content generated by AI');
    }

    const generationTime = Date.now() - startTime;
    const wordCount = countWords(generatedContent);

    // Enhanced quality scoring with consultant features
    const qualityScore = calculateEnhancedQualityScore(generatedContent, {
      includeExplanation: output.includeExplanation,
      consultantConfidence: output.consultantConfidence,
      templateId
    });

    // Store in generation history with enhanced metadata
    const historyRecord = await AiGenerationHistory.create({
      templateId,
      templateTitle: getTemplateTitle(templateId),
      userId: req.user?.id || 'system',
      legalFramework,
      targetAudience,
      context,
      outputConfig: output,
      templateSpecificData: {
        jobDescription,
        companyPolicy,
        procedureDoc,
        functionalBooklet
      },
      selectedDocuments: selectedDocuments || [], // Phase 2: Store selected documents
      documentAnalysis: documentAnalysis || null, // Phase 2: Store document analysis
      generatedContent,
      wordCount,
      tokenUsage: aiResponse.usage || {},
      generationTime,
      qualityScore,
      downloadCount: 0,
      isBookmarked: false,
      consultantFeatures: {
        includeExplanation: output.includeExplanation,
        consultantConfidence: output.consultantConfidence,
        confidenceScores: extractConfidenceScores(generatedContent)
      }
    });

    // Process and format the generated content
    const processedResult = {
      id: historyRecord.id,
      content: generatedContent,
      metadata: {
        id: historyRecord.id,
        templateId,
        templateTitle: getTemplateTitle(templateId),
        generatedAt: historyRecord.createdAt,
        legalFramework: legalFramework.country,
        targetAudience,
        language: output.language,
        estimatedLength: output.expectedLength,
        includesExplanations: output.includeExplanation,
        consultantConfidence: output.consultantConfidence,
        wordCount,
        tokenUsage: aiResponse.usage || {},
        generationTime,
        qualityScore,
        confidenceScores: extractConfidenceScores(generatedContent),
        // Phase 2: Enhanced metadata
        sourceDocuments: sourceDocuments || [],
        selectedDocuments: selectedDocuments || [],
        documentAnalysis: documentAnalysis || null,
        ragEnhanced: (selectedDocuments && selectedDocuments.length > 0) || sourceDocuments.length > 0
      },
      downloadOptions: {
        pdf: true,
        docx: true,
        html: true,
        txt: true
      }
    };

    console.log('Document generated successfully:', {
      templateId,
      wordCount,
      language: output.language,
      generationTime: `${generationTime}ms`,
      qualityScore,
      hasConfidenceScores: processedResult.metadata.confidenceScores.length > 0
    });

    res.json({
      success: true,
      result: processedResult,
      message: 'Document generated successfully'
    });

  } catch (error) {
    console.error('Document generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate document',
      details: error.message
    });
  }
});

// Template-specific field validation
function validateTemplateSpecificFields(templateId, formData) {
  const errors = [];

  switch (templateId) {
    case 'job-descriptions':
      if (!formData.jobDescription?.roleTitle) errors.push('Job title is required');
      if (!formData.jobDescription?.sector) errors.push('Sector is required');
      break;

    case 'policy-generator':
      if (!formData.companyPolicy?.policyType) errors.push('Policy type is required');
      break;

    case 'procedure-docs':
      if (!formData.procedureDoc?.processName) errors.push('Process name is required');
      if (!formData.procedureDoc?.processType) errors.push('Process type is required');
      break;

    case 'functional-booklet':
      if (!formData.functionalBooklet?.mode) errors.push('Generation mode is required');
      if (!formData.functionalBooklet?.organizationType) errors.push('Organization type is required');
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Build context queries based on template type
function buildContextQueries(templateId, formData) {
  const { context, legalFramework, targetAudience } = formData;
  
  let queries = [
    context.reasons,
    context.scope,
    `${legalFramework?.country} employment law`,
    targetAudience?.join(' ')
  ].filter(Boolean);

  // Add template-specific queries
  switch (templateId) {
    case 'job-descriptions':
      if (formData.jobDescription) {
        queries.push(
          `${formData.jobDescription.roleTitle} job description`,
          `${formData.jobDescription.sector} industry requirements`,
          formData.jobDescription.keySkills?.join(' ')
        );
      }
      break;

    case 'policy-generator':
      if (formData.companyPolicy) {
        queries.push(
          `${formData.companyPolicy.policyType} policy`,
          formData.companyPolicy.legalRequirements,
          'compliance procedures'
        );
      }
      break;

    case 'procedure-docs':
      if (formData.procedureDoc) {
        queries.push(
          `${formData.procedureDoc.processName} procedure`,
          `${formData.procedureDoc.processType} process`,
          'safety procedures'
        );
      }
      break;

    case 'functional-booklet':
      if (formData.functionalBooklet) {
        queries.push(
          'organizational structure',
          'reporting relationships',
          'job roles responsibilities'
        );
      }
      break;
  }

  return queries.filter(Boolean);
}

// Extract confidence scores from generated content
function extractConfidenceScores(content) {
  const confidencePattern = /confidence:\s*(\d{1,3})%/gi;
  const matches = [];
  let match;

  while ((match = confidencePattern.exec(content)) !== null) {
    matches.push({
      score: parseInt(match[1]),
      context: content.substring(Math.max(0, match.index - 50), match.index + 100)
    });
  }

  return matches;
}

// Enhanced quality scoring
function calculateEnhancedQualityScore(content, options) {
  if (!content) return 0;
  
  let score = 50; // Base score
  
  // Check for proper structure
  if (content.includes('##')) score += 15; // Has sections
  if (content.includes('###')) score += 10; // Has subsections
  if (content.includes('**')) score += 10; // Has emphasis
  
  // Check content length
  const wordCount = countWords(content);
  if (wordCount > 500) score += 10;
  if (wordCount > 1000) score += 5;
  
  // Check for legal references
  if (content.toLowerCase().includes('law') || content.toLowerCase().includes('legal')) score += 10;
  
  // Bonus for consultant features
  if (options.includeExplanation && content.toLowerCase().includes('explanation')) score += 5;
  if (options.consultantConfidence && content.includes('confidence:')) score += 5;
  
  // Template-specific scoring
  switch (options.templateId) {
    case 'job-descriptions':
      if (content.includes('qualifications') || content.includes('requirements')) score += 5;
      break;
    case 'policy-generator':
      if (content.includes('compliance') || content.includes('procedure')) score += 5;
      break;
    case 'procedure-docs':
      if (content.includes('step') || content.includes('process')) score += 5;
      break;
    case 'functional-booklet':
      if (content.includes('organization') || content.includes('structure')) score += 5;
      break;
  }
  
  return Math.min(100, score);
}

// Get template titles for new templates
function getTemplateTitle(templateId) {
  const titles = {
    'policy-generator': 'Company Policy',
    'job-descriptions': 'Job Description',
    'procedure-docs': 'Procedure Documentation',
    'functional-booklet': 'Functional Organizational Booklet'
  };
  return titles[templateId] || 'Generated Document';
}

// Phase 2: Document analysis for template relevance
async function analyzeDocumentsForTemplate(documents, templateId) {
  const templateRequirements = {
    'job-descriptions': {
      keywords: ['role', 'responsibility', 'qualification', 'skill', 'competency', 'position', 'job', 'requirement'],
      categories: ['job_frameworks', 'policies_procedures', 'organizational_guidelines'],
      weights: { content: 0.4, category: 0.4, keywords: 0.2 }
    },
    'policy-generator': {
      keywords: ['policy', 'procedure', 'compliance', 'regulation', 'guideline', 'rule', 'standard'],
      categories: ['policies_procedures', 'compliance_documents', 'organizational_guidelines'],
      weights: { content: 0.5, category: 0.3, keywords: 0.2 }
    },
    'procedure-docs': {
      keywords: ['procedure', 'process', 'workflow', 'step', 'instruction', 'operation', 'method'],
      categories: ['policies_procedures', 'training_materials', 'compliance_documents'],
      weights: { content: 0.4, category: 0.3, keywords: 0.3 }
    },
    'functional-booklet': {
      keywords: ['organization', 'structure', 'hierarchy', 'department', 'team', 'reporting', 'role'],
      categories: ['organizational_guidelines', 'job_frameworks', 'policies_procedures'],
      weights: { content: 0.3, category: 0.4, keywords: 0.3 }
    }
  };

  const requirements = templateRequirements[templateId] || templateRequirements['policy-generator'];
  const documentScores = [];
  let totalRelevance = 0;
  const coverageAreas = new Set();
  const foundKeywords = new Set();

  for (const doc of documents) {
    let score = 0;
    const docText = `${doc.originalName} ${doc.summary || ''} ${doc.aiGeneratedTags?.join(' ') || ''}`.toLowerCase();
    
    // Category relevance
    if (requirements.categories.includes(doc.category)) {
      const categoryIndex = requirements.categories.indexOf(doc.category);
      score += (3 - categoryIndex) * requirements.weights.category;
      coverageAreas.add(doc.category);
    }
    
    // Keyword relevance
    let keywordMatches = 0;
    requirements.keywords.forEach(keyword => {
      if (docText.includes(keyword.toLowerCase())) {
        keywordMatches++;
        foundKeywords.add(keyword);
      }
    });
    score += (keywordMatches / requirements.keywords.length) * requirements.weights.keywords;
    
    // Content quality (based on summary length and tags)
    let contentScore = 0;
    if (doc.summary && doc.summary.length > 100) contentScore += 0.3;
    if (doc.aiGeneratedTags && doc.aiGeneratedTags.length > 3) contentScore += 0.3;
    if (doc.wordCount && doc.wordCount > 500) contentScore += 0.4;
    score += Math.min(contentScore, 1) * requirements.weights.content;
    
    score = Math.min(score, 1); // Cap at 1.0
    documentScores.push({
      documentId: doc.id,
      filename: doc.originalName,
      score: score,
      category: doc.category,
      matchedKeywords: requirements.keywords.filter(k => docText.includes(k.toLowerCase()))
    });
    
    totalRelevance += score;
  }

  const avgRelevance = documents.length > 0 ? totalRelevance / documents.length : 0;
  
  // Identify gaps
  const gaps = [];
  requirements.categories.forEach(cat => {
    if (!coverageAreas.has(cat)) {
      gaps.push(`Missing ${cat.replace(/_/g, ' ')} documents`);
    }
  });
  
  const missingKeywords = requirements.keywords.filter(k => !foundKeywords.has(k));
  if (missingKeywords.length > requirements.keywords.length * 0.5) {
    gaps.push(`Limited coverage of key concepts: ${missingKeywords.slice(0, 3).join(', ')}`);
  }

  // Generate recommendations
  const recommendations = [];
  if (avgRelevance < 0.5) {
    recommendations.push('Consider adding more relevant documents for better context');
  }
  if (gaps.length > 0) {
    recommendations.push(`Upload documents in these areas: ${Array.from(coverageAreas).join(', ')}`);
  }
  if (documents.length < 3) {
    recommendations.push('Adding more documents typically improves generation quality');
  }

  return {
    avgRelevance,
    coverageAreas: Array.from(coverageAreas),
    gaps,
    recommendations,
    documentScores: documentScores.sort((a, b) => b.score - a.score)
  };
}

// Utility functions (keeping existing ones)
function getMaxTokensForLength(length) {
  const tokenLimits = {
    brief: 1500,
    medium: 3000,
    detailed: 5000,
    comprehensive: 8000
  };
  return tokenLimits[length] || 3000;
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

// Get available templates with Phase 1 structure
router.get('/templates', (req, res) => {
  const templates = Object.entries(documentTemplates).map(([id, template]) => ({
    id,
    title: getTemplateTitle(id),
    category: getTemplateCategory(id),
    systemPrompt: template.systemPrompt,
    availableLanguages: ['italian', 'english', 'german', 'french'],
    supportedCountries: Object.keys(legalFrameworks),
    estimatedGenerationTime: '2-5 minutes',
    features: getTemplateFeatures(id)
  }));

  res.json({
    success: true,
    templates
  });
});

function getTemplateCategory(templateId) {
  const categories = {
    'policy-generator': 'Hard HR Activities',
    'procedure-docs': 'Hard HR Activities',
    'job-descriptions': 'Soft HR Activities',
    'functional-booklet': 'Soft HR Activities'
  };
  return categories[templateId] || 'General';
}

function getTemplateFeatures(templateId) {
  const features = {
    'policy-generator': ['Legal compliance checking', 'Multi-country support', 'Version control'],
    'job-descriptions': ['Competency mapping', 'Sector targeting', 'Skills-focused approach'],
    'procedure-docs': ['Step-by-step guides', 'Visual workflows', 'Compliance checkpoints'],
    'functional-booklet': ['Organizational mapping', 'Role relationships', 'Hierarchy visualization']
  };
  return features[templateId] || [];
}

// Keep all existing endpoints (download, history, etc.) unchanged
// ... [rest of the existing code remains the same]

// Download generated document (existing code)
router.post('/download', async (req, res) => {
  try {
    const { content, metadata, format = 'pdf' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Document content is required'
      });
    }

    const filename = `${metadata?.templateTitle || 'document'}_${Date.now()}`;

    switch (format.toLowerCase()) {
      case 'pdf':
        const pdfBuffer = await generatePDF(content, metadata);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
        break;

      case 'docx':
        const docxBuffer = await generateDOCX(content, metadata);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
        res.send(docxBuffer);
        break;

      case 'txt':
        const cleanText = content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/#+\s*/g, '').replace(/\n\n+/g, '\n\n');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
        res.send(cleanText);
        break;

      case 'html':
        const htmlContent = generateHTML(content, metadata);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
        res.send(htmlContent);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unsupported format. Use pdf, docx, txt, or html'
        });
    }

    // Track download if we have a document ID
    if (metadata?.id) {
      await AiGenerationHistory.increment('downloadCount', {
        where: { id: metadata.id }
      });
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download',
      details: error.message
    });
  }
});

// Document generation helper functions (keeping existing ones)
async function generatePDF(content, metadata) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Add title
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text(metadata?.templateTitle || 'Generated Document', { align: 'center' });
      doc.moveDown();

      // Add metadata
      if (metadata) {
        doc.fontSize(10).font('Helvetica');
        doc.text(`Generated: ${new Date(metadata.generatedAt).toLocaleString()}`, { align: 'right' });
        if (metadata.legalFramework) {
          doc.text(`Legal Framework: ${metadata.legalFramework}`, { align: 'right' });
        }
        if (metadata.consultantConfidence && metadata.confidenceScores?.length > 0) {
          doc.text(`Consultant Confidence Scores: ${metadata.confidenceScores.length} sections`, { align: 'right' });
        }
        doc.moveDown();
      }

      // Add content
      doc.fontSize(12).font('Helvetica');
      
      // Simple markdown to text conversion
      const lines = content.split('\n');
      lines.forEach(line => {
        if (line.startsWith('# ')) {
          doc.fontSize(16).font('Helvetica-Bold');
          doc.text(line.substring(2), { paragraphGap: 5 });
        } else if (line.startsWith('## ')) {
          doc.fontSize(14).font('Helvetica-Bold');
          doc.text(line.substring(3), { paragraphGap: 5 });
        } else if (line.startsWith('### ')) {
          doc.fontSize(12).font('Helvetica-Bold');
          doc.text(line.substring(4), { paragraphGap: 5 });
        } else {
          doc.fontSize(12).font('Helvetica');
          // Handle bold text and confidence scores
          const boldRegex = /\*\*(.*?)\*\*/g;
          const confidenceRegex = /(confidence:\s*\d{1,3}%)/gi;
          
          if (boldRegex.test(line) || confidenceRegex.test(line)) {
            // Complex text formatting for confidence scores
            let processedLine = line.replace(confidenceRegex, '**$1**'); // Make confidence scores bold
            const parts = processedLine.split(boldRegex);
            parts.forEach((part, index) => {
              if (index % 2 === 1) {
                doc.font('Helvetica-Bold').text(part, { continued: true });
              } else {
                doc.font('Helvetica').text(part, { continued: true });
              }
            });
            doc.text(''); // End the line
          } else {
            doc.text(line, { paragraphGap: 3 });
          }
        }
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function generateDOCX(content, metadata) {
  try {
    const children = [];

    // Add title
    children.push(
      new Paragraph({
        text: metadata?.templateTitle || 'Generated Document',
        heading: HeadingLevel.TITLE,
        alignment: 'center'
      })
    );

    // Add metadata
    if (metadata) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated: ${new Date(metadata.generatedAt).toLocaleString()}`,
              size: 20
            })
          ]
        })
      );
      
      if (metadata.legalFramework) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Legal Framework: ${metadata.legalFramework}`,
                size: 20
              })
            ]
          })
        );
      }

      if (metadata.consultantConfidence && metadata.confidenceScores?.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Consultant Confidence Scores: ${metadata.confidenceScores.length} sections included`,
                size: 20,
                italics: true
              })
            ]
          })
        );
      }
    }

    // Process content
    const lines = content.split('\n');
    lines.forEach(line => {
      if (line.trim() === '') {
        children.push(new Paragraph({ text: '' }));
      } else if (line.startsWith('# ')) {
        children.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1
          })
        );
      } else if (line.startsWith('## ')) {
        children.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2
          })
        );
      } else if (line.startsWith('### ')) {
        children.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3
          })
        );
      } else {
        // Handle bold text and confidence scores
        const boldRegex = /\*\*(.*?)\*\*/g;
        const confidenceRegex = /(confidence:\s*\d{1,3}%)/gi;
        
        if (boldRegex.test(line) || confidenceRegex.test(line)) {
          // Highlight confidence scores
          let processedLine = line.replace(confidenceRegex, '**$1**');
          const parts = processedLine.split(boldRegex);
          const textRuns = parts.map((part, index) => {
            const isConfidence = /confidence:\s*\d{1,3}%/i.test(part);
            return new TextRun({
              text: part,
              bold: index % 2 === 1,
              highlight: isConfidence ? 'yellow' : undefined
            });
          });
          children.push(new Paragraph({ children: textRuns }));
        } else {
          children.push(new Paragraph({ text: line }));
        }
      }
    });

    const doc = new DocxDocument({
      sections: [{
        properties: {},
        children: children
      }]
    });

    return await Packer.toBuffer(doc);
  } catch (error) {
    throw new Error(`DOCX generation failed: ${error.message}`);
  }
}

function generateHTML(content, metadata) {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata?.templateTitle || 'Generated Document'}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #4B5563; padding-bottom: 10px; }
        h2 { color: #4B5563; margin-top: 30px; }
        h3 { color: #6B7280; }
        .metadata { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
        .metadata p { margin: 5px 0; }
        .confidence-score { background: #fef3c7; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
        strong { font-weight: bold; }
    </style>
</head>
<body>`;

  // Add metadata section
  if (metadata) {
    html += `<div class="metadata">
        <h2>Document Information</h2>
        <p><strong>Generated:</strong> ${new Date(metadata.generatedAt).toLocaleString()}</p>`;
    
    if (metadata.legalFramework) {
      html += `<p><strong>Legal Framework:</strong> ${metadata.legalFramework}</p>`;
    }
    if (metadata.language) {
      html += `<p><strong>Language:</strong> ${metadata.language}</p>`;
    }
    if (metadata.wordCount) {
      html += `<p><strong>Word Count:</strong> ${metadata.wordCount}</p>`;
    }
    if (metadata.consultantConfidence && metadata.confidenceScores?.length > 0) {
      html += `<p><strong>Consultant Confidence Scores:</strong> ${metadata.confidenceScores.length} sections</p>`;
    }
    
    html += `</div>`;
  }

  // Convert markdown-like content to HTML with confidence score highlighting
  let htmlContent = content
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(confidence:\s*\d{1,3}%)/gi, '<span class="confidence-score">$1</span>')
    .replace(/^\* (.*)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraphs and handle lists
  htmlContent = '<p>' + htmlContent + '</p>';
  htmlContent = htmlContent.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');

  html += htmlContent;
  html += `</body></html>`;

  return html;
}

// Keep all other existing endpoints unchanged
// [Previous endpoints for history, documents, bookmarks, etc. remain the same]

module.exports = router;