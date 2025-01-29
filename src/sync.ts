import Client from "ssh2-sftp-client";
import { SNS } from "@aws-sdk/client-sns";
import { Config, SyncResult, SyncResponse } from "./types";
import { format, subHours, isToday, isYesterday } from "date-fns";

interface FileProcessResult {
  filename: string;
  success: boolean;
  error?: Error;
}

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

      // Get all relevant files for this run
      const files = await this.findRelevantFiles();

      // Process each file and collect results
      const results: FileProcessResult[] = [];

      for (const file of files) {
        try {
          console.log(`Processing file: ${file}`);
          await this.processFile(file, this.config.destFilename);
          await this.triggerAndWaitForSync();
          results.push({ filename: file, success: true });
        } catch (error) {
          console.error(`Error processing file ${file}:`, error);
          results.push({
            filename: file,
            success: false,
            error: error as Error,
          });
          // Send notification for this specific file failure
          await this.sendErrorNotification(
            error as Error,
            `Failed to process file: ${file}`
          );
        }
      }

      // Analyze results
      const failedFiles = results.filter((r) => !r.success);
      const successFiles = results.filter((r) => r.success);

      console.log(
        `Sync completed. Success: ${successFiles.length}, Failed: ${failedFiles.length}`
      );

      // If any files failed, return partial success
      if (failedFiles.length > 0) {
        return {
          success: true, // Still return true since some files processed
          message: `Sync completed with some failures. ${successFiles.length} succeeded, ${failedFiles.length} failed.`,
          partialFailure: true,
          failedFiles: failedFiles.map((f) => f.filename),
        };
      }

      return {
        success: true,
        message: "Sync completed successfully for all files",
      };
    } catch (error) {
      console.error("Sync failed:", error);
      await this.sendErrorNotification(error as Error);
      return {
        success: false,
        message: "Sync failed completely",
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
    console.log(
      "All files found:",
      allFiles.map((f) => ({
        name: f.name,
        modTime: new Date(f.modifyTime).toISOString(),
      }))
    );

    // Get today's and yesterday's date strings
    const now = new Date();
    const today = format(now, "MMddyyyy");
    const yesterday = format(subHours(now, 24), "MMddyyyy");
    console.log("Looking for dates:", { today, yesterday });

    // Define our file patterns
    const filePatterns = [
      "FTP_Prior1Month",
      "FTP_Prior2Month",
      "FTP_CurrentDayThruYear",
      "FTP_NextYear",
    ];

    // Filter files for our date patterns
    const dateFiles = allFiles
      .filter((f) => {
        // Only look at files
        if (f.type !== "-") {
          console.log(`Skipping ${f.name} - not a file`);
          return false;
        }

        // Must contain either today's or yesterday's date
        if (!f.name.includes(today) && !f.name.includes(yesterday)) {
          console.log(
            `Skipping ${f.name} - doesn't match dates ${today} or ${yesterday}`
          );
          return false;
        }

        // Must match one of our patterns
        const matchesPattern = filePatterns.some((pattern) =>
          f.name.includes(pattern)
        );
        if (!matchesPattern) {
          console.log(`Skipping ${f.name} - doesn't match any patterns`);
        }
        return matchesPattern;
      })
      .sort((a, b) => {
        // Sort by modification time, newest first
        return b.modifyTime - a.modifyTime;
      });

    console.log(
      "Matching date files:",
      dateFiles.map((f) => ({
        name: f.name,
        modTime: new Date(f.modifyTime).toISOString(),
      }))
    );

    // Get the most recent file of each type
    const selectedFiles = filePatterns
      .map((pattern) => {
        const file = dateFiles.find((f) => f.name.includes(pattern));
        if (!file) {
          console.log(`Warning: No file found for pattern ${pattern}`);
          return null;
        }
        console.log(`Selected ${file.name} for pattern ${pattern}`);
        return file.name;
      })
      .filter((name): name is string => name !== null);

    if (selectedFiles.length === 0) {
      const error = new Error(
        `No matching files found for ${today} or ${yesterday}. Available files: ${dateFiles
          .map((f) => f.name)
          .join(", ")}`
      );
      console.error(error);
      throw error;
    }

    return selectedFiles;
  }

  private async processFile(
    sourceFilename: string,
    destFilename: string
  ): Promise<void> {
    const sourcePath = `${this.config.sourceDir}/${sourceFilename}`;
    const destPath = `${this.config.destDir}/${destFilename}`;
    const processedPath = `${this.config.processedDir}/${sourceFilename}`;

    console.log(`Processing file ${sourcePath} -> ${destPath}`);

    try {
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

      // Validate file is recent (within last 24 hours)
      const modTime = new Date(fileInfo.modifyTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - modTime.getTime()) / (1000 * 60 * 60);

      if (hoursDiff > 24) {
        throw new Error(
          `File ${sourcePath} is too old. Modified: ${modTime.toISOString()} (${hoursDiff.toFixed(
            1
          )} hours ago)`
        );
      }

      // Copy to destination for processing
      const buffer = (await this.sftp.get(sourcePath)) as Buffer;
      await this.sftp.put(buffer, destPath);
      console.log(`File copied to ${destPath}`);

      // Move to processed directory
      await this.sftp.rename(sourcePath, processedPath);
      console.log(`File moved to processed directory: ${processedPath}`);
    } catch (error) {
      throw error;
    }
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

  private async sendErrorNotification(
    error: Error,
    context: string = "",
    missingPatterns?: string[]
  ): Promise<void> {
    try {
      console.log("Sending error notification");

      let message = `Error during SFTP sync:
Time: ${new Date().toISOString()}
Context: ${context}
Error: ${error.message}
Stack: ${error.stack}`;

      if (missingPatterns?.length) {
        message += `\nMissing file patterns: ${missingPatterns.join(", ")}`;
      }

      await this.sns.publish({
        TopicArn: this.config.snsTopicArn,
        Subject: "SFTP Sync Error",
        Message: message,
      });

      console.log("Error notification sent");
    } catch (notificationError) {
      console.error("Failed to send error notification:", notificationError);
    }
  }
}
