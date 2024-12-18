import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import picocolors from "picocolors";
import * as R from "remeda";
import stripAnsi from "strip-ansi";

interface ReadFromConsoleInput {
  fallback?: string;
  input?: string;
  allowEmpty?: boolean;
}

export function createConsoleReader({
  fallback,
  input = "User 👤 : ",
  allowEmpty = false,
}: ReadFromConsoleInput = {}) {
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true, prompt: "" });
  let isActive = true;

  return {
    write(role: string, data: string) {
      rl.write(
        [role && R.piped(picocolors.red, picocolors.bold)(role), stripAnsi(data ?? "")]
          .filter(Boolean)
          .join(" ")
          .concat("\n"),
      );
    },

    async prompt(): Promise<string> {
      // This uses the async iterator below. If it's exhausted, return empty string.
      for await (const { prompt } of this) {
        return prompt;
      }
      return "";
    },

    // New method: Asks a single question without consuming the async iterator.
    async askSingleQuestion(queryMessage: string): Promise<string> {
      const answer = await rl.question(R.piped(picocolors.cyan, picocolors.bold)(queryMessage));
      return stripAnsi(answer.trim());
    },

    close() {
      stdin.pause();
      rl.close();
    },

    async *[Symbol.asyncIterator]() {
      if (!isActive) {
        return;
      }

      try {
        rl.write(
          `${picocolors.dim(`Interactive session has started. To escape, input 'q' and submit.\n`)}`,
        );

        for (let iteration = 1, prompt = ""; isActive; iteration++) {
          prompt = await rl.question(R.piped(picocolors.cyan, picocolors.bold)(input));
          prompt = stripAnsi(prompt);

          if (prompt === "q") {
            break;
          }
          if (!prompt.trim() || prompt === "\n") {
            prompt = fallback ?? "";
          }
          if (allowEmpty !== false && !prompt.trim()) {
            rl.write("Error: Empty prompt is not allowed. Please try again.\n");
            iteration -= 1;
            continue;
          }
          yield { prompt, iteration };
        }
      } catch (e: any) {
        if (e.code === "ERR_USE_AFTER_CLOSE") {
          return;
        }
      } finally {
        isActive = false;
        rl.close();
      }
    },
  };
}
