import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface FrozenCapabilityEntry {
  readonly id: string;
  readonly name?: string | undefined;
  readonly commit: string;
  readonly paths: readonly string[];
  readonly status: string;
}

export interface ArchitectureManifest {
  readonly version: string;
  readonly name?: string | undefined;
  readonly lastRefinedAt?: string | undefined;
  readonly adrBaseline?: readonly string[] | undefined;
  readonly frozenCapabilities: readonly FrozenCapabilityEntry[];
  readonly runtimeInvariants?: readonly string[] | undefined;
}

export interface CapabilityCheckResult {
  readonly id: string;
  readonly name?: string | undefined;
  readonly commit: string;
  readonly passed: boolean;
  readonly error?: string | undefined;
  readonly diffOutput?: string | undefined;
  readonly untrackedFiles?: readonly string[] | undefined;
}

export interface VerificationResult {
  readonly success: boolean;
  readonly manifestVersion: string;
  readonly totalFrozen: number;
  readonly results: readonly CapabilityCheckResult[];
}

export interface VerifyFrozenOptions {
  readonly manifestPath?: string | undefined;
  readonly repoRoot?: string | undefined;
  readonly gitExec?: ((cmd: string, cwd: string) => string) | undefined;
}

export function parseAndValidateManifest(
  manifestContent: string,
): ArchitectureManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestContent);
  } catch (e: unknown) {
    throw new Error(
      `[check:frozen] Malformed manifest JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('[check:frozen] Manifest must be a valid JSON object.');
  }

  const manifest = parsed as Record<string, unknown>;

  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    throw new Error(
      '[check:frozen] Manifest must define a non-empty "version" string.',
    );
  }

  if (manifest.version !== 'v1.4.0') {
    throw new Error(
      `[check:frozen] Unsupported manifest version "${manifest.version}". Expected version "v1.4.0".`,
    );
  }

  if (!Array.isArray(manifest.frozenCapabilities)) {
    throw new Error(
      '[check:frozen] Manifest "frozenCapabilities" must be an array.',
    );
  }

  for (let i = 0; i < manifest.frozenCapabilities.length; i++) {
    const entry = manifest.frozenCapabilities[i] as Record<string, unknown>;
    if (!entry || typeof entry !== 'object') {
      throw new Error(
        `[check:frozen] Entry at index ${i} in "frozenCapabilities" is not an object.`,
      );
    }

    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      throw new Error(
        `[check:frozen] Entry at index ${i} has invalid or missing "id".`,
      );
    }

    if (typeof entry.commit !== 'string' || !entry.commit.trim()) {
      throw new Error(
        `[check:frozen] Capability "${entry.id}" has invalid or missing "commit".`,
      );
    }

    if (!Array.isArray(entry.paths) || entry.paths.length === 0) {
      throw new Error(
        `[check:frozen] Capability "${entry.id}" must define a non-empty "paths" array.`,
      );
    }

    for (let pIdx = 0; pIdx < entry.paths.length; pIdx++) {
      const p = entry.paths[pIdx];
      if (typeof p !== 'string' || !p.trim()) {
        throw new Error(
          `[check:frozen] Capability "${entry.id}" has invalid path at index ${pIdx}.`,
        );
      }
    }

    if (typeof entry.status !== 'string' || !entry.status.trim()) {
      throw new Error(
        `[check:frozen] Capability "${entry.id}" must define a "status" string.`,
      );
    }
  }

  return manifest as unknown as ArchitectureManifest;
}

function defaultGitExec(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf-8' });
}

export function verifyFrozenCapabilities(
  options?: VerifyFrozenOptions,
): VerificationResult {
  const repoRoot = options?.repoRoot ?? process.cwd();
  const manifestPath =
    options?.manifestPath ??
    path.resolve(repoRoot, '.ai/capabilities/architecture-manifest.json');
  const gitExec = options?.gitExec ?? defaultGitExec;

  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `[check:frozen] Manifest file not found at: ${manifestPath}`,
    );
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = parseAndValidateManifest(manifestContent);

  const frozenEntries = manifest.frozenCapabilities.filter(
    (cap) => cap.status.toLowerCase() === 'frozen',
  );

  const results: CapabilityCheckResult[] = [];
  let allPassed = true;

  for (const cap of frozenEntries) {
    // 1. Verify baseline commit exists in repository
    try {
      gitExec(`git rev-parse --verify ${cap.commit}^{commit}`, repoRoot);
    } catch {
      allPassed = false;
      results.push({
        id: cap.id,
        name: cap.name,
        commit: cap.commit,
        passed: false,
        error: `Baseline commit "${cap.commit}" does not exist in repository git history.`,
      });
      continue;
    }

    // 2. Validate all configured paths exist on disk
    let pathMissing = false;
    for (const p of cap.paths) {
      const resolved = path.resolve(repoRoot, p);
      if (!fs.existsSync(resolved)) {
        allPassed = false;
        pathMissing = true;
        results.push({
          id: cap.id,
          name: cap.name,
          commit: cap.commit,
          passed: false,
          error: `Configured frozen path does not exist on disk: ${p}`,
        });
        break;
      }
    }
    if (pathMissing) continue;

    // 3. Compare current state (working tree + committed changes) against baseline commit
    const pathsArg = cap.paths.map((p) => `"${p}"`).join(' ');
    let diffOutput = '';
    let diffFailed = false;

    try {
      gitExec(`git diff ${cap.commit} --exit-code -- ${pathsArg}`, repoRoot);
    } catch (e: unknown) {
      diffFailed = true;
      allPassed = false;
      const stdout = (e as { stdout?: string }).stdout ?? '';
      const stderr = (e as { stderr?: string }).stderr ?? '';
      diffOutput = (stdout + '\n' + stderr).trim();
    }

    // 4. Check for untracked newly added files inside frozen paths
    let untrackedFiles: string[] = [];
    try {
      const untrackedRaw = gitExec(
        `git ls-files --others --exclude-standard -- ${pathsArg}`,
        repoRoot,
      );
      untrackedFiles = untrackedRaw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (untrackedFiles.length > 0) {
        diffFailed = true;
        allPassed = false;
      }
    } catch {
      // Ignored if ls-files fails
    }

    if (diffFailed) {
      const errorMsg =
        untrackedFiles.length > 0
          ? `Untracked files detected in frozen paths: ${untrackedFiles.join(', ')}`
          : `Unauthorized changes detected against baseline commit ${cap.commit}.`;

      results.push({
        id: cap.id,
        name: cap.name,
        commit: cap.commit,
        passed: false,
        error: errorMsg,
        diffOutput: diffOutput || undefined,
        untrackedFiles: untrackedFiles.length > 0 ? untrackedFiles : undefined,
      });
    } else {
      results.push({
        id: cap.id,
        name: cap.name,
        commit: cap.commit,
        passed: true,
      });
    }
  }

  return {
    success: allPassed,
    manifestVersion: manifest.version,
    totalFrozen: frozenEntries.length,
    results,
  };
}

export function runCli(): void {
  try {
    const result = verifyFrozenCapabilities();

    console.log(`\n==================================================`);
    console.log(
      `Architecture Manifest Frozen Verification (${result.manifestVersion})`,
    );
    console.log(`Verified ${result.totalFrozen} frozen capabilities`);
    console.log(`==================================================\n`);

    for (const r of result.results) {
      if (r.passed) {
        console.log(
          `✔ [PASS] ${r.id} (${r.commit}) ${r.name ? `— ${r.name}` : ''}`,
        );
      } else {
        console.error(
          `✖ [FAIL] ${r.id} (${r.commit}) ${r.name ? `— ${r.name}` : ''}`,
        );
        if (r.error) console.error(`  Error: ${r.error}`);
        if (r.diffOutput) console.error(`  Diff:\n${r.diffOutput}\n`);
      }
    }

    if (!result.success) {
      console.error(
        `\n[FAIL] Frozen capability verification FAILED. Unauthorized changes detected.\n`,
      );
      process.exit(1);
    }

    console.log(
      `\n✔ [SUCCESS] All ${result.totalFrozen} frozen capabilities verified unchanged.\n`,
    );
    process.exit(0);
  } catch (err: unknown) {
    console.error(
      `\n[FATAL] check:frozen failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}

// Auto-run when executed directly via CLI
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  runCli();
}
