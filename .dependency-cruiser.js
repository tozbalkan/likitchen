/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed.',
      from: {},
      to: { circular: true }
    },
    {
      name: "domain-is-pure",
      severity: "error",
      comment: "Domain layer must be completely pure. It can only import from shared or type-fest.",
      from: {
        path: "^src/domain",
      },
      to: {
        pathNot: "^(src/(shared|domain)|node_modules/.*(type-fest|vitest|@vitest))",
      }
    },
    {
      name: "application-framework-agnostic",
      severity: "error",
      comment: "Application layer must not import frameworks or infrastructure libraries.",
      from: {
        path: "^src/application",
      },
      to: {
        path: "(node_modules/(react|next|express|fastify|prisma|supabase|axios|fetch))",
      }
    },
    {
      name: 'application-layer-rules',
      severity: 'error',
      comment: 'Application layer cannot depend on Infrastructure layer.',
      from: { path: '^src/application' },
      to: { path: '^src/infrastructure' }
    },
    {
      name: 'shared-is-bottom',
      severity: 'error',
      comment: 'Shared layer cannot depend on Domain, Application, or Infrastructure.',
      from: { path: '^src/shared' },
      to: { path: '^src/(domain|application|infrastructure)' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    progress: { type: 'performance-log' }
  }
};
