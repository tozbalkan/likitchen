export interface ReviewCommentProps {
  readonly commentId: string;
  readonly authorId: string;
  readonly text: string;
  readonly inlineSuggestion?: string | undefined;
  readonly createdAt: Date;
}

export class ReviewComment {
  readonly commentId: string;
  readonly authorId: string;
  readonly text: string;
  readonly inlineSuggestion?: string | undefined;
  readonly createdAt: Date;

  constructor(props: ReviewCommentProps) {
    this.commentId = props.commentId;
    this.authorId = props.authorId;
    this.text = props.text;
    this.inlineSuggestion = props.inlineSuggestion;
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }
}

export interface ReviewThreadProps {
  readonly threadId: string;
  readonly workspaceId: string;
  readonly stepId: string;
  readonly isResolved: boolean;
  readonly comments: ReadonlyArray<ReviewComment>;
  readonly createdAt: Date;
}

export class ReviewThread {
  readonly threadId: string;
  readonly workspaceId: string;
  readonly stepId: string;
  readonly isResolved: boolean;
  readonly comments: ReadonlyArray<ReviewComment>;
  readonly createdAt: Date;

  constructor(props: ReviewThreadProps) {
    this.threadId = props.threadId;
    this.workspaceId = props.workspaceId;
    this.stepId = props.stepId;
    this.isResolved = props.isResolved;
    this.comments = Object.freeze([...props.comments]);
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }

  static create(
    threadId: string,
    workspaceId: string,
    stepId: string,
  ): ReviewThread {
    return new ReviewThread({
      threadId,
      workspaceId,
      stepId,
      isResolved: false,
      comments: [],
      createdAt: new Date(),
    });
  }

  addComment(
    authorId: string,
    text: string,
    inlineSuggestion?: string,
  ): ReviewThread {
    const comment = new ReviewComment({
      commentId: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId,
      text,
      inlineSuggestion,
      createdAt: new Date(),
    });

    return new ReviewThread({
      ...this,
      comments: [...this.comments, comment],
    });
  }

  resolve(): ReviewThread {
    return new ReviewThread({
      ...this,
      isResolved: true,
    });
  }
}
