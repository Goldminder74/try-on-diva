import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/portal/catalog/new")({
  component: NewRedirect,
});

function NewRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/portal/catalog/$wigId", params: { wigId: "new" }, replace: true });
  }, [nav]);
  return null;
}
