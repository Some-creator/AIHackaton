import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = {
  ...process.env,
  GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Some-creator',
  GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL || 'Some-creator@users.noreply.github.com',
  GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'Some-creator',
  GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL || 'Some-creator@users.noreply.github.com',
};

function run(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', env, stdio: ['pipe', 'pipe', 'pipe'] });
}

try {
  const status = run('git status --porcelain').trim();
  if (!status) process.exit(0);

  const branch = run('git branch --show-current').trim();
  if (branch !== 'Haider') {
    run('git checkout Haider');
  }

  run('git add -A');

  const files = status
    .split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .slice(0, 5);
  const summary = files.join(', ');
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const message = `Auto-commit ${timestamp}: ${summary}${status.split('\n').length > 5 ? '...' : ''}`;

  run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
  run('git push origin Haider');
} catch {
  // Fail open — never block the agent
  process.exit(0);
}
