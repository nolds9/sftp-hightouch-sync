import * as fs from "fs";
import * as path from "path";

export function loadTerraformVars(): void {
  const tfvarsPath = path.join(
    __dirname,
    "../../infrastructure/terraform.tfvars"
  );
  const content = fs.readFileSync(tfvarsPath, "utf8");

  // Parse terraform.tfvars content
  const vars = content
    .split("\n")
    .reduce((acc: Record<string, string>, line) => {
      const match = line.match(/^([^=]+)=\s*"([^"]+)"/);
      if (match) {
        const [_, key, value] = match;
        acc[key.trim()] = value;
      }
      return acc;
    }, {});

  // Map terraform vars to environment variables
  process.env.SFTP_HOST = vars.sftp_host;
  process.env.SFTP_PORT = vars.sftp_port;
  process.env.SFTP_USERNAME = vars.sftp_username;
  process.env.SFTP_PASSWORD = vars.sftp_password;
  process.env.SFTP_SOURCE_DIR = vars.sftp_source_dir;
  process.env.SFTP_DEST_DIR = vars.sftp_dest_dir;
  process.env.SFTP_DEST_FILENAME = vars.sftp_dest_filename;
  process.env.HIGHTOUCH_API_KEY = vars.hightouch_api_key;
  process.env.HIGHTOUCH_SYNC_ID = vars.hightouch_sync_id;

  // For local testing, we'll create a dummy SNS topic ARN
  process.env.SNS_TOPIC_ARN =
    "arn:aws:sns:us-east-2:123456789012:sftp-sync-notifications";

  // Add this after loading terraform vars
  const localEnvPath = path.join(__dirname, "../../.env.local");
  if (fs.existsSync(localEnvPath)) {
    const localEnv = fs.readFileSync(localEnvPath, "utf8");
    localEnv.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}
