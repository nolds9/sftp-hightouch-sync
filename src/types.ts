export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  sourceDir: string;
  destDir: string;
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

export interface SyncStatusResponse {
  id: string;
  status: "pending" | "running" | "done" | "failed" | "cancelled";
  syncRuns: SyncRun[];
}
