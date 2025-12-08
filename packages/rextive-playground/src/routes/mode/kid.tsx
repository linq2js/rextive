import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mode/kid")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
