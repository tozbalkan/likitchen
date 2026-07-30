import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Fitness Functions & Linter Suite (Hardening v1.4)', () => {
  const rootDir = path.resolve(__dirname, '../../../src');
  const applicationDir = path.join(rootDir, 'application');
  const domainDir = path.join(rootDir, 'domain');
  const toolDispatcherPath = path.join(
    rootDir,
    'application/agent/services/tool-dispatcher.ts',
  );
  const toolResultPath = path.join(
    rootDir,
    'application/agent/vo/tool-result.ts',
  );

  function scanTsFiles(
    dir: string,
    callback: (filePath: string, content: string) => void,
  ): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanTsFiles(fullPath, callback);
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts')
      ) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        callback(fullPath, content);
      }
    }
  }

  it('1. [ADR-018] ToolDispatcher NEVER imports ProviderSelector, Memory, Cache, or Provider Adapters', () => {
    const content = fs.readFileSync(toolDispatcherPath, 'utf-8');

    expect(content).not.toContain('ProviderSelector');
    expect(content).not.toContain('MemoryPort');
    expect(content).not.toContain('Cache');
    expect(content).not.toContain('OpenAiChatAdapter');
    expect(content).not.toContain('AnthropicChatAdapter');
  });

  it('2. [ADR-018] ToolDispatcher NEVER contains tool selection logic (strictly dispatches by toolId)', () => {
    const content = fs.readFileSync(toolDispatcherPath, 'utf-8');

    expect(content).not.toContain('selectTool');
    expect(content).not.toContain('recommendTool');
    expect(content).not.toContain('switch (');
  });

  it('3. [ADR-018] ToolResult VO NEVER imports LLMContentPart or LLM transport structures', () => {
    const content = fs.readFileSync(toolResultPath, 'utf-8');

    expect(content).not.toContain('LLMContentPart');
    expect(content).not.toContain('LLMMessage');
    expect(content).not.toContain('LLMChoice');
  });

  it('4. [ADR-009] Application layer files NEVER import Infrastructure layer modules', () => {
    scanTsFiles(applicationDir, (filePath, content) => {
      expect(
        content,
        `Forbidden infrastructure import found in ${filePath}`,
      ).not.toMatch(/from\s+['"].*\/infrastructure\//);
    });
  });

  it('5. [Fitness Function] Application layer NEVER calls fetch() directly (restricted to Infrastructure)', () => {
    scanTsFiles(applicationDir, (filePath, content) => {
      expect(
        content,
        `Forbidden direct fetch() call in Application layer: ${filePath}`,
      ).not.toMatch(/\bfetch\s*\(/);
    });
  });

  it('6. [Fitness Function] Application layer NEVER reads process.env directly (restricted to Config Adapters)', () => {
    scanTsFiles(applicationDir, (filePath, content) => {
      expect(
        content,
        `Forbidden process.env access in Application layer: ${filePath}`,
      ).not.toContain('process.env');
    });
  });

  it('7. [Fitness Function] Pure Domain Core NEVER calls Math.random() directly', () => {
    scanTsFiles(domainDir, (filePath, content) => {
      expect(
        content,
        `Forbidden Math.random() call in Domain Core: ${filePath}`,
      ).not.toContain('Math.random()');
    });
  });
});
