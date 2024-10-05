import { FileCache } from "bee-agent-framework/cache/fileCache";
import * as os from "node:os";

const cache = new FileCache({
  fullPath: `${os.tmpdir()}/bee_file_cache.json`,
});
console.log(`Saving cache to "${cache.source}"`);
await cache.set("abc", { firstName: "John", lastName: "Doe" });
