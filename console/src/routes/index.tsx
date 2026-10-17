import { createFileRoute } from "@tanstack/react-router";
import { WelcomePage } from "@/features/welcome/components/welcome-page";

export const Route = createFileRoute("/")({
  component: WelcomePage,
});
