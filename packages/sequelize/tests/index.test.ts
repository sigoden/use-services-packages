import useServices from "use-services";
import * as Sequelize from "../src";

const options = {
  sql: {
    init: Sequelize.init,
    args: {
      database: "",
      password: "",
      username: "",
      options: {},
    },
  } as Sequelize.Option<Sequelize.Service>,
};

test("it works", async () => {
  const { srvs, init } = useServices("test", options);
  await init();
  expect(srvs.sql).toBeTruthy();
});
