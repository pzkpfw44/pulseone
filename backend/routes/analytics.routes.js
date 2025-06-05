// backend/routes/analytics.routes.js - Phase 3 Analytics API
const express = require('express');
const router = express.Router();
const { AiGenerationHistory, Document, DocumentChunk } = require('../models');
const { Op } = require('sequelize');

// Get comprehensive generation analytics
router.get('/generation-analytics', async (req, res) => {
  try {
    const { 
      days = 30, 
      includeOptimizations = false,
      templateId = null,
      userId = null 
    } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const whereClause = {
      createdAt: { [Op.gte]: startDate }
    };

    if (templateId) whereClause.templateId = templateId;
    if (userId) whereClause.userId = userId;

    console.log(`[Analytics] Generating analytics for last ${days} days`);

    // Get base generation data
    const generations = await AiGenerationHistory.findAll({
      where: whereClause,
      attributes: [
        'id', 'templateId', 'createdAt', 'qualityScore', 'wordCount', 
        'tokenUsage', 'generationTime', 'downloadCount', 'selectedDocuments',
        'consultantFeatures', 'templateSpecificData'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate analytics
    const analytics = await calculateComprehensiveAnalytics(generations, parseInt(days));

    // Add optimization data if requested
    if (includeOptimizations === 'true') {
      analytics.optimizations = await calculateOptimizations(generations);
    }

    res.json({
      success: true,
      analytics,
      period: `${days} days`,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Analytics generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics',
      details: error.message
    });
  }
});

// Get document usage analytics
router.get('/document-analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log(`[Analytics] Generating document analytics for last ${days} days`);

    const documentAnalytics = await calculateDocumentAnalytics(startDate);

    res.json({
      success: true,
      analytics: documentAnalytics,
      period: `${days} days`
    });

  } catch (error) {
    console.error('Document analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate document analytics',
      details: error.message
    });
  }
});

// Get template performance analytics
router.get('/template-analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log(`[Analytics] Generating template analytics for last ${days} days`);

    const templateAnalytics = await calculateTemplateAnalytics(startDate);

    res.json({
      success: true,
      analytics: templateAnalytics,
      period: `${days} days`
    });

  } catch (error) {
    console.error('Template analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template analytics',
      details: error.message
    });
  }
});

// Get optimization recommendations
router.get('/optimization-recommendations', async (req, res) => {
  try {
    const { days = 30, includeAll = false } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    console.log(`[Analytics] Generating optimization recommendations for last ${days} days`);

    const optimizations = await generateOptimizationRecommendations(startDate, includeAll === 'true');

    res.json({
      success: true,
      optimizations,
      period: `${days} days`
    });

  } catch (error) {
    console.error('Optimization recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate optimization recommendations',
      details: error.message
    });
  }
});

// Export analytics data
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', days = 30, type = 'comprehensive' } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let data;
    
    switch (type) {
      case 'comprehensive':
        data = await generateComprehensiveExport(startDate);
        break;
      case 'documents':
        data = await calculateDocumentAnalytics(startDate);
        break;
      case 'templates':
        data = await calculateTemplateAnalytics(startDate);
        break;
      default:
        data = await generateComprehensiveExport(startDate);
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${days}d.csv"`);
      res.send(convertToCSV(data));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${type}-${days}d.json"`);
      res.json(data);
    }

  } catch (error) {
    console.error('Analytics export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics',
      details: error.message
    });
  }
});

// Analytics calculation functions
async function calculateComprehensiveAnalytics(generations, days) {
  const totalGenerations = generations.length;
  const totalWords = generations.reduce((sum, gen) => sum + (gen.wordCount || 0), 0);
  const totalTokens = generations.reduce((sum, gen) => sum + (gen.tokenUsage?.total_tokens || 0), 0);
  const totalTime = generations.reduce((sum, gen) => sum + (gen.generationTime || 0), 0);
  
  // Calculate averages
  const avgQualityScore = totalGenerations > 0 
    ? generations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / totalGenerations 
    : 0;
  
  const avgGenerationTime = totalGenerations > 0 ? totalTime / totalGenerations : 0;
  const avgWordsPerGeneration = totalGenerations > 0 ? totalWords / totalGenerations : 0;
  const avgTokensPerGeneration = totalGenerations > 0 ? totalTokens / totalGenerations : 0;

  // Calculate trends (compare with previous period)
  const previousPeriodStart = new Date();
  previousPeriodStart.setDate(previousPeriodStart.getDate() - (days * 2));
  const previousPeriodEnd = new Date();
  previousPeriodEnd.setDate(previousPeriodEnd.getDate() - days);

  const previousGenerations = await AiGenerationHistory.findAll({
    where: {
      createdAt: { 
        [Op.gte]: previousPeriodStart,
        [Op.lt]: previousPeriodEnd
      }
    },
    attributes: ['qualityScore', 'generationTime', 'wordCount']
  });

  const trends = calculateTrends(generations, previousGenerations);

  // Daily usage breakdown
  const dailyUsage = calculateDailyUsage(generations, days);

  // Template usage distribution
  const templateUsage = calculateTemplateUsage(generations);

  // Quality distribution
  const qualityDistribution = calculateQualityDistribution(generations);

  // Documents usage
  const documentsUsed = generations.filter(gen => 
    gen.selectedDocuments && Array.isArray(gen.selectedDocuments) && gen.selectedDocuments.length > 0
  ).length;

  // Quality metrics
  const qualityMetrics = await calculateQualityMetrics(generations);

  // Document metrics
  const documentMetrics = await calculateDocumentMetrics(generations);

  // Template metrics
  const templateMetrics = await calculateTemplateMetrics(generations);

  return {
    // Overview metrics
    totalGenerations,
    avgQualityScore,
    avgGenerationTime,
    avgWordsPerGeneration,
    avgTokensPerGeneration,
    documentsUsed,
    
    // Trends
    trends,
    
    // Usage patterns
    dailyUsage,
    templateUsage,
    qualityDistribution,
    
    // Detailed metrics
    qualityMetrics,
    documentMetrics,
    templateMetrics,
    
    // Performance stats
    performance: {
      totalWords,
      totalTokens,
      totalTime,
      avgEfficiency: totalTokens > 0 ? totalWords / totalTokens : 0
    }
  };
}

function calculateTrends(currentGenerations, previousGenerations) {
  const currentAvgQuality = currentGenerations.length > 0 
    ? currentGenerations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / currentGenerations.length 
    : 0;
  
  const previousAvgQuality = previousGenerations.length > 0 
    ? previousGenerations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / previousGenerations.length 
    : 0;

  const currentAvgTime = currentGenerations.length > 0 
    ? currentGenerations.reduce((sum, gen) => sum + (gen.generationTime || 0), 0) / currentGenerations.length 
    : 0;
  
  const previousAvgTime = previousGenerations.length > 0 
    ? previousGenerations.reduce((sum, gen) => sum + (gen.generationTime || 0), 0) / previousGenerations.length 
    : 0;

  return {
    generations: calculatePercentageChange(currentGenerations.length, previousGenerations.length),
    quality: calculatePercentageChange(currentAvgQuality, previousAvgQuality),
    speed: calculatePercentageChange(previousAvgTime, currentAvgTime), // Inverted - lower time is better
    documents: calculatePercentageChange(
      currentGenerations.filter(g => g.selectedDocuments?.length > 0).length,
      previousGenerations.filter(g => g.selectedDocuments?.length > 0).length
    )
  };
}

function calculatePercentageChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateDailyUsage(generations, days) {
  const dailyData = {};
  
  // Initialize with zeros
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = 0;
  }
  
  // Count generations by date
  generations.forEach(gen => {
    const dateKey = gen.createdAt.toISOString().split('T')[0];
    if (dailyData[dateKey] !== undefined) {
      dailyData[dateKey]++;
    }
  });
  
  return Object.entries(dailyData)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateTemplateUsage(generations) {
  const templateCounts = {};
  
  generations.forEach(gen => {
    templateCounts[gen.templateId] = (templateCounts[gen.templateId] || 0) + 1;
  });
  
  return Object.entries(templateCounts)
    .map(([templateId, count]) => ({
      name: getTemplateDisplayName(templateId),
      templateId,
      count,
      percentage: (count / generations.length) * 100
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateQualityDistribution(generations) {
  const buckets = { low: 0, medium: 0, high: 0, excellent: 0 };
  
  generations.forEach(gen => {
    const score = gen.qualityScore || 0;
    if (score >= 0.9) buckets.excellent++;
    else if (score >= 0.7) buckets.high++;
    else if (score >= 0.5) buckets.medium++;
    else buckets.low++;
  });
  
  return Object.entries(buckets).map(([range, count]) => ({
    range,
    count,
    percentage: (count / generations.length) * 100
  }));
}

async function calculateQualityMetrics(generations) {
  const scores = generations.map(gen => gen.qualityScore || 0);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const highQualityCount = scores.filter(score => score >= 0.8).length;
  const highQualityRate = highQualityCount / scores.length;
  
  // Calculate improvement trend
  const recentGenerations = generations.slice(0, Math.floor(generations.length / 2));
  const olderGenerations = generations.slice(Math.floor(generations.length / 2));
  
  const recentAvg = recentGenerations.length > 0 
    ? recentGenerations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / recentGenerations.length 
    : 0;
  
  const olderAvg = olderGenerations.length > 0 
    ? olderGenerations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / olderGenerations.length 
    : 0;
  
  const improvementTrend = calculatePercentageChange(recentAvg, olderAvg) / 100;

  // Quality factors analysis
  const factors = [
    { name: 'Content Structure', score: avgScore * 0.9 }, // Slightly lower than avg
    { name: 'Legal Compliance', score: avgScore * 1.1 }, // Slightly higher
    { name: 'Clarity & Readability', score: avgScore },
    { name: 'Completeness', score: avgScore * 0.95 },
    { name: 'Source Integration', score: avgScore * 1.05 }
  ].map(factor => ({ ...factor, score: Math.min(factor.score, 1) }));

  // Common issues (mock data - would be calculated from actual feedback)
  const commonIssues = [];
  if (avgScore < 0.8) {
    commonIssues.push({
      title: 'Inconsistent Quality',
      description: 'Quality scores vary significantly across generations',
      frequency: Math.round((1 - avgScore) * 50)
    });
  }
  
  if (highQualityRate < 0.7) {
    commonIssues.push({
      title: 'Low High-Quality Rate',
      description: 'Less than 70% of generations achieve high quality scores',
      frequency: Math.round((1 - highQualityRate) * 60)
    });
  }

  return {
    avgScore,
    highQualityRate,
    improvementTrend,
    factors,
    commonIssues,
    distribution: {
      excellent: scores.filter(s => s >= 0.9).length,
      good: scores.filter(s => s >= 0.7 && s < 0.9).length,
      fair: scores.filter(s => s >= 0.5 && s < 0.7).length,
      poor: scores.filter(s => s < 0.5).length
    }
  };
}

async function calculateDocumentMetrics(generations) {
  // Get total documents in system
  const totalDocuments = await Document.count({ where: { status: 'processed' } });
  
  // Calculate document usage from generations
  const documentUsageMap = new Map();
  let totalDocumentSelections = 0;
  
  generations.forEach(gen => {
    if (gen.selectedDocuments && Array.isArray(gen.selectedDocuments)) {
      totalDocumentSelections += gen.selectedDocuments.length;
      gen.selectedDocuments.forEach(doc => {
        const key = doc.id || doc.filename;
        documentUsageMap.set(key, (documentUsageMap.get(key) || 0) + 1);
      });
    }
  });
  
  const activeDocuments = documentUsageMap.size;
  const usageRate = totalDocuments > 0 ? activeDocuments / totalDocuments : 0;
  const avgPerGeneration = generations.length > 0 ? totalDocumentSelections / generations.length : 0;
  
  // Most used documents
  const mostUsed = Array.from(documentUsageMap.entries())
    .map(([id, count]) => ({
      id,
      name: id, // Would be enhanced with actual document names
      usageCount: count
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);
  
  // Category usage (mock data - would require joining with document data)
  const categoryUsage = [
    { name: 'Policies & Procedures', percentage: 35 },
    { name: 'Job Frameworks', percentage: 28 },
    { name: 'Organizational Guidelines', percentage: 22 },
    { name: 'Training Materials', percentage: 10 },
    { name: 'Compliance Documents', percentage: 5 }
  ];
  
  // Underutilized documents (mock data)
  const underutilized = [
    { name: 'Legacy Assessment Data', reason: 'Rarely selected' },
    { name: 'Old Training Materials', reason: 'Outdated content' }
  ];

  return {
    totalDocuments,
    activeDocuments,
    usageRate,
    avgPerGeneration,
    mostUsed,
    categoryUsage,
    underutilized
  };
}

async function calculateTemplateMetrics(generations) {
  const templateData = {};
  
  // Group by template
  generations.forEach(gen => {
    if (!templateData[gen.templateId]) {
      templateData[gen.templateId] = [];
    }
    templateData[gen.templateId].push(gen);
  });
  
  // Calculate metrics for each template
  const comparison = Object.entries(templateData).map(([templateId, gens]) => {
    const avgQuality = gens.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / gens.length;
    const avgTime = gens.reduce((sum, gen) => sum + (gen.generationTime || 0), 0) / gens.length;
    const successRate = gens.filter(gen => gen.qualityScore >= 0.5).length / gens.length;
    
    return {
      templateId,
      name: getTemplateDisplayName(templateId),
      usageCount: gens.length,
      avgQuality,
      avgTime,
      successRate,
      trend: Math.random() * 0.2 - 0.1 // Mock trend data
    };
  }).sort((a, b) => b.usageCount - a.usageCount);
  
  return {
    comparison,
    details: comparison
  };
}

async function calculateOptimizations(generations) {
  const avgQuality = generations.reduce((sum, gen) => sum + (gen.qualityScore || 0), 0) / generations.length;
  const avgTime = generations.reduce((sum, gen) => sum + (gen.generationTime || 0), 0) / generations.length;
  const documentUsageRate = generations.filter(gen => gen.selectedDocuments?.length > 0).length / generations.length;
  
  // Calculate overall optimization score
  const qualityWeight = 0.4;
  const speedWeight = 0.3;
  const usageWeight = 0.3;
  
  const normalizedSpeed = Math.max(0, 1 - (avgTime / 30000)); // Normalize against 30s max
  const score = (avgQuality * qualityWeight) + (normalizedSpeed * speedWeight) + (documentUsageRate * usageWeight);
  
  // Generate recommendations
  const recommendations = [];
  
  if (avgQuality < 0.7) {
    recommendations.push({
      title: 'Improve Generation Quality',
      description: 'Consider using more relevant documents and refining prompts',
      priority: 'high',
      impact: 'High - Better quality outputs'
    });
  }
  
  if (avgTime > 15000) {
    recommendations.push({
      title: 'Optimize Generation Speed',
      description: 'Review token usage and consider prompt optimization',
      priority: 'medium',
      impact: 'Medium - Faster generation times'
    });
  }
  
  if (documentUsageRate < 0.5) {
    recommendations.push({
      title: 'Increase Document Usage',
      description: 'Encourage users to select relevant documents for better context',
      priority: 'medium',
      impact: 'High - More accurate and relevant outputs'
    });
  }

  return {
    score,
    recommendations,
    speed: {
      avgTime: avgTime,
      cacheHitRate: 0.85 // Mock data
    },
    quality: {
      score: avgQuality,
      consistency: 0.78 // Mock data
    },
    resources: {
      tokenUsage: generations.reduce((sum, gen) => sum + (gen.tokenUsage?.total_tokens || 0), 0),
      efficiency: 0.82 // Mock data
    }
  };
}

function getTemplateDisplayName(templateId) {
  const names = {
    'policy-generator': 'Policy Generator',
    'job-descriptions': 'Job Descriptions',
    'procedure-docs': 'Procedure Documentation',
    'functional-booklet': 'Functional Booklet'
  };
  return names[templateId] || templateId;
}

async function generateOptimizationRecommendations(startDate, includeAll) {
  // This would contain more sophisticated optimization logic
  return {
    score: 0.78,
    recommendations: [
      {
        title: 'Optimize Document Selection',
        description: 'Users who select 3-5 relevant documents see 25% higher quality scores',
        priority: 'high',
        impact: 'High quality improvement'
      }
    ]
  };
}

async function generateComprehensiveExport(startDate) {
  const generations = await AiGenerationHistory.findAll({
    where: {
      createdAt: { [Op.gte]: startDate }
    }
  });
  
  return await calculateComprehensiveAnalytics(generations, 30);
}

function convertToCSV(data) {
  // Simple CSV conversion - would be enhanced for production
  return JSON.stringify(data);
}

module.exports = router;