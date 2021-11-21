import { Services } from "use-services";
import * as Echo from ".";

const settings = {
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
