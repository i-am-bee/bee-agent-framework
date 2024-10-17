import { CodeExtractionTool } from "examples/tools/custom/codeextraction.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { Ollama } from "ollama";
// import { OllamaLLM } from "bee-agent-framework/adapters/ollama/llm";
// import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const codeEstraction = new CodeExtractionTool();
const result = await codeEstraction.run("examples/");
// console.log(result)
const prompt = 'Generate a README.md file about agentic framework examples based in the next folder tree and code files content, \n examples\n' + result + "\n\n please generate the README.md base in the previos content and folder tree "

const ollama = new Ollama();

const response = await ollama.chat({
    model: 'llama3.2',
    messages: [{ role: 'user', content: prompt }],
  })
  console.log(response.message.content)

  

