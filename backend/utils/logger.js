// backend/utils/logger.js
const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` | META: ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for general logs
    new winston.transports.File({
      filename: path.join(logsDir, 'pulse-one.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3
    }),
    
    // File transport for knowledge feed specific logs
    new winston.transports.File({
      filename: path.join(logsDir, 'knowledge-feed.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Create specialized loggers for different components
const createComponentLogger = (component) => {
  return {
    error: (message, meta = {}) => logger.error(`[${component}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${component}] ${message}`, meta),
    info: (message, meta = {}) => logger.info(`[${component}] ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`[${component}] ${message}`, meta),
    http: (message, meta = {}) => logger.http(`[${component}] ${message}`, meta)
  };
};

// Component-specific loggers
const knowledgeFeedLogger = createComponentLogger('KNOWLEDGE-FEED');
const fileProcessorLogger = createComponentLogger('FILE-PROCESSOR');
const categorizationLogger = createComponentLogger('CATEGORIZATION');
const ragLogger = createComponentLogger('RAG');
const apiLogger = createComponentLogger('API');

// Error handling utilities
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
    this.type = 'validation';
  }
}

class ProcessingError extends AppError {
  constructor(message, stage = null, documentId = null) {
    super(message, 422);
    this.stage = stage;
    this.documentId = documentId;
    this.type = 'processing';
  }
}

class FileError extends AppError {
  constructor(message, filename = null, fileSize = null) {
    super(message, 413);
    this.filename = filename;
    this.fileSize = fileSize;
    this.type = 'file';
  }
}

// Global error handler
const handleError = (error, req = null, res = null) => {
  const {
    message,
    statusCode = 500,
    isOperational = false,
    stack
  } = error;

  // Log the error
  const logContext = {
    error: message,
    statusCode,
    isOperational,
    stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    url: req?.url,
    method: req?.method,
    userAgent: req?.get('User-Agent'),
    ip: req?.ip
  };

  if (statusCode >= 500) {
    logger.error('Server Error', logContext);
  } else {
    logger.warn('Client Error', logContext);
  }

  // Send response if res object is provided
  if (res && !res.headersSent) {
    const response = {
      success: false,
      error: message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack })
    };

    res.status(statusCode).json(response);
  }

  // Exit process for unhandled errors in production
  if (!isOperational && process.env.NODE_ENV === 'production') {
    logger.error('Unhandled error, shutting down...', logContext);
    process.exit(1);
  }
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  apiLogger.http(`${req.method} ${req.url}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    
    apiLogger[logLevel](`${req.method} ${req.url} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      statusCode: res.statusCode
    });
  });

  next();
};

// Performance monitoring
const performanceMonitor = {
  startTimer: (label) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        logger.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
  },

  trackMemory: (label) => {
    const used = process.memoryUsage();
    logger.debug(`Memory Usage: ${label}`, {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`
    });
  }
};

module.exports = {
  logger,
  knowledgeFeedLogger,
  fileProcessorLogger,
  categorizationLogger,
  ragLogger,
  apiLogger,
  AppError,
  ValidationError,
  ProcessingError,
  FileError,
  handleError,
  requestLogger,
  performanceMonitor
};