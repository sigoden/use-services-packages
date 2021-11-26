import useServices from "use-services";
import * as HttpErr from "../src";

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

test("it works", async () => {
  const { srvs, init } = useServices("test", options);
  await init();
  expect(srvs.errs.ErrBadArg.toError({ message: "bad arguments" }).name).toBe(
    "ErrBadArg"
  );
});
