import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  parseAndValidateManifest,
  verifyFrozenCapabilities,
  type ArchitectureManifest,
} from './check-frozen';

describe('Manifest-Driven Frozen Capability Verification Test Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const realManifestPath = path.resolve(
    repoRoot,
    '.ai/capabilities/architecture-manifest.json',
  );

  it('1. current repository passes all frozen checks cleanly', () => {
    const result = verifyFrozenCapabilities({
      repoRoot,
      manifestPath: realManifestPath,
    });

    expect(result.success).toBe(true);
    expect(result.manifestVersion).toBe('v1.4.0');
    expect(result.totalFrozen).toBe(11);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  describe('2. malformed manifest entries fail validation', () => {
    it('fails when manifest is not valid JSON', () => {
      expect(() => parseAndValidateManifest('not valid json {')).toThrow(
        /Malformed manifest JSON/,
      );
    });

    it('fails when manifest version is unsupported (e.g. v1.2.0)', () => {
      const invalid = JSON.stringify({
        version: 'v1.2.0',
        frozenCapabilities: [],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /Unsupported manifest version "v1.2.0"/,
      );
    });

    it('fails when manifest version lacks "v" prefix (e.g. 1.4.0)', () => {
      const invalid = JSON.stringify({
        version: '1.4.0',
        frozenCapabilities: [],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /Unsupported manifest version "1.4.0". Expected version "v1.4.0"/,
      );
    });

    it('fails when frozenCapabilities is not an array', () => {
      const invalid = JSON.stringify({
        version: 'v1.4.0',
        frozenCapabilities: 'not-an-array',
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /"frozenCapabilities" must be an array/,
      );
    });

    it('fails when an entry is missing an id', () => {
      const invalid = JSON.stringify({
        version: 'v1.4.0',
        frozenCapabilities: [
          { commit: '1234567', paths: ['src/test/'], status: 'frozen' },
        ],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /invalid or missing "id"/,
      );
    });

    it('fails when an entry is missing a commit SHA', () => {
      const invalid = JSON.stringify({
        version: 'v1.4.0',
        frozenCapabilities: [
          { id: 'cap-test', paths: ['src/test/'], status: 'frozen' },
        ],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /invalid or missing "commit"/,
      );
    });

    it('fails when an entry has an empty paths array', () => {
      const invalid = JSON.stringify({
        version: 'v1.4.0',
        frozenCapabilities: [
          { id: 'cap-test', commit: '1234567', paths: [], status: 'frozen' },
        ],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /must define a non-empty "paths" array/,
      );
    });

    it('fails when an entry is missing status', () => {
      const invalid = JSON.stringify({
        version: 'v1.4.0',
        frozenCapabilities: [
          { id: 'cap-test', commit: '1234567', paths: ['src/test/'] },
        ],
      });
      expect(() => parseAndValidateManifest(invalid)).toThrow(
        /must define a "status" string/,
      );
    });
  });

  it('3. nonexistent baseline commit fails', () => {
    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'test-fake-cap',
          commit: 'deadbeef1234567890abcdef1234567890abcdef',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-missing-commit.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
      });

      expect(result.success).toBe(false);
      const capResult = result.results.find((r) => r.id === 'test-fake-cap');
      expect(capResult?.passed).toBe(false);
      expect(capResult?.error).toContain(
        'does not exist in repository git history',
      );
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('4. modified frozen tracked file fails', () => {
    // Mock gitExec to simulate a diff error on tracked file modification
    const mockGitExec = (cmd: string): string => {
      if (cmd.startsWith('git rev-parse')) return 'mock-commit-hash';
      if (cmd.startsWith('git diff')) {
        const error = new Error('Command failed: git diff');
        (error as unknown as { stdout: string }).stdout =
          'M src/application/planning/vo/autonomous-plan.ts\n+ // unauthorized change';
        throw error;
      }
      if (cmd.startsWith('git ls-files')) return '';
      return '';
    };

    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'capability-028',
          commit: 'a8d214e',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-modified-file.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
        gitExec: mockGitExec,
      });

      expect(result.success).toBe(false);
      expect(result.results[0]?.passed).toBe(false);
      expect(result.results[0]?.diffOutput).toContain('unauthorized change');
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('5. newly added file inside frozen directory fails', () => {
    // Mock gitExec to simulate untracked file detected in frozen path
    const mockGitExec = (cmd: string): string => {
      if (cmd.startsWith('git rev-parse')) return 'mock-commit-hash';
      if (cmd.startsWith('git diff')) return '';
      if (cmd.startsWith('git ls-files')) {
        return 'src/application/planning/rogue-untracked-file.ts';
      }
      return '';
    };

    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'capability-028',
          commit: 'a8d214e',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-untracked.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
        gitExec: mockGitExec,
      });

      expect(result.success).toBe(false);
      expect(result.results[0]?.passed).toBe(false);
      expect(result.results[0]?.error).toContain(
        'Untracked files detected in frozen paths: src/application/planning/rogue-untracked-file.ts',
      );
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('6. deleted frozen file fails', () => {
    // Mock gitExec to simulate deleted file diff
    const mockGitExec = (cmd: string): string => {
      if (cmd.startsWith('git rev-parse')) return 'mock-commit-hash';
      if (cmd.startsWith('git diff')) {
        const error = new Error('Command failed: git diff');
        (error as unknown as { stdout: string }).stdout =
          'D src/application/planning/vo/autonomous-plan.ts';
        throw error;
      }
      if (cmd.startsWith('git ls-files')) return '';
      return '';
    };

    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'capability-028',
          commit: 'a8d214e',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-deleted.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
        gitExec: mockGitExec,
      });

      expect(result.success).toBe(false);
      expect(result.results[0]?.passed).toBe(false);
      expect(result.results[0]?.diffOutput).toContain(
        'D src/application/planning',
      );
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('7. unrelated file outside frozen paths does NOT fail', () => {
    // Calling verifyFrozenCapabilities executes git diff targeting ONLY the frozen paths.
    // An edit outside (e.g. in src/app/ or scripts/) never enters the git diff arguments.
    let executedPaths = '';
    const mockGitExec = (cmd: string): string => {
      if (cmd.startsWith('git rev-parse')) return 'mock-commit';
      if (cmd.startsWith('git diff')) {
        executedPaths = cmd;
        return '';
      }
      if (cmd.startsWith('git ls-files')) return '';
      return '';
    };

    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'capability-028',
          commit: 'a8d214e',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-scoped.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
        gitExec: mockGitExec,
      });

      expect(result.success).toBe(true);
      expect(executedPaths).toContain('"src/application/planning/"');
      expect(executedPaths).not.toContain('src/app/');
      expect(executedPaths).not.toContain('scripts/');
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('8. non-frozen capability entry does NOT participate in verification', () => {
    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: 'capability-030-in-progress',
          commit: 'some-commit',
          paths: ['src/app/api/webhooks/whatsapp/route.ts'],
          status: 'in_progress', // NOT 'frozen'
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-non-frozen.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
      });

      expect(result.success).toBe(true);
      expect(result.totalFrozen).toBe(0);
      expect(result.results.length).toBe(0);
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });

  it('9. all frozen metadata comes from manifest, not a hidden duplicate hardcoded list', () => {
    // Provide a manifest with a dynamic synthetic capability ID
    const syntheticId = `custom-synthetic-cap-${Date.now()}`;
    const fakeManifest: ArchitectureManifest = {
      version: 'v1.4.0',
      frozenCapabilities: [
        {
          id: syntheticId,
          name: 'Synthetic Dynamic Capability',
          commit: 'a8d214e',
          paths: ['src/application/planning/'],
          status: 'frozen',
        },
      ],
    };

    const tempManifestPath = path.resolve(
      repoRoot,
      'scripts/.test-manifest-dynamic.json',
    );
    fs.writeFileSync(tempManifestPath, JSON.stringify(fakeManifest, null, 2));

    try {
      const result = verifyFrozenCapabilities({
        repoRoot,
        manifestPath: tempManifestPath,
      });

      expect(result.success).toBe(true);
      expect(result.totalFrozen).toBe(1);
      expect(result.results[0]?.id).toBe(syntheticId);
      expect(result.results[0]?.name).toBe('Synthetic Dynamic Capability');
      expect(result.results[0]?.commit).toBe('a8d214e');
      expect(result.results[0]?.passed).toBe(true);
    } finally {
      if (fs.existsSync(tempManifestPath)) fs.unlinkSync(tempManifestPath);
    }
  });
});
