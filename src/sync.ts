import Client from "ssh2-sftp-client";
import { SNS } from "aws-sdk";
import { Config, SyncResult } from "./types";

export class SyncService {
  private config: Config;
  private sns: SNS;
  private sftp: Client;

  constructor(config: Config) {
    this.config = config;
    this.sns = new SNS();
    this.sftp = new Client();
  }

  async execute(): Promise<SyncResult> {
    try {
      // Connect to SFTP
      await this.sftp.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
      });

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];
      const sourceFile = `${this.config.sourceDir}/data-${today}.csv`;
      const destFile = `${this.config.destDir}/${this.config.destFilename}`;

      // Copy file
      await this.sftp.fastGet(sourceFile, destFile);

      // Trigger Hightouch sync
      await this.triggerHightouchSync();

      return { success: true, message: "Sync completed successfully" };
    } catch (error) {
      await this.sendErrorNotification(error as Error);
      return {
        success: false,
        message: "Sync failed",
        error: error as Error,
      };
    } finally {
      await this.sftp.end();
    }
  }

  private async triggerHightouchSync(): Promise<void> {
    const response = await fetch(
      `https://api.hightouch.io/api/v1/syncs/${this.config.syncId}/trigger`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to trigger Hightouch sync");
    }
  }

  private async sendErrorNotification(error: Error): Promise<void> {
    await this.sns
      .publish({
        TopicArn: this.config.snsTopicArn,
        Subject: "SFTP Sync Error",
        Message: `Error during SFTP sync: ${error.message}`,
      })
      .promise();
  }
}
