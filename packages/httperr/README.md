# HttpErr

```ts
// in services.ts
import * as Echo from "@use-services/echo";

import * as errcodes from "@/errcodes";

const options = {
  errs: {
    init: HttpErr.init,
    args: errcodes,
  } as HttpErr.Option<typeof errcodes>,
};

// in errcodes.ts
const ErrCodes = {
  ErrInternal: {
    status: 500,
    message: "${message}",
    args: {
      message: "server error",
    },
  },
  ErrValidation: {
    status: 400,
    message: "validate failed",
  },
}

// usage
throw srvs.errs.ErrValidation.toError();
```
