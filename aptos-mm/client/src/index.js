import React from "react";
import ReactDOM from "react-dom/client";
import { Router } from "react-router-dom";
import { createBrowserHistory } from "history";
import { QueryClientProvider } from "react-query";
import {
  PontemWalletAdapter,
  AptosWalletAdapter,
  MartianWalletAdapter,
  FewchaWalletAdapter,
  WalletProvider,
} from "@manahippo/aptos-wallet-adapter";

import { queryClient } from "./services";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

const history = createBrowserHistory();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router history={history}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider
          wallets={[
            new PontemWalletAdapter(),
            new MartianWalletAdapter(),
            new AptosWalletAdapter(),
            new FewchaWalletAdapter(),
          ]}
          onError={(error) => {
            console.log("Handle Error Message", error);
          }}
          autoConnect
        >
          <App />
        </WalletProvider>
      </QueryClientProvider>
    </Router>
  </React.StrictMode>
);

reportWebVitals();
