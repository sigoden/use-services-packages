import { Services } from "use-services";
import * as Sequelize from ".";
import { Model } from "sequelize";

class User extends Model {}

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

async function run() {
  let srvs: Services<typeof options>;
  srvs.sql.models.User.findAll();
}
