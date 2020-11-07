import { Services, useServices } from "use-services";
import { EventEmitter } from "events";
import * as Sequelize from "../src/sequelize/sequelize";
import { Model } from "sequelize";

class User extends Model { }

const Models = {
  User,
};

const load = async () => {
  return Models;
};
const options = {
  sql: {
    init: Sequelize.init,
    args: {
      database: "",
      password: "",
      username: "",
      options: {
      },
      load,
    },
  } as Sequelize.Option<typeof Models, Sequelize.Service>,
};

async function run() {
  let srvs: Services<typeof options>;
  srvs.sql.User.findAll();
}

