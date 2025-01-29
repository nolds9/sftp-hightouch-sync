export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  sourceDir: string;
  destDir: string;
  processedDir: string;
  destFilename: string;
}

export interface HightouchConfig {
  apiKey: string;
  syncId: string;
}

export interface Config extends SFTPConfig, HightouchConfig {
  snsTopicArn: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  error?: Error;
  partialFailure?: boolean;
  failedFiles?: string[];
}

export interface SyncRun {
  syncId: number;
  status:
    | "cancelled"
    | "failed"
    | "queued"
    | "success"
    | "warning"
    | "querying"
    | "processing"
    | "reporting"
    | "interrupted";
  finishedAt: string;
  syncRunId: number;
}

export interface SyncResponse {
  id: number;
  slug: string;
  workspaceId: number;
  createdAt: string;
  updatedAt: string;
  destinationId: number;
  modelId: number;
  configuration: {
    mode: string;
    object: string;
    mappings: Array<{
      to: string;
      from: string;
      type: string;
    }>;
    objectId: string;
    externalIdMapping: {
      to: string;
      from: string;
      type: string;
    };
    associationMappings: any[];
  };
  schedule: {
    type: string;
    schedule: {
      interval: {
        unit: string;
        quantity: number;
      };
    };
  };
  disabled: boolean;
  status:
    | "disabled"
    | "pending"
    | "cancelled"
    | "failed"
    | "queued"
    | "success"
    | "warning"
    | "querying"
    | "processing"
    | "reporting"
    | "interrupted";
  lastRunAt: string;
  referencedColumns: string[];
  primaryKey: string;
  externalSegment: Record<string, never>;
}
