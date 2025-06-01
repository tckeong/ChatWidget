import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

import Index from "./pages/Index";
import LoginWidget from "./widgets/Login";
import ChatPage from "./pages/Chat";

// use the react-router to manage the routes of the application
const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login/:userId/:businessId",
    element: <LoginWidget />,
  },
  {
    path: "/chat/:userId/:businessId/",
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
