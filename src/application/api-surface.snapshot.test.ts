import { describe, it, expect } from 'vitest';
import * as ToolDefinitionModule from './agent/vo/tool-definition';
import * as ToolInvocationModule from './agent/vo/tool-invocation';
import * as ToolResultModule from './agent/vo/tool-result';
import * as ToolSchemaModule from './agent/vo/tool-schema';
import * as ToolArgumentsModule from './agent/vo/tool-arguments';
import * as ToolExecutionErrorModule from './agent/errors/tool-execution-error';

describe('Public Application API Surface Snapshot', () => {
  it('matches public API export signatures', () => {
    const apiSurface = {
      ToolDefinitionKeys: Object.keys(ToolDefinitionModule).sort(),
      ToolInvocationKeys: Object.keys(ToolInvocationModule).sort(),
      ToolResultKeys: Object.keys(ToolResultModule).sort(),
      ToolSchemaKeys: Object.keys(ToolSchemaModule).sort(),
      ToolArgumentsKeys: Object.keys(ToolArgumentsModule).sort(),
      ToolExecutionErrorKeys: Object.keys(ToolExecutionErrorModule).sort(),
    };

    expect(apiSurface).toMatchSnapshot();
  });
});
