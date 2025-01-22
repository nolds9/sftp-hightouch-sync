import { loadTerraformVars } from "./utils/loadTerraformVars";
import { SyncService } from "./sync";
import { getConfig } from "./config";

process.env.DEBUG = "true"; // Enable verbose logging for local testing

async function runLocalTest() {
  try {
    // Load environment variables from terraform.tfvars
    loadTerraformVars();

    // Initialize and run the sync
    const config = getConfig();
    const syncService = new SyncService(config);
    const result = await syncService.execute();

    console.log("Sync completed with result:", result);
  } catch (error) {
    console.error("Error running sync:", error);
  }
}

// Run the test
runLocalTest();
