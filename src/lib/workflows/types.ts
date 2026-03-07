import type { WorkflowType, ArtifactType } from "@/generated/prisma/enums";

export interface WorkflowInput {
  userId: string;
  workflowRunId: string;
  sourceEventId?: string;
  inputRefs: Record<string, unknown>;
}

export interface WorkflowOutput {
  artifactType: ArtifactType;
  title: string;
  summaryText?: string;
  payloadJson: Record<string, unknown>;
  sourceRefsJson?: Record<string, unknown>;
  modelUsed?: string;
}

export interface WorkflowHandler {
  readonly workflowType: WorkflowType;

  /** Check if this handler can process the given input */
  canHandle(input: WorkflowInput): boolean;

  /** Execute the workflow and produce an artifact output */
  execute(input: WorkflowInput): Promise<WorkflowOutput>;
}
