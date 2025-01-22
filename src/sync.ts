import Client from "ssh2-sftp-client";
import { SNS } from "@aws-sdk/client-sns";
import { Config, SyncResult, SyncResponse } from "./types";
import { format, subHours, isToday, isYesterday } from "date-fns";

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

      // Get the relevant files for this run
      const [firstFile, nextFile] = await this.findRelevantFiles();

      // Process first file (11 21 24_)
      console.log("Processing first export file:", firstFile);
      await this.processFile(firstFile, this.config.destFilename);
      await this.triggerAndWaitForSync();

      // Process second file (Next)
      console.log("Processing next export file:", nextFile);
      await this.processFile(nextFile, this.config.destFilename);
      await this.triggerAndWaitForSync();

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

  private async findRelevantFiles(): Promise<string[]> {
    const sourceDir = this.config.sourceDir;
    console.log("Looking for files in", sourceDir);

    const allFiles = await this.sftp.list(sourceDir);

    // Get the target date based on current time
    // If we're running at midnight, we want yesterday's files
    const now = new Date();
    const targetDate = now.getHours() === 0 ? subHours(now, 1) : now;
    const dateStr = format(targetDate, "MMddyyyy");

    // Filter files for our target date
    const dateFiles = allFiles
      .filter((f) => {
        // Only look at files
        if (f.type !== "-") return false;

        // Must contain our date string
        if (!f.name.includes(dateStr)) return false;

        // Must match one of our patterns
        return (
          f.name.includes("FTP Export 11 21 24_") ||
          f.name.includes("FTP Export Next")
        );
      })
      .sort((a, b) => {
        // Sort by modification time, newest first
        return b.modifyTime - a.modifyTime;
      });

    console.log(`Found ${dateFiles.length} matching files for date ${dateStr}`);

    // Get the most recent file of each type
    const firstExport = dateFiles.find((f) => f.name.includes("11 21 24_"));
    const nextExport = dateFiles.find((f) => f.name.includes("Next"));

    if (!firstExport || !nextExport) {
      throw new Error(
        `Missing required files for ${dateStr}. Found: ${dateFiles
          .map((f) => f.name)
          .join(", ")}`
      );
    }

    return [firstExport.name, nextExport.name];
  }

  private async processFile(
    sourceFilename: string,
    destFilename: string
  ): Promise<void> {
    const sourcePath = `${this.config.sourceDir}/${sourceFilename}`;
    const destPath = `${this.config.destDir}/${destFilename}`;

    console.log(`Processing file ${sourcePath} -> ${destPath}`);

    const exists = await this.sftp.exists(sourcePath);
    if (!exists) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }

    // Get file info to validate
    const fileInfo = await this.sftp.stat(sourcePath);

    // Basic validation
    if (fileInfo.size === 0) {
      throw new Error(`File ${sourcePath} is empty`);
    }

    // Validate file is recent (within 24 hours)
    const modTime = new Date(fileInfo.modifyTime);
    if (!isToday(modTime) && !isYesterday(modTime)) {
      throw new Error(
        `File ${sourcePath} is too old. Modified: ${modTime.toISOString()}`
      );
    }

    const buffer = (await this.sftp.get(sourcePath)) as Buffer;
    await this.sftp.put(buffer, destPath);
    console.log(`File copied to ${destPath}`);
  }

  private async triggerAndWaitForSync(): Promise<void> {
    console.log("Triggering Hightouch sync");

    const baseUrl = "https://api.hightouch.io/api/v1";

    // Trigger the sync
    const triggerResponse = await fetch(
      `${baseUrl}/syncs/${this.config.syncId}/trigger`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullResync: false,
        }),
      }
    );

    if (!triggerResponse.ok) {
      const error = await triggerResponse.text();
      console.error("Trigger response:", {
        status: triggerResponse.status,
        statusText: triggerResponse.statusText,
        error,
      });
      throw new Error(`Failed to trigger Hightouch sync: ${error}`);
    }

    const triggerData = await triggerResponse.json();
    console.log("Trigger response data:", triggerData);

    // Instead of using a separate endpoint, let's check the sync status directly
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      const syncResponse = await fetch(
        `${baseUrl}/syncs/${this.config.syncId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            Accept: "application/json",
          },
        }
      );

      if (!syncResponse.ok) {
        const error = await syncResponse.text();
        console.error("Status response:", {
          status: syncResponse.status,
          statusText: syncResponse.statusText,
          error,
        });
        throw new Error(`Failed to check sync status: ${error}`);
      }

      const syncData = (await syncResponse.json()) as SyncResponse;

      if (syncData.status === "success") {
        console.log("Hightouch sync completed successfully");
        return;
      }

      if (syncData.status === "failed") {
        console.dir(syncData, { depth: null });
        throw new Error(`Hightouch sync failed: ${syncData.id}`);
      }

      console.log(
        `Sync status: ${syncData.status} (attempt ${
          attempts + 1
        }/${maxAttempts})`
      );

      // Wait 10 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }

    throw new Error("Hightouch sync timed out");
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
