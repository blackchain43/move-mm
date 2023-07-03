import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "react-router-dom";
import { createBrowserHistory } from "history";
import { QueryClientProvider } from "react-query";
import { WalletProvider, SuietWallet } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css";

import { queryClient } from "./services";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const history = createBrowserHistory();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router history={history}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider defaultWallets={[SuietWallet]}>
          <App />
        </WalletProvider>
      </QueryClientProvider>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
