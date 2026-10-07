import { EventSource } from "eventsource";
import fs from "fs";
import path from "path";

const BEE_PROXY_URL = "http://127.0.0.1:8787";
const DEV_LOG_FILE = path.join(process.cwd(), "developer-insights.md");

// Initialize our developer insights log
if (!fs.existsSync(DEV_LOG_FILE)) {
  fs.writeFileSync(DEV_LOG_FILE, "# Developer Insights & Actions\\n\\nAuto-generated from Bee Wearable stream.\\n\\n");
}

console.log(`Connecting to Bee Stream at ${BEE_PROXY_URL}/v1/stream...`);

const es = new EventSource(`${BEE_PROXY_URL}/v1/stream`);

es.onopen = () => {
  console.log("Connected to Bee Stream! Listening for developer events...");
};

es.onmessage = (event: any) => {
  try {
    const data = JSON.parse(event.data);
    console.log(`Received event type: ${data.type || "unknown"}`);
    
    // Check for new utterances (transcribed text from the user)
    if (data.type === "new-utterance" || data.type === "update-conversation") {
      const text = data.text || data.summary || "";
      
      // Simple intent detection (this is where our "tiny model" logic would go)
      // For the hackathon demo, we use basic keyword matching for developer tasks
      const keywords = ["bug", "deploy", "server", "code", "refactor", "api", "database"];
      const isDeveloperContext = keywords.some(kw => text.toLowerCase().includes(kw));

      if (isDeveloperContext) {
        console.log(`=> Detected Developer Context: ${text}`);
        
        // Append to the developer insights log
        const timestamp = new Date().toISOString();
        const logEntry = `- **[${timestamp}] Insight Detected:** ${text}\\n`;
        fs.appendFileSync(DEV_LOG_FILE, logEntry);
      }
    }
    
    // Check for actionable todos created by Bee
    if (data.type === "todo-created") {
      console.log(`=> New TODO from Bee: ${data.text}`);
      fs.appendFileSync(DEV_LOG_FILE, `- **[TODO]** ${data.text}\\n`);
    }

  } catch (err: any) {
    console.error("Error parsing stream event:", err.message);
  }
};

es.onerror = (err: any) => {
  console.error("EventSource failed. Is the proxy running? (bee proxy --port 8787)");
  // Don't close immediately, let it retry
};
