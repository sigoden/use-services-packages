import { Services, useServices } from "use-services";
import { EventEmitter } from "events";
import * as IORedis from "../src/ioredis/ioredis";

const options = {
  redis: {
    init: IORedis.init,
    args: {
    },
  } as IORedis.Option<IORedis.Service>
}

async function run() {
  let srvs: Services<typeof options>;
  const value = await srvs.redis.get("key");
}

