import useServices from "use-services";
import * as Winston from "../src/";

const options = {
  logger: {
    init: Winston.init,
    args: {
      format: ["simple"],
    },
  } as Winston.Option<Winston.Service>,
};

test("it works", async () => {
  const { srvs, init } = useServices("test", options);
  await init();
  expect(() => srvs.logger.info("abc")).not.toThrow();
});
