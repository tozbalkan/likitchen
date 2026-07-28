export interface ArtifactReferenceProps {
  readonly artifactId: string;
  readonly name: string;
  readonly uri: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly producerNodeId: string;
}

export class ArtifactReference {
  readonly artifactId: string;
  readonly name: string;
  readonly uri: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly producerNodeId: string;

  constructor(props: ArtifactReferenceProps) {
    this.artifactId = props.artifactId;
    this.name = props.name;
    this.uri = props.uri;
    this.mimeType = props.mimeType;
    this.sizeBytes = props.sizeBytes;
    this.producerNodeId = props.producerNodeId;
    Object.freeze(this);
  }
}
