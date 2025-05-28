import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

import Index from "./pages/Index";
import LoginPage from "./pages/Login";
import ChatPage from "./pages/Chat";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/chat",
    element: <ChatPage />,
  },
  {
    path: "*",
    element: <div>404 Not Found!</div>,
  }
]);

function App() {
  return (
    <RouterProvider router={router} />
  )
}

export default App
