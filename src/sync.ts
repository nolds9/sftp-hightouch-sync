import Client from "ssh2-sftp-client";
import { SNS } from "@aws-sdk/client-sns";
import { Config, SyncResult } from "./types";
import { format } from "date-fns";

export class SyncService {
  private config: Config;
  private sns: SNS;
  private sftp: Client;

  constructor(config: Config) {
    this.config = config;
    this.sns = new SNS({});
    this.sftp = new Client();
  }

  async execute(): Promise<SyncResult> {
    try {
      console.log("Starting SFTP sync process");

      await this.connectSFTP();
      await this.copyFile();
      await this.triggerHightouchSync();

      console.log("Sync completed successfully");
      return { success: true, message: "Sync completed successfully" };
    } catch (error) {
      console.error("Sync failed:", error);
      await this.sendErrorNotification(error as Error);
      return {
        success: false,
        message: "Sync failed",
        error: error as Error,
      };
    } finally {
      try {
        await this.sftp.end();
        console.log("SFTP connection closed");
      } catch (error) {
        console.error("Error closing SFTP connection:", error);
      }
    }
  }

  private async connectSFTP(): Promise<void> {
    console.log("Connecting to SFTP server");

    await this.sftp.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
    });

    console.log("Successfully connected to SFTP server");
  }

  private async copyFile(): Promise<void> {
    const sourceFile = this.getSourceFilePath();
    const destFile = this.getDestFilePath();

    console.log("Checking source file existence:", sourceFile);
    const exists = await this.sftp.exists(sourceFile);
    if (!exists) {
      throw new Error(`Source file does not exist: ${sourceFile}`);
    }

    console.log(`Copying file from ${sourceFile} to ${destFile}`);
    const buffer = (await this.sftp.get(sourceFile)) as Buffer;
    await this.sftp.put(buffer, destFile);
    console.log("File copy completed");
  }

  private getSourceFilePath(): string {
    const today = format(new Date(), "yyyy-MM-dd");
    return `${this.config.sourceDir}/data-${today}.csv`;
  }

  private getDestFilePath(): string {
    return `${this.config.destDir}/${this.config.destFilename}`;
  }

  private async triggerHightouchSync(): Promise<void> {
    console.log("Triggering Hightouch sync");

    const response = await fetch(
      `https://api.hightouch.io/api/v1/syncs/${this.config.syncId}/trigger`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to trigger Hightouch sync: ${error}`);
    }

    console.log("Hightouch sync triggered successfully");
  }

  private async sendErrorNotification(error: Error): Promise<void> {
    try {
      console.log("Sending error notification");

      await this.sns.publish({
        TopicArn: this.config.snsTopicArn,
        Subject: "SFTP Sync Error",
        Message: `Error during SFTP sync:
Time: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
        `,
      });

      console.log("Error notification sent");
    } catch (notificationError) {
      console.error("Failed to send error notification:", notificationError);
    }
  }
}
