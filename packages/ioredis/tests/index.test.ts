import { Services } from "use-services";
import * as IORedis from ".";

const options = {
  redis: {
    init: IORedis.init,
    args: {},
  } as IORedis.Option<IORedis.Service>,
};

async function run() {
  let srvs: Services<typeof options>;
  const value = await srvs.redis.get("key");
}
