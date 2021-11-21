# Alisms

```ts

// in service.ts
import * as AliSMS from "@use-services/alisms";

const options = {
  sms: {
    init: AliSMS.init,
    args: {
      accessKeyId: "",
      accessKeySecret: "",
      defaultSignName: "", // 默认签名
      templates: {
        auth: {
          templateCode: "SMS_000000000",
          templateContent:
            "验证码${code}，您正在进行身份验证，打死不要告诉别人哦！",
        },
      },
    },
  } as AliSMS.Option<AlisSMSData, AliSMS.Service<AlisSMSData>>,
}


// in type.ts
export interface AlisSMSData {
  auth: {
    code: string;
  },
}

// usage
srvs.sms.send("auth", "13010001000", { code: "12345" });
```