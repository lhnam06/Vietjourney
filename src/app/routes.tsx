import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Discovery from "./pages/Discovery";
import Workspace from "./pages/Workspace";
import Budget from "./pages/Budget";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Discovery },
      { path: "workspace/:tripId", Component: Workspace },
      { path: "budget/:tripId", Component: Budget },
      { path: "profile", Component: Profile },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/auth",
    Component: Auth,
  },
]);
