import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./app/App.tsx";
import "./styles/index.css";

const storedTheme = window.localStorage.getItem("vj:theme:v1");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const useDarkTheme = storedTheme === "dark" || (storedTheme === "system" && prefersDark);
document.documentElement.dataset.theme = useDarkTheme ? "dark" : "light";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster 
      position="top-center" 
      toastOptions={{
        style: {
          fontSize: '1.1rem',
          padding: '20px 24px',
          width: '420px',
          maxWidth: '90vw',
        }
      }}
    />
  </>
);
