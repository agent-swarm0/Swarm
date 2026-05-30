import { NextRequest } from 'next/server';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

function getFilesRecursively(dir: string, baseDir: string = dir): { path: string; size: number }[] {
  let results: { path: string; size: number }[] = [];
  if (!existsSync(dir)) return results;
  
  try {
    const list = readdirSync(dir);
    list.forEach(file => {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath, baseDir));
      } else {
        results.push({
          path: relative(baseDir, fullPath).replace(/\\/g, '/'),
          size: stat.size
        });
      }
    });
  } catch (e) {
    console.error('[Preview API] Failed to scan recursively:', e);
  }
  return results;
}

export async function GET(req: NextRequest) {
  try {
    const baseDir = join(process.cwd(), '../project-output');
    const filePath = join(baseDir, 'index.html');
    
    // If index.html exists, serve it directly
    if (existsSync(filePath)) {
      const content = readFileSync(filePath);
      return new Response(content, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, must-revalidate',
        },
      });
    }
    
    // Fallback: Check for other files in output directory
    const files = getFilesRecursively(baseDir);
    
    if (files.length === 0) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Preview Status</title>
          <style>
            body { background: #09090b; color: #a1a1aa; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .box { text-align: center; border: 1px solid #27272a; padding: 2rem; border-radius: 12px; background: #18181b; max-width: 400px; }
            h3 { color: #f4f4f5; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="box">
            <h3>No Active Output</h3>
            <p>The Swarm has not generated any files yet. Enter your goal and start orchestration first!</p>
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }
    
    // Generate beautiful landing catalog page for all files
    const fileRows = files.map(file => {
      const ext = file.path.split('.').pop() || '';
      let icon = '📄';
      if (ext === 'html') icon = '🌐';
      else if (ext === 'css') icon = '🎨';
      else if (ext === 'js' || ext === 'ts' || ext === 'tsx') icon = '⚙️';
      else if (ext === 'py') icon = '🐍';
      else if (ext === 'sol') icon = '🛡️';
      else if (ext === 'json') icon = '🔧';
      else if (ext === 'md') icon = '📝';
      
      const sizeStr = file.size > 1024 
        ? `${(file.size / 1024).toFixed(1)} KB` 
        : `${file.size} B`;
        
      return `
        <a href="/api/preview/${file.path}" class="file-row">
          <div class="file-name">
            <span>${icon}</span>
            <span>${file.path}</span>
          </div>
          <span class="file-size">${sizeStr}</span>
        </a>
      `;
    }).join('');
    
    const catalogHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Swarm Generated Assets Explorer</title>
        <style>
          body { background: #09090b; color: #a1a1aa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; margin: 0; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #f4f4f5; font-size: 26px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
          p { font-size: 14px; margin-bottom: 24px; color: #71717a; }
          .file-grid { border: 1px solid #27272a; border-radius: 12px; overflow: hidden; background: #18181b/60; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
          .file-row { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #27272a; text-decoration: none; color: #e4e4e7; font-family: monospace; font-size: 13px; transition: all 0.2s ease; }
          .file-row:hover { background: #27272a; color: #34d399; }
          .file-row:last-child { border-bottom: none; }
          .file-name { display: flex; align-items: center; gap: 10px; font-weight: 600; }
          .file-size { color: #71717a; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📁 Workspace Output Files</h1>
          <p>The Swarm has successfully written the following files inside your local workspace's <code>/project-output/</code> directory. Click any file to preview its syntax-highlighted code output:</p>
          <div class="file-grid">
            ${fileRows}
          </div>
        </div>
      </body>
      </html>
    `;
    
    return new Response(catalogHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
