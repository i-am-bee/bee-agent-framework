import "dotenv/config.js";
import { Backend } from "bee-agent-framework/backend/core";

const backend = await Backend.fromProvider("ollama");
console.info(backend.chat.modelId);
console.info(backend.embedding.modelId);
