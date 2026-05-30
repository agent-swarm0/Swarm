import { NextRequest } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ path?: string[] }> }
) {
  try {
    const params = await props.params;
    const pathParts = params.path || [];
    const relativePath = pathParts.join('/');
    
    const baseDir = join(process.cwd(), '../project-output');
    const filePath = join(baseDir, relativePath || 'index.html');
    
    if (!existsSync(filePath)) {
      return new Response('File not found', { status: 404 });
    }
    
    const ext = extname(filePath).toLowerCase();
    
    // Check if the client requested standard navigation (Accept: text/html)
    const acceptsHtml = req.headers.get('accept')?.includes('text/html') || false;
    const codeExtensions = ['.sol', '.py', '.ts', '.tsx', '.json', '.md', '.css', '.js', '.config', '.yaml', '.yml'];
    const isCodeFile = codeExtensions.includes(ext);
    
    // Standalone code browser syntax-highlighted wrapper!
    if (isCodeFile && acceptsHtml) {
      const codeString = readFileSync(filePath, 'utf8');
      const escapedCode = codeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
        
      let prismLang = 'clike';
      if (ext === '.py') prismLang = 'python';
      else if (ext === '.sol') prismLang = 'solidity';
      else if (ext === '.json') prismLang = 'json';
      else if (ext === '.md') prismLang = 'markdown';
      else if (ext === '.css') prismLang = 'css';
      else if (ext === '.js') prismLang = 'javascript';
      else if (ext === '.ts' || ext === '.tsx') prismLang = 'typescript';
      
      const syntaxHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${relativePath}</title>
          <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
          <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css" rel="stylesheet" />
          <style>
            body { 
              background-color: #0b0c10; 
              color: #c5c6c7; 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              margin: 0; 
              padding: 24px; 
            }
            .header-panel { 
              display: flex; 
              align-items: center; 
              justify-content: space-between; 
              padding-bottom: 12px; 
              border-b: 1px solid #1f2833; 
              margin-bottom: 20px; 
              font-family: monospace; 
              font-size: 12px; 
              color: #66fcf1;
            }
            .btn-back {
              text-decoration: none;
              color: #34d399;
              font-weight: bold;
              border: 1px solid rgba(52, 211, 153, 0.3);
              padding: 5px 12px;
              border-radius: 6px;
              background: rgba(52, 211, 153, 0.05);
              transition: all 0.2s;
            }
            .btn-back:hover {
              background: rgba(52, 211, 153, 0.15);
              border-color: rgba(52, 211, 153, 0.6);
            }
            pre[class*="language-"] { 
              border-radius: 10px; 
              border: 1px solid #1f2833; 
              background: #0f1115 !important; 
              padding: 24px; 
              font-size: 13px; 
              max-height: 85vh; 
              overflow: auto; 
              box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            }
            code { 
              font-family: "Fira Code", Consolas, Monaco, monospace !important; 
            }
          </style>
        </head>
        <body class="line-numbers">
          <div class="header-panel">
            <span>📄 ${relativePath}</span>
            <a href="/api/preview" class="btn-back">⬅ Workspace Directory</a>
          </div>
          <pre><code class="language-${prismLang}">${escapedCode}</code></pre>
          
          <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
        </body>
        </html>
      `;
      
      return new Response(syntaxHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, must-revalidate',
        },
      });
    }

    let contentType = 'text/plain';
    if (ext === '.html') contentType = 'text/html';
    else if (ext === '.css') contentType = 'text/css';
    else if (ext === '.js') contentType = 'application/javascript';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.json') contentType = 'application/json';
    else if (ext === '.ico') contentType = 'image/x-icon';
    
    const content = readFileSync(filePath);
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
