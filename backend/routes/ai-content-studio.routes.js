// backend/routes/ai-content-studio.routes.js
const express = require('express');
const router = express.Router();
const { makeAiChatRequest } = require('../services/flux-ai.service');
const ragService = require('../services/enhanced-rag.service');
const fluxAiConfig = require('../config/flux-ai');

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
      collective: 'Analizza attentamente le clausole del CCNL applicabile e assicura la conformità con la legislazione nazionale e europea.'
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
      collective: 'Ensure compliance with National Labor Relations Act (NLRA) and relevant state collective bargaining laws.'
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
      collective: 'Berücksichtigen Sie die deutschen Tarifvertragsgesetze und die Rolle der Gewerkschaften im deutschen System.'
    }
  }
  // Add more countries as needed
};

// Template definitions with enhanced legal awareness
const documentTemplates = {
  'policy-generator': {
    systemPrompt: `You are an expert HR policy consultant specializing in creating legally compliant company policies. You must:

1. Create comprehensive, legally sound policies that comply with specified jurisdictions
2. Include clear implementation guidance and explanations
3. Provide consultant-style reasoning for policy decisions
4. Ensure language is appropriate for the target audience
5. Include practical examples and scenarios where helpful`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output } = formData;
      const framework = legalFrameworks[legalFramework.country];
      
      let prompt = `Create a comprehensive company policy document with the following specifications:

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

**LEGAL COMPLIANCE REQUIREMENTS:**
${framework?.legalPrompts?.policy || 'Ensure compliance with local employment laws and regulations.'}

**DOCUMENT STRUCTURE REQUIRED:**
1. Policy Title and Purpose
2. Scope and Applicability
3. Legal Framework and Compliance
4. Policy Details and Procedures
5. Implementation Guidelines
6. Responsibilities and Accountability
7. Review and Amendment Process

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS REQUIRED:**
For each section, explain:
- Why this approach was chosen
- Legal reasoning behind specific clauses
- Implementation best practices
- Potential risks and mitigation strategies
- How this compares to industry standards
` : ''}

Generate a professional, legally compliant policy document that addresses all requirements above.`;

      return prompt;
    }
  },

  'job-descriptions': {
    systemPrompt: `You are an expert HR consultant specializing in creating legally compliant job descriptions. You must:

1. Create comprehensive job descriptions that comply with employment laws
2. Ensure non-discriminatory language and equal opportunity compliance
3. Include clear competency frameworks and requirements
4. Provide implementation guidance for hiring managers
5. Explain legal considerations and best practices`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output } = formData;
      const framework = legalFrameworks[legalFramework.country];
      
      return `Create a comprehensive job description with the following specifications:

**LEGAL FRAMEWORK:**
- Country: ${framework?.name || legalFramework.country}
- Employment Law Compliance: ${framework?.legalPrompts?.jobDescription || 'Ensure equal opportunity and non-discrimination compliance'}

**JOB DETAILS:**
- Position Context: ${context.reasons}
- Role Scope: ${context.scope}
- Special Requirements: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**OUTPUT REQUIREMENTS:**
- Language: ${output.language}
- Length: ${output.expectedLength}
- Tone: ${output.tone}

**REQUIRED SECTIONS:**
1. Job Title and Department
2. Position Summary
3. Key Responsibilities and Duties
4. Required Qualifications and Skills
5. Preferred Qualifications
6. Competency Framework
7. Working Conditions and Physical Requirements
8. Compensation and Benefits Overview
9. Equal Opportunity Statement
10. Application Process

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
- Legal compliance reasoning
- Competency selection rationale
- Industry benchmarking insights
- Implementation recommendations
` : ''}

Ensure full compliance with anti-discrimination laws and equal opportunity requirements.`;
    }
  },

  'procedure-docs': {
    systemPrompt: `You are an expert process consultant specializing in creating legally compliant operational procedures. You must:

1. Create clear, step-by-step procedures that ensure compliance
2. Include necessary audit trails and documentation requirements
3. Provide implementation guidance and training recommendations
4. Ensure procedures meet regulatory and safety standards
5. Explain the rationale behind each procedural step`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output } = formData;
      const framework = legalFrameworks[legalFramework.country];
      
      return `Create a comprehensive procedure document with the following specifications:

**LEGAL FRAMEWORK:**
- Country: ${framework?.name || legalFramework.country}
- Regulatory Compliance: ${framework?.legalPrompts?.procedure || 'Ensure compliance with operational and safety regulations'}
- Specific Laws: ${legalFramework.specificLaws}

**PROCEDURE DETAILS:**
- Purpose: ${context.reasons}
- Scope: ${context.scope}
- Additional Context: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**REQUIRED STRUCTURE:**
1. Procedure Title and Identifier
2. Purpose and Scope
3. Legal and Regulatory Framework
4. Roles and Responsibilities
5. Step-by-Step Procedure
6. Documentation Requirements
7. Compliance Checkpoints
8. Training Requirements
9. Review and Update Process
10. Related Procedures and References

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
- Regulatory reasoning for each step
- Risk mitigation strategies
- Best practice recommendations
- Implementation timeline and tips
` : ''}

Ensure all procedures include necessary compliance checkpoints and audit trails.`;
    }
  },

  'collective-agreement': {
    systemPrompt: `You are an expert labor relations consultant specializing in collective agreement analysis and implementation. You must:

1. Analyze collective agreements thoroughly and accurately
2. Provide clear implementation guidelines for management
3. Ensure compliance with labor relations laws
4. Explain the implications of various clauses
5. Provide practical guidance for day-to-day application`,

    generatePrompt: (formData) => {
      const { legalFramework, targetAudience, context, output } = formData;
      
      return `Analyze and create implementation guidelines for collective agreement with the following specifications:

**LEGAL FRAMEWORK:**
- Country: Italy
- CCNL Reference: ${legalFramework.collectiveAgreements}
- Additional Laws: ${legalFramework.specificLaws}

**ANALYSIS REQUIREMENTS:**
- Agreement Context: ${context.reasons}
- Implementation Scope: ${context.scope}
- Special Considerations: ${context.additionalInfo}

**TARGET AUDIENCE:** ${targetAudience.join(', ')}

**REQUIRED ANALYSIS SECTIONS:**
1. CCNL Overview and Applicability
2. Key Terms and Definitions
3. Wage and Compensation Structure
4. Working Time and Leave Provisions
5. Classification and Career Progression
6. Training and Development Requirements
7. Health and Safety Obligations
8. Disciplinary Procedures
9. Union Relations and Consultation Rights
10. Implementation Checklist

**IMPLEMENTATION GUIDE:**
- Practical application steps
- Timeline for implementation
- Required policy updates
- Training recommendations
- Compliance monitoring procedures

${output.includeExplanation ? `
**CONSULTANT EXPLANATIONS:**
- Legal implications of each clause
- Industry best practices
- Risk assessment and mitigation
- Change management recommendations
` : ''}

Provide comprehensive analysis focusing on practical implementation for Italian companies.`;
    }
  }
};

// Enhanced generation endpoint
router.post('/generate', async (req, res) => {
  try {
    const { templateId, legalFramework, targetAudience, context, output, companyInfo } = req.body;

    // Validate required fields
    if (!templateId || !targetAudience || targetAudience.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Template ID and target audience are required'
      });
    }

    const template = documentTemplates[templateId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    console.log('Starting document generation for template:', templateId);

    // Get relevant context from knowledge base
    const contextQueries = [
      context.reasons,
      context.scope,
      `${legalFramework.country} employment law`,
      targetAudience.join(' ')
    ].filter(Boolean);

    let knowledgeContext = '';
    for (const query of contextQueries) {
      try {
        const ragResult = await ragService.getContextForQuery(query, {
          maxResults: 3,
          includeRelevanceScores: true
        });
        
        if (ragResult.foundRelevantContent) {
          knowledgeContext += `\n\n**Relevant Company Information:**\n${ragResult.context}\n`;
        }
      } catch (ragError) {
        console.warn('RAG query failed:', ragError.message);
      }
    }

    // Generate the main prompt
    const userPrompt = template.generatePrompt(req.body) + knowledgeContext;

    // Prepare AI request
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

    // Process and format the generated content
    const processedResult = {
      content: generatedContent,
      metadata: {
        templateId,
        templateTitle: getTemplateTitle(templateId),
        generatedAt: new Date().toISOString(),
        legalFramework: legalFramework.country,
        targetAudience,
        language: output.language,
        estimatedLength: output.expectedLength,
        includesExplanations: output.includeExplanation,
        wordCount: countWords(generatedContent),
        tokenUsage: aiResponse.usage || {}
      },
      downloadOptions: {
        pdf: true,
        docx: true,
        html: true
      }
    };

    console.log('Document generated successfully:', {
      templateId,
      wordCount: processedResult.metadata.wordCount,
      language: output.language
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

// Get available legal frameworks
router.get('/legal-frameworks', (req, res) => {
  const frameworks = Object.entries(legalFrameworks).map(([code, data]) => ({
    code,
    name: data.name,
    commonLaws: data.commonLaws,
    ccnlTypes: data.ccnlTypes || []
  }));

  res.json({
    success: true,
    frameworks
  });
});

// Get template information
router.get('/templates', (req, res) => {
  const templates = Object.entries(documentTemplates).map(([id, template]) => ({
    id,
    systemPrompt: template.systemPrompt,
    availableLanguages: ['italian', 'english', 'german', 'french'],
    supportedCountries: Object.keys(legalFrameworks),
    estimatedGenerationTime: '2-5 minutes'
  }));

  res.json({
    success: true,
    templates
  });
});

// Utility functions
function getMaxTokensForLength(length) {
  const tokenLimits = {
    brief: 1500,
    medium: 3000,
    detailed: 5000,
    comprehensive: 8000
  };
  return tokenLimits[length] || 3000;
}

function getTemplateTitle(templateId) {
  const titles = {
    'policy-generator': 'Company Policy',
    'job-descriptions': 'Job Description',
    'procedure-docs': 'Procedure Documentation',
    'collective-agreement': 'Collective Agreement Analysis'
  };
  return titles[templateId] || 'Generated Document';
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

// Preview endpoint for testing prompts
router.post('/preview-prompt', async (req, res) => {
  try {
    const { templateId } = req.body;
    const template = documentTemplates[templateId];
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const previewPrompt = template.generatePrompt(req.body);
    
    res.json({
      success: true,
      systemPrompt: template.systemPrompt,
      userPrompt: previewPrompt,
      estimatedTokens: Math.ceil(previewPrompt.length / 4) // Rough estimate
    });

  } catch (error) {
    console.error('Prompt preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prompt preview'
    });
  }
});

module.exports = router;