import React from "react";
import styled from "styled-components";

import Header from "../Header";

const Wrapper = styled.div`
  min-height: -webkit-fill-available;
  width: 100%;
  margin: 0 auto;
  position: relative;
  height: 100%;
  .background {
    min-height: -webkit-fill-available;
    width: 100%;
    margin: 0 auto;
    position: fixed;
    z-index: 1;
    height: 100%;
    .bgTop {
      position: absolute;
      top: 76px;
      right: 0;
    }
    .bgBottom {
      position: absolute;
      bottom: 0;
      left: 0;
    }
  }
  .container {
    min-height: -webkit-fill-available;
    width: 100%;
    margin: 0 auto;
    z-index: 2;
    height: 100%;
    position: relative;
    .children {
      position: relative;
      margin: 0 auto;
      min-height: calc(100% - 80px);
      z-index: 0;
    }
  }
`;

const Container = ({ children }) => (
  <Wrapper>
    <div className="container">
      <Header />
      <div className="children">{children}</div>
    </div>
  </Wrapper>
);

export default Container;
