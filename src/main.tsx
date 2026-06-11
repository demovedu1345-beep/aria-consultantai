import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ensureSession } from "./lib/aria-auth";

// Establish an anonymous session up-front so edge function calls always carry a JWT.
ensureSession().catch((e) => console.warn("anon session failed", e));

createRoot(document.getElementById("root")!).render(<App />);
