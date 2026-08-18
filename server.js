
import axios from "axios";
import "dotenv/config";
import { testfun } from "./test.js";
import { delay } from "./utils/delay.js";
import { turnTheDeviceOFF } from "./tubearchivstturnoff.js";
import { retry } from "./homeassistant/retryWrapper.js";
import { triggerHomeAssistantWebhook } from "./homeassistant/homeAssistantWebhook.js";


const TUBEARCHIVIST_URL = process.env.TUBEARCHIVIST_URL;
const TUBEARCHIVIST_TOKEN = process.env.TUBEARCHIVIST_TOKEN;

async function checkTubeArchivistStatus() {
  try {
    // Get Tube Archivist task history
    const { data } = await axios.get(
      `${TUBEARCHIVIST_URL}/api/task/by-name/`,
      {
        headers: {
          Authorization: `Token ${TUBEARCHIVIST_TOKEN}`,
        },
        timeout: 5000,
      }
    );

    const tasks = Array.isArray(data) ? data : data.data || [];

    const activeStates = new Set([
      "PENDING",
      "STARTED",
      "RETRY",
      "RECEIVED",
    ]);

    const activeTasks = tasks.filter(task =>
      activeStates.has(task.status)
    );

    const downloading = activeTasks.some(
      task =>
        task.name === "download_pending" ||
        task.name === "download"
    );

    const scanning = activeTasks.some(
      task =>
        task.name === "update_subscribed" ||
        task.name === "rescan_pending" ||
        task.name === "extract_download"
    );

    const busy = activeTasks.length > 0;

    return {
      busy,
      downloading,
      scanning,
      safeToShutdown: !busy,

      activeTasks: activeTasks.map(task => ({
        name: task.name,
        status: task.status,
        task_id: task.task_id,
      })),
    };

  } catch (error) {
    console.error(
      "Failed to check Tube Archivist:",
      error.response?.status,
      error.message
    );

    // FAIL SAFE
    return {
      busy: true,
      downloading: false,
      scanning: false,
      safeToShutdown: false,
      error: "Unable to verify Tube Archivist status",
    };
  }
}


async function main() {
while(true){
    try {
    const status = await checkTubeArchivistStatus();

    console.log(JSON.stringify(status, null, 2));
if(!status.safeToShutdown){
  console.log("⏳ waiting 5 minutes...\n");
await delay(5 * 60 * 1000);
  
}

if(status.safeToShutdown){
  await retry(
  triggerHomeAssistantWebhook,
  { status: "success" },
  "homeassistant-success",
  5
  );
}

  } catch (error) {
    console.error('tubearcvist app is offline');
  }
}
}

main();