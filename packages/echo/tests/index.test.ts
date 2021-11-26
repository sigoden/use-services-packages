import useServices from "use-services";
import * as Echo from "../src/";

const settings = {
  k: "v",
};

const options = {
  settings: {
    args: settings,
    init: Echo.init,
  } as Echo.Option<typeof settings>,
};

test("it works", async () => {
  const { srvs, init } = useServices("test", options);
  await init();
  expect(srvs.settings.k).toEqual("v");
});
