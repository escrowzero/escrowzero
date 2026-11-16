import { createServerFn } from "@tanstack/react-start";

export const unlockDesk = createServerFn({ method: "POST" })
  .validator((input: { password?: string; ticket?: string }) => input)
  .handler(async ({ data }) => {
    const { deskTicketValid, unlockDeskPassword } = await import("./desk-auth.server");
    if (data.ticket) return { ok: deskTicketValid(data.ticket) };
    return unlockDeskPassword(data.password || "");
  });
