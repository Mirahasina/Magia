  import { createRoot } from "react-dom/client";
  import { GoogleOAuthProvider } from "@react-oauth/google";
  import App from "./app/App.tsx";
  import { PlanProvider } from "./app/context/PlanContext.tsx";
  import "./styles/index.css";

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "732008821594-0i4b63q03699ir1ar7aakl16dbql58f5.apps.googleusercontent.com";

  createRoot(document.getElementById("root")!).render(
    <GoogleOAuthProvider clientId={googleClientId}>
      <PlanProvider>
        <App />
      </PlanProvider>
    </GoogleOAuthProvider>
  );