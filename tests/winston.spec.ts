import { useServices, Services } from "use-services";
import { EventEmitter } from "events";
import  * as Winston from "../src/winston/winston";

const options = {
  logger: {
    init: Winston.init,
    args: {
    },
  } as Winston.Option<Winston.Service>,
};

async function run() {
  let srvs: Services<typeof options>;
  srvs.logger.info("it works");
}

