import type { ConditionEvaluatorPort } from '../../application/planning-orchestration/ports/condition-evaluator-port';

export class SimpleConditionEvaluatorAdapter implements ConditionEvaluatorPort {
  async evaluate(
    condition: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<boolean> {
    if (!condition || condition.trim() === '' || condition === 'true')
      return true;
    if (condition === 'false') return false;

    // Simple expression evaluation e.g. "status == 'SUCCESS'" or "count > 0"
    const match = condition.match(/^(\w+)\s*(==|!=|>|<)\s*(.+)$/);
    if (match) {
      const [, key, op, rawVal] = match;
      if (!key || !op || !rawVal) return true;

      const varVal = variables[key];
      const targetVal = rawVal.replace(/^['"]|['"]$/g, '');

      if (op === '==') return String(varVal) === targetVal;
      if (op === '!=') return String(varVal) !== targetVal;
      if (op === '>') return Number(varVal) > Number(targetVal);
      if (op === '<') return Number(varVal) < Number(targetVal);
    }

    return true;
  }
}
