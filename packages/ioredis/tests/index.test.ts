import useServices from "use-services";
import * as IORedis from "../src/";

const options = {
  redis: {
    init: IORedis.init,
    args: {},
  } as IORedis.Option<IORedis.Service>,
};

test("it works", async () => {
  const { srvs, init } = useServices("test", options);
  await init();
  await srvs.redis.set("key", "foo");
  expect(await srvs.redis.get("key")).toEqual("foo");
});
