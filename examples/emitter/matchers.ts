import { Callback, Emitter } from "bee-agent-framework/emitter/emitter";
import { BaseLLM } from "bee-agent-framework/llms/base";

interface Events {
  update: Callback<{ data: string }>;
}

const emitter = new Emitter<Events>({
  namespace: ["app"],
});

// Match events by a concrete name (strictly typed)
emitter.on("update", async (data, event) => {});

// Match all events emitted directly on the instance (not nested)
emitter.match("*", async (data, event) => {});

// Match all events (included nested)
emitter.match("*.*", async (data, event) => {});

// Match events by providing a filter function
emitter.match(
  (event) => event.creator instanceof BaseLLM,
  async (data, event) => {},
);

// Match events by regex
emitter.match(/watsonx/, async (data, event) => {});
