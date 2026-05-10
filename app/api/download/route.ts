import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.github.com/repos/puspoaditya/ai-interview-copilot/releases/latest',
      {
        headers: { 'User-Agent': 'ai-copilot-web' },
        next: { revalidate: 300 }, // cache 5 minutes
      }
    );

    if (!res.ok) throw new Error('GitHub API error');

    const release = await res.json();

    const asset = release.assets?.find(
      (a: { name: string }) => a.name.includes('Setup') && a.name.endsWith('.exe')
    );

    if (!asset) throw new Error('No setup asset found');

    return NextResponse.redirect(asset.browser_download_url);
  } catch {
    // Fallback to GitHub releases page
    return NextResponse.redirect(
      'https://github.com/puspoaditya/ai-interview-copilot/releases/latest'
    );
  }
}
