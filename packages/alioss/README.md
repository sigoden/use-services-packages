# Alioss

```ts

// in service.ts
import * as AliOSS from "@use-services/alioss";

const options = {
  oss: {
    init: AliOSS.init,
    args: {
      oss: {
        accessKeyId: "",
        accessKeySecret: "",
        bucket: "",
        cname: true,
        endpoint: "",
        region: "oss-cn-shenzhen",
      },
      sts: {
        arn: "",
        policy: {
          Statement: [
            {
              Action: ["oss:*"],
              Effect: "Allow",
              Resource: ["acs:oss:*:*:*"],
            },
          ],
          Version: "1",
        },
        session: "noname",
      }
    },
  } as AliOSS.Option<AliOSS.Service>,
}
```