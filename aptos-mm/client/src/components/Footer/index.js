/* eslint-disable react/no-unescaped-entities */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  position: relative;

  .copyright {
    background: #0b0b0f;
    width: 100%;
    height: 86px;
    font-weight: 400;
    font-size: 14px;
    line-height: 22px;
    color: #f4f4f4;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Footer = () => (
  <Wrapper>
    <div className="copyright">
      Copyright @ 2023 AptosAdmin. All rights reserved.
    </div>
  </Wrapper>
);

export default Footer;
