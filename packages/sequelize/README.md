# Sequelize

```ts
// in services.ts
import * as Sequelize from "@use-services/sequelize";

const options = {
  sql: {
    init: Sequelize.init,
    args: {
      database: "demo",
      username: "root",
      password: "root",
      options: {
        dialect: "mysql",
        logging: false,
        define: {
          timestamps: false,
          freezeTableName: true,
        },
      },
      setup,
    },
  } as Sequelize.Option<Sequelize.Service>,
};

// usage
await srvs.sql.transaction()
```

