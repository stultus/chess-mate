import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChessAdvisor from "./ChessAdvisor";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChessAdvisor />
  </StrictMode>
);
