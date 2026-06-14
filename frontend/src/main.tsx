import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const storedTheme = window.localStorage.getItem("vj:theme:v1");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const useDarkTheme = storedTheme === "dark" || (storedTheme === "system" && prefersDark);
document.documentElement.dataset.theme = useDarkTheme ? "dark" : "light";

createRoot(document.getElementById("root")!).render(<App />);
