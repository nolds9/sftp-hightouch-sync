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
