import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function readTranscript() {
  const transcriptPath = join(
    homedir(),
    ".gemini",
    "antigravity",
    "brain",
    "696620c8-a3d0-410d-9447-201fd8a558ee",
    ".system_generated",
    "logs",
    "transcript.jsonl"
  );

  console.log("Reading transcript from:", transcriptPath);
  if (!existsSync(transcriptPath)) {
    console.log("Transcript not found.");
    return;
  }

  const lines = readFileSync(transcriptPath, "utf8").split("\n");
  console.log(`Total lines in transcript: ${lines.length}`);
  
  // Search for run_command tool calls in reverse order
  let count = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === "run_command" || tc.name === "default_api:run_command") {
            console.log(`[Step ${obj.step_index}] ${tc.name}:`, tc.arguments ?? tc.args);
            count++;
            if (count > 25) return;
          }
        }
      }
    } catch {
      // Ignore parse errors for truncated lines
    }
  }
}

readTranscript();
