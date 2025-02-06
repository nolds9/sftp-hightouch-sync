import { loadTerraformVars } from "./utils/loadTerraformVars";
import { SyncService } from "./sync";
import { getConfig } from "./config";

process.env.DEBUG = "true"; // Enable verbose logging for local testing

async function runLocalTest() {
  try {
    // Load environment variables from terraform.tfvars
    loadTerraformVars();

    // Parse target date from command line argument (YYYY-MM-DD format)
    let targetDate: Date | undefined;
    const dateArg = process.argv[2];
    if (dateArg) {
      targetDate = new Date(dateArg);
      if (isNaN(targetDate.getTime())) {
        throw new Error("Invalid date format. Please use YYYY-MM-DD format");
      }
      console.log(`Running sync for target date: ${targetDate.toISOString()}`);
    }

    // Initialize and run the sync
    const config = getConfig();
    const syncService = new SyncService(config, targetDate);
    const result = await syncService.execute();

    console.log("Sync completed with result:", result);
  } catch (error) {
    console.error("Error running sync:", error);
  }
}

// Run the test
runLocalTest();
