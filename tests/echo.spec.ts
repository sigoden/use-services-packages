import { useServices, Services } from "use-services";
import { EventEmitter } from "events";
import * as Echo from "../src/echo/echo";

const settings =  {
  k: "v",
};

const options = {
  settings: {
    args: settings,
    init: Echo.init,
  } as Echo.Option<typeof settings>,
};

async function run() {
  let srvs: Services<typeof options>;
  srvs.settings.k;
}
