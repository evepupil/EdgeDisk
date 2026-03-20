import { consumeImportQueue } from './server/services/import-service.ts'
import type { Env, ImportQueueMessage } from './server/types.ts'

const worker: ExportedHandler<Env, ImportQueueMessage> = {
  async queue(batch, env): Promise<void> {
    await consumeImportQueue(batch, env)
  }
}

export default worker
