import { Services } from "use-services";
import * as HttpErr from ".";

const errors = {
  ErrBad: {
    status: 400,
    message: "something wrong",
  },
  ErrBadArg: {
    status: 400,
    message: "${message}",
    args: {
      message: "bad argument",
    },
  },
};

const options = {
  errs: {
    args: errors,
    init: HttpErr.init,
  } as HttpErr.Option<typeof errors>,
};

async function run() {
  let srvs: Services<typeof options>;
  srvs.errs.ErrBadArg.toError({ message: "bad arguments" });
}
