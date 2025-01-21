import { Context, Handler } from "aws-lambda";
import { getConfig } from "./config";
import { SyncService } from "./sync";

export const handler: Handler = async (event: any, context: Context) => {
  console.log("Starting SFTP sync process");

  try {
    const config = getConfig();
    const syncService = new SyncService(config);
    const result = await syncService.execute();

    console.log("Sync result:", result);
    return result;
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
};
