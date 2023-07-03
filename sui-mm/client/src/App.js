import React from "react";
import { Switch, Route } from "react-router-dom";
import Home from "./container/Home/Loadable";
import Config from "./container/Config/Loadable";
import Task from "./container/Task/Loadable";

import ScrollToTop from "./ScrollToTop";
import "antd/dist/antd.min.css";
import GlobalStyle from "./global-styles";

function App() {
  return (
    <div className="main">
      <ScrollToTop />
      <Switch>
        <Route path="/config" component={Config} />
        <Route path="/task" component={Task} />
        <Route path="" component={Home} />
      </Switch>
      <GlobalStyle />
    </div>
  );
}

export default App;
