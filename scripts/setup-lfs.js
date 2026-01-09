import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

process.chdir(rootDir);

function getRemoteUrl() {
  // Try to get remote URL from various sources
  let remoteUrl = null;
  
  // Method 1: Try to get from git remotes
  try {
    const remotes = execSync('git remote', { encoding: 'utf-8' }).trim().split('\n');
    if (remotes.length > 0) {
      const remoteName = remotes[0]; // Use first available remote
      remoteUrl = execSync(`git remote get-url ${remoteName}`, { encoding: 'utf-8' }).trim();
      console.log(`Found remote "${remoteName}": ${remoteUrl}`);
    }
  } catch (error) {
    console.log('No git remotes found, trying other methods...');
  }
  
  // Method 2: Try Vercel environment variables
  if (!remoteUrl && process.env.VERCEL_GIT_REPO_SLUG && process.env.VERCEL_GIT_REPO_OWNER) {
    remoteUrl = `https://github.com/${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}.git`;
    console.log(`Using Vercel env vars: ${remoteUrl}`);
  }
  
  // Method 3: Try to read from .git/config
  if (!remoteUrl) {
    try {
      const gitConfig = readFileSync(join(rootDir, '.git', 'config'), 'utf-8');
      const urlMatch = gitConfig.match(/\[remote\s+"[^"]+"\]\s+url\s*=\s*(.+)/);
      if (urlMatch) {
        remoteUrl = urlMatch[1].trim();
        console.log(`Found URL in .git/config: ${remoteUrl}`);
      }
    } catch (error) {
      console.log('Could not read .git/config');
    }
  }
  
  // Method 4: Try to get from git config directly
  if (!remoteUrl) {
    try {
      remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      if (remoteUrl) {
        console.log(`Found URL from git config: ${remoteUrl}`);
      }
    } catch (error) {
      // Ignore
    }
  }
  
  // Method 5: Hardcoded fallback (update with your repo)
  if (!remoteUrl) {
    remoteUrl = 'https://github.com/danielwikstrom/WebARTest.git';
    console.log(`Using fallback URL: ${remoteUrl}`);
  }
  
  return remoteUrl;
}

function convertToLfsUrl(remoteUrl) {
  // Convert remote URL to LFS endpoint
  let lfsUrl;
  if (remoteUrl.startsWith('https://')) {
    lfsUrl = remoteUrl.replace(/\.git$/, '.git/info/lfs');
  } else if (remoteUrl.startsWith('git@')) {
    // Convert git@github.com:user/repo.git to https://github.com/user/repo.git/info/lfs
    lfsUrl = remoteUrl
      .replace(/^git@([^:]+):/, 'https://$1/')
      .replace(/\.git$/, '.git/info/lfs');
  } else {
    lfsUrl = remoteUrl.replace(/\.git$/, '.git/info/lfs');
  }
  return lfsUrl;
}

try {
  console.log('Initializing Git LFS...');
  execSync('git lfs install', { stdio: 'inherit' });
  
  console.log('Getting remote URL...');
  const remoteUrl = getRemoteUrl();
  
  if (!remoteUrl) {
    throw new Error('Could not determine repository URL');
  }
  
  const lfsUrl = convertToLfsUrl(remoteUrl);
  
  // Check if we have a GitHub token for authentication
  // Try multiple environment variable names
  const githubToken = process.env.GIT_LFS_TOKEN || 
                      process.env.GITHUB_TOKEN || 
                      process.env.VERCEL_GITHUB_TOKEN ||
                      process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  
  if (githubToken) {
    // Configure Git LFS to use the token for authentication
    // Format: https://TOKEN@github.com/user/repo.git/info/lfs
    const authenticatedLfsUrl = lfsUrl.replace(
      'https://github.com/',
      `https://${githubToken}@github.com/`
    );
    console.log(`Configuring Git LFS endpoint with authentication...`);
    execSync(`git config lfs.url "${authenticatedLfsUrl}"`, { stdio: 'inherit' });
  } else {
    console.log(`Configuring Git LFS endpoint (no token found, using public access)...`);
    execSync(`git config lfs.url "${lfsUrl}"`, { stdio: 'inherit' });
    console.warn('WARNING: No Git LFS token found. If the repository is private, LFS pull may fail.');
    console.warn('Set GIT_LFS_TOKEN, GITHUB_TOKEN, or VERCEL_GITHUB_TOKEN environment variable.');
  }
  
  console.log('Pulling Git LFS files...');
  execSync('git lfs pull', { stdio: 'inherit' });
  
  console.log('Git LFS setup complete!');
} catch (error) {
  console.error('Error setting up Git LFS:', error.message);
  console.error('Build will continue, but marker image may not be available.');
  // Don't exit with error - let the build continue
  // The app will show an error message if the marker image can't be loaded
}

