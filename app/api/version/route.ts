import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // Vercel otomatik env değişkenleri
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF || '';
  const vercelRepo = process.env.VERCEL_GIT_REPO_SLUG || '';
  // Lokal geliştirmede git komutu ile fallback (try/catch)
  let localSha = '';
  if (!vercelSha) {
    try {
      const { execSync } = await import('node:child_process');
      localSha = execSync('git rev-parse HEAD').toString().trim();
    } catch (_) {}
  }
  const sha = vercelSha || localSha || 'UNKNOWN';
  return NextResponse.json({
    sha,
    shortSha: sha.substring(0,7),
    branch: vercelBranch || 'local',
    repository: vercelRepo || 'local',
    timestamp: new Date().toISOString(),
  });
}
