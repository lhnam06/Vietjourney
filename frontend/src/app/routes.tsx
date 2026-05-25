import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import Discovery from "./pages/Discovery";
import Workspace from "./pages/Workspace";
import Budget from "./pages/Budget";
import Profile from "./pages/Profile";
import Timetable from "./pages/Timetable";
import Auth from "./pages/Auth";
import Timelines from "./pages/Timelines";
import NotFound from "./pages/NotFound";
import MyTrip from "./pages/MyTrip";
import Notifications from "./pages/Notifications";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Discovery },
      { path: "mytrip", Component: MyTrip },
      { path: "workspace/:tripId", Component: Workspace },
      { path: "timetable/:tripId", Component: Timetable },
      { path: "budget/:tripId", Component: Budget },
      { path: "profile", Component: Profile },
      { path: "timelines", Component: Timelines },
      { path: "notifications", Component: Notifications },
      { path: "*", Component: NotFound },
    ],
  },
  {
    path: "/auth",
    Component: Auth,
  },
]);
