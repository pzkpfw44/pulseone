// backend/scripts/setup.js
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const { setupDirectories, setupDatabase, verifySetup } = require('./initDatabase');

async function createEnvFile() {
  const envPath = path.join(__dirname, '../.env');
  const envExamplePath = path.join(__dirname, '../.env.example');
  
  try {
    // Check if .env already exists
    await fs.access(envPath);
    console.log('✓ .env file already exists');
    return;
  } catch (error) {
    // .env doesn't exist, create it from example
    try {
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      console.log('✓ Created .env file from template');
      console.log('⚠️  Please update the .env file with your configuration');
    } catch (err) {
      console.error('❌ Failed to create .env file:', err);
    }
  }
}

async function installDependencies() {
  console.log('📦 Installing backend dependencies...');
  try {
    execSync('npm install', { 
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit'
    });
    console.log('✓ Backend dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install backend dependencies:', error);
    throw error;
  }
}

async function installFrontendDependencies() {
  console.log('📦 Installing frontend dependencies...');
  try {
    execSync('npm install', { 
      cwd: path.join(__dirname, '../../frontend'),
      stdio: 'inherit'
    });
    console.log('✓ Frontend dependencies installed');
  } catch (error) {
    console.error('❌ Failed to install frontend dependencies:', error);
    throw error;
  }
}

async function displaySetupInstructions() {
  console.log('\n🎉 Pulse One Enhanced Knowledge Feed Setup Complete!\n');
  
  console.log('📋 Next Steps:');
  console.log('1. Configure your environment:');
  console.log('   - Edit backend/.env with your settings');
  console.log('   - Optionally add Flux AI API key for enhanced categorization');
  console.log('');
  
  console.log('2. Start the development servers:');
  console.log('   Backend:  cd backend && npm run dev');
  console.log('   Frontend: cd frontend && npm run dev');
  console.log('');
  
  console.log('3. Open your browser:');
  console.log('   - Frontend: http://localhost:5173');
  console.log('   - Backend API: http://localhost:5000/api/health');
  console.log('');
  
  console.log('4. Test the Enhanced Knowledge Feed:');
  console.log('   - Login with: admin@pulseone.com / admin123');
  console.log('   - Go to Knowledge Feed');
  console.log('   - Upload a document (PDF, DOCX, etc.)');
  console.log('   - Watch AI process and categorize it');
  console.log('');
  
  console.log('🚀 Features Ready:');
  console.log('   ✓ Intelligent file processing');
  console.log('   ✓ AI-powered categorization');
  console.log('   ✓ Dynamic category creation');
  console.log('   ✓ File size validation and warnings');
  console.log('   ✓ Real-time processing status');
  console.log('   ✓ Enhanced dashboard with metrics');
  console.log('   ✓ Comprehensive error handling');
  console.log('   ✓ Performance monitoring');
  console.log('');
  
  console.log('📚 Supported File Types:');
  console.log('   - PDF (.pdf)');
  console.log('   - Word Documents (.doc, .docx)');
  console.log('   - Excel Spreadsheets (.xls, .xlsx)');
  console.log('   - PowerPoint (.pptx)');
  console.log('   - Text Files (.txt)');
  console.log('   - CSV Files (.csv)');
  console.log('   - Images (.jpg, .jpeg, .png)');
  console.log('');
  
  console.log('⚙️  Advanced Configuration:');
  console.log('   - File size limits: Configurable in .env');
  console.log('   - AI categorization: Optional Flux AI integration');
  console.log('   - Processing concurrency: Adjustable for performance');
  console.log('   - Logging levels: Debug, info, warn, error');
  console.log('');
  
  console.log('🔧 Troubleshooting:');
  console.log('   - Check logs in backend/logs/');
  console.log('   - Verify database in backend/data/');
  console.log('   - Uploads stored in backend/uploads/');
  console.log('   - API health check: /api/health');
}

async function main() {
  console.log('🚀 Setting up Pulse One Enhanced Knowledge Feed...\n');
  
  try {
    // Install dependencies
    await installDependencies();
    await installFrontendDependencies();
    console.log('');
    
    // Setup environment
    await createEnvFile();
    console.log('');
    
    // Setup directories and database
    await setupDirectories();
    await setupDatabase();
    await verifySetup();
    
    // Display instructions
    await displaySetupInstructions();
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.log('\n🔧 Manual setup steps:');
    console.log('1. Run: npm install (in both backend and frontend directories)');
    console.log('2. Copy backend/.env.example to backend/.env');
    console.log('3. Run: node backend/scripts/initDatabase.js');
    console.log('4. Start servers with: npm run dev');
    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  main();
}

module.exports = {
  createEnvFile,
  installDependencies,
  installFrontendDependencies,
  displaySetupInstructions
};