import { respondError } from "./server/errors.ts";
import { consumeImportQueue } from "./server/import-tasks.ts";
import { routeRequest } from "./server/routes.ts";
import type { Env, ImportQueueMessage } from "./server/types.ts";

const worker: ExportedHandler<Env, ImportQueueMessage> = {
  async fetch(request, env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      return respondError(error);
    }
  },
  async queue(batch, env): Promise<void> {
    await consumeImportQueue(batch, env);
  }
};

export default worker;