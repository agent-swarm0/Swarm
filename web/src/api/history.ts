import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';

function copyDir(src: string, dest: string) {
  if (!existsSync(src)) return;
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  try {
    const entries = readdirSync(src);
    for (const entry of entries) {
      const srcPath = join(src, entry);
      const destPath = join(dest, entry);
      const stat = statSync(srcPath);
      if (stat.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  } catch (e: any) {
    console.error(`[HistoryStore] Failed to copy directory from ${src} to ${dest}:`, e.message);
  }
}

export function saveProjectToHistory(sessionId: string, goal: string, files: string[]) {
  const outputDir = join(process.cwd(), '../project-output');
  const historyBaseDir = join(process.cwd(), '../project-history');
  const targetDir = join(historyBaseDir, sessionId);
  
  if (!existsSync(outputDir)) return;
  
  try {
    // Copy all compiled output files to history vault
    copyDir(outputDir, targetDir);
    
    // Extrapolate a nice friendly title from goal
    const cleanGoal = goal.replace(/[\r\n]+/g, ' ').trim();
    let title = cleanGoal;
    if (cleanGoal.length > 50) {
      title = cleanGoal.substring(0, 47) + '...';
    }
    
    // Save project session metadata
    const metadata = {
      sessionId,
      title: title || 'Unnamed Project',
      prompt: goal,
      createdAt: new Date().toISOString(),
      files
    };
    
    writeFileSync(join(targetDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
    console.log(`[HistoryStore] Successfully saved project ${sessionId} to history.`);
  } catch (e: any) {
    console.error(`[HistoryStore] Error saving project to history:`, e.message);
  }
}

export function listProjectsHistory() {
  const historyBaseDir = join(process.cwd(), '../project-history');
  if (!existsSync(historyBaseDir)) return [];
  
  try {
    const sessions = readdirSync(historyBaseDir);
    const historyList = [];
    
    for (const sessionId of sessions) {
      const metadataPath = join(historyBaseDir, sessionId, 'metadata.json');
      if (existsSync(metadataPath)) {
        try {
          const raw = readFileSync(metadataPath, 'utf8');
          historyList.push(JSON.parse(raw));
        } catch (e) {
          console.warn(`[HistoryStore] Failed to read metadata for ${sessionId}`);
        }
      }
    }
    
    return historyList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e: any) {
    console.error(`[HistoryStore] Failed to list projects history:`, e.message);
    return [];
  }
}

export function restoreProjectFromHistory(sessionId: string) {
  const outputDir = join(process.cwd(), '../project-output');
  const historyBaseDir = join(process.cwd(), '../project-history');
  const targetDir = join(historyBaseDir, sessionId);
  
  if (!existsSync(targetDir)) {
    throw new Error(`Project ${sessionId} does not exist in history vault.`);
  }
  
  try {
    const { rmSync } = require('fs');
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true, force: true });
    }
    mkdirSync(outputDir, { recursive: true });
    
    copyDir(targetDir, outputDir);
    console.log(`[HistoryStore] Successfully restored project ${sessionId} to workspace output.`);
  } catch (e: any) {
    console.error(`[HistoryStore] Error restoring project from history:`, e.message);
    throw e;
  }
}
