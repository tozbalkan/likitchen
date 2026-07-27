import { ok, err } from '../../../shared/result';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReopenConversationUseCase } from './reopen-conversation-use-case';
import { ConversationStore } from '../ports/conversation-store';
import { EventDispatcher, Clock, UuidGenerator, Logger } from '../../ports';
import { Uuid } from '../../../shared/types';
import { NotFoundError } from '../../../shared/errors';
import { Conversation } from '../../../domain/conversation/entities';

describe('ReopenConversationUseCase', () => {
  let useCase: ReopenConversationUseCase;
  let mockPort: ConversationStore;
  let mockPublisher: EventDispatcher;
  let mockClock: Clock;
  let mockUuid: UuidGenerator;
  let mockLogger: Logger;

  beforeEach(() => {
    mockPort = {
      findById: vi.fn(),
      save: vi.fn(),
    };
    mockPublisher = {
      dispatch: vi.fn(),
    };
    mockClock = {
      now: vi.fn().mockReturnValue(new Date('2026-01-01T00:00:00Z')),
    };
    mockUuid = {
      generate: vi
        .fn()
        .mockReturnValue('123e4567-e89b-12d3-a456-426614174000' as Uuid),
    };
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    useCase = new ReopenConversationUseCase(
      mockPort,
      mockPublisher,
      mockClock,
      mockUuid,
      mockLogger,
    );
  });

  it('should reopen conversation and save it', async () => {
    const existing = Conversation.rehydrate(
      'test-id' as Uuid,
      {
        status: 'qualified',
        stage: 'qualification',
        followup_count: 0,
        conversation_id: 'test-id',
      },
      { schema_version: 1, attachments: [], service_area_status: 'unresolved' },
      1,
    );

    vi.mocked(mockPort.findById).mockResolvedValue(ok(existing));
    vi.mocked(mockPort.save).mockResolvedValue(ok(undefined));

    const result = await useCase.execute(
      {
        conversationId: 'test-id',
      },
      {} as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.idempotent).toBe(false);
    }

    expect(mockPort.save).toHaveBeenCalledOnce();
    expect(mockPublisher.dispatch).toHaveBeenCalledOnce();
  });

  it('should return idempotent if already reopened/in_progress', async () => {
    const existing = Conversation.rehydrate(
      'test-id' as Uuid,
      {
        status: 'open',
        stage: 'qualification',
        followup_count: 0,
        conversation_id: 'test-id',
      },
      { schema_version: 1, attachments: [], service_area_status: 'unresolved' },
      1,
    );

    vi.mocked(mockPort.findById).mockResolvedValue(ok(existing));

    const result = await useCase.execute(
      {
        conversationId: 'test-id',
      },
      {} as never,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.idempotent).toBe(true);
    }

    expect(mockPort.save).not.toHaveBeenCalled();
    expect(mockPublisher.dispatch).not.toHaveBeenCalled();
  });

  it('should fail if conversation not found', async () => {
    vi.mocked(mockPort.findById).mockResolvedValue(
      err(new NotFoundError('Not found')),
    );

    const result = await useCase.execute(
      {
        conversationId: 'test-id',
      },
      {} as never,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });
});
