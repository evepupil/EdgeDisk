import { respondError } from "./server/errors.ts";
import { routeRequest } from "./server/routes.ts";
import type { Env } from "./server/types.ts";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      return respondError(error);
    }
  }
};
