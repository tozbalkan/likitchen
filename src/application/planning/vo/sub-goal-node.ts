export interface SubGoalNodeProps {
  readonly subGoalId: string;
  readonly title: string;
  readonly objective: string;
  readonly isRequired?: boolean | undefined;
  readonly dependencies?: readonly string[] | undefined;
  readonly successCriteria?: string | undefined;
}

export class SubGoalNode {
  readonly subGoalId: string;
  readonly title: string;
  readonly objective: string;
  readonly isRequired: boolean;
  readonly dependencies: readonly string[];
  readonly successCriteria: string;

  private constructor(props: Readonly<SubGoalNodeProps>) {
    if (!props.subGoalId || props.subGoalId.trim() === '') {
      throw new Error('[SubGoalNode] subGoalId is required.');
    }
    if (!props.title || props.title.trim() === '') {
      throw new Error('[SubGoalNode] title is required.');
    }
    if (!props.objective || props.objective.trim() === '') {
      throw new Error('[SubGoalNode] objective is required.');
    }

    this.subGoalId = props.subGoalId;
    this.title = props.title;
    this.objective = props.objective;
    this.isRequired = props.isRequired ?? true;
    this.dependencies = Object.freeze([...(props.dependencies ?? [])]);
    this.successCriteria = props.successCriteria ?? '';
    Object.freeze(this);
  }

  static create(props: Readonly<SubGoalNodeProps>): SubGoalNode {
    return new SubGoalNode(props);
  }
}
