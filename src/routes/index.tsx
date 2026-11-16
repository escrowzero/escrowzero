import { createFileRoute } from "@tanstack/react-router";
import App from "@/features/escrow/App";

type HomeSearch = {
  view: "home" | "dapp";
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    view: search.view === "dapp" ? "dapp" : "home",
  }),
  component: Home,
});

function Home() {
  const { view } = Route.useSearch();
  return <App tab={view} />;
}
