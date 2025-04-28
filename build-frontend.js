import { build } from 'vite';

async function buildFrontend() {
  console.log('Building frontend only...');
  
  try {
    await build({
      configFile: 'vite.config.ts',
      // Limit to just the frontend
      build: {
        outDir: 'dist-frontend',
      }
    });
    
    console.log('Frontend build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFrontend();