import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Decision Tests (ADR Rules Verification)', () => {
  const rootDir = path.resolve(__dirname, '../../../src');
  const toolDispatcherPath = path.join(
    rootDir,
    'application/agent/services/tool-dispatcher.ts',
  );
  const toolResultPath = path.join(
    rootDir,
    'application/agent/vo/tool-result.ts',
  );

  it('1. [ADR-018] ToolDispatcher source code NEVER imports ProviderSelector, Memory, Cache, or Provider Adapters', () => {
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
    const applicationDir = path.join(rootDir, 'application');

    function scanDirectory(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.test.ts')
        ) {
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          expect(fileContent).not.toMatch(/from\s+['"].*\/infrastructure\//);
        }
      }
    }

    scanDirectory(applicationDir);
  });
});
