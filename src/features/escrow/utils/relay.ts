import { createServerFn } from "@tanstack/react-start";
import type { RelayInput, RelayResult } from "./relay-types";

export type { RelayInput, RelayResult };

export const relayGasless = createServerFn({ method: "POST" })
  .validator((input: RelayInput) => input)
  .handler(async ({ data }): Promise<RelayResult> => {
    const { submitRelay } = await import("./relay-submit.server");
    return submitRelay(data);
  });
