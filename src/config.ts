import { Config } from "./types";

export function getConfig(): Config {
  const requiredEnvVars = [
    "SFTP_HOST",
    "SFTP_PORT",
    "SFTP_USERNAME",
    "SFTP_PASSWORD",
    "SFTP_SOURCE_DIR",
    "SFTP_DEST_DIR",
    "SFTP_DEST_FILENAME",
    "HIGHTOUCH_API_KEY",
    "HIGHTOUCH_SYNC_ID",
    "SNS_TOPIC_ARN",
  ];

  // Validate all required env vars are present
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    host: process.env.SFTP_HOST!,
    port: parseInt(process.env.SFTP_PORT!, 10),
    username: process.env.SFTP_USERNAME!,
    password: process.env.SFTP_PASSWORD!,
    sourceDir: process.env.SFTP_SOURCE_DIR!,
    destDir: process.env.SFTP_DEST_DIR!,
    destFilename: process.env.SFTP_DEST_FILENAME!,
    apiKey: process.env.HIGHTOUCH_API_KEY!,
    syncId: process.env.HIGHTOUCH_SYNC_ID!,
    snsTopicArn: process.env.SNS_TOPIC_ARN!,
  };
}
