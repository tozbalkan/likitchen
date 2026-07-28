import type { ApplicationRegistry } from './application-registry';
import { InMemoryPromptRepositoryAdapter } from '../infrastructure/prompt/in-memory-prompt-repository';
import { MustachePromptRendererEngineAdapter } from '../infrastructure/prompt/mustache-prompt-renderer-engine';
import { MemoryRenderedPromptCacheAdapter } from '../infrastructure/prompt/memory-rendered-prompt-cache';
import { PromptRendererService } from '../application/prompt/prompt-renderer';
import { PromptValidatorService } from '../application/prompt/prompt-validator';
import { PromptPublisherService } from '../application/prompt/prompt-publisher';
import { PromptResolverAdapter } from '../infrastructure/prompt/prompt-resolver-adapter';

export function registerPromptPlatform(registry: ApplicationRegistry): void {
  const repository = new InMemoryPromptRepositoryAdapter();
  const engine = new MustachePromptRendererEngineAdapter();
  const cache = new MemoryRenderedPromptCacheAdapter();
  const renderer = new PromptRendererService(engine, cache);
  const validator = new PromptValidatorService();
  const publisher = new PromptPublisherService(repository, validator);
  const resolverAdapter = new PromptResolverAdapter(repository, renderer);

  registry.register('PromptRepositoryPort', repository);
  registry.register('PromptRendererEnginePort', engine);
  registry.register('RenderedPromptCachePort', cache);
  registry.register('PromptRendererPort', renderer);
  registry.register('PromptValidatorPort', validator);
  registry.register('PromptPublisherPort', publisher);
  registry.register('PromptResolverPort', resolverAdapter);
}
