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

// Define the type of the console reader object
interface ConsoleReader {
  write: (role: string, data: string) => void;
  prompt: () => Promise<string>;
  close: () => void;
  [Symbol.asyncIterator]: () => AsyncGenerator<{ prompt: string; iteration: number }, void, unknown>;
}

let sharedReaderInstance: ConsoleReader | null = null; // Singleton instance

export function sharedConsoleReader(): ConsoleReader {
  if (!sharedReaderInstance) {
    sharedReaderInstance = createConsoleReader(); // Assign properly typed instance
  }
  return sharedReaderInstance;
}

export function createConsoleReader({
  fallback,
  input = "User 👤 : ",
  allowEmpty = false,
}: ReadFromConsoleInput = {}): ConsoleReader {
  const rl = readline.createInterface({ input: stdin, output: stdout, terminal: true, prompt: "" });
  let isActive = true;

  return {
    write(role: string, data: string) {
      rl.write(
        [role && R.piped(picocolors.red, picocolors.bold)(role), stripAnsi(data ?? "")]
          .filter(Boolean)
          .join(" ")
          .concat("\n")
      );
    },
    async prompt(): Promise<string> {
      try {
        const userInput = await rl.question(
          `${R.piped(picocolors.cyan, picocolors.bold)(input)}`
        );
        return stripAnsi(userInput.trim());
      } catch (error: any) {
        // Handle error during prompt
        if (error.code === "ERR_USE_AFTER_CLOSE") {
          // Provide a fallback or ignore, as this isn't critical for the core
        }
        return fallback ?? "";
      }
    },
    close() {
      if (isActive) {
        stdin.pause(); // Pause stdin without fully terminating the reader
        isActive = false;
      }
    },
    async *[Symbol.asyncIterator]() {
      if (!isActive) {
        return;
      }

      try {
        rl.write(
          `${picocolors.dim(
            `Interactive session has started. To escape, input 'q' and submit.\n`
          )}`
        );

        for (let iteration = 1, userInput = ""; isActive; iteration++) {
          userInput = await rl.question(
            `${R.piped(picocolors.cyan, picocolors.bold)(input)}`
          );
          userInput = stripAnsi(userInput.trim());

          if (userInput.toLowerCase() === "q") {
            break; // Gracefully exit on 'q'
          }

          if (!userInput.trim() && fallback) {
            userInput = fallback; // Use fallback if input is empty
          }

          if (!allowEmpty && !userInput.trim()) {
            rl.write("Error: Empty input is not allowed. Please try again.\n");
            iteration -= 1;
            continue;
          }

          yield { prompt: userInput, iteration };
        }
      } catch (error: any) {
        // Handle error during iteration gracefully
        if (error.code === "ERR_USE_AFTER_CLOSE") {
          // Fallback behavior or silent fail
        }
      } finally {
        isActive = false;
        rl.close(); // Ensure the reader is closed only once
      }
    },
  };
}