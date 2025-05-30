import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

import Index from "./pages/Index";
import LoginWidget from "./widgets/Login";
import ChatPage from "./pages/Chat";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login/:userId/:username/:businessId",
    element: <LoginWidget />,
  },
  {
    path: "/chat/:businessId/",
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
