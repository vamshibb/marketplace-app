import { createBrowserRouter } from "react-router-dom";

const Marketplace = () => <h1>Marketplace</h1>;

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Marketplace />,
  },
]);
