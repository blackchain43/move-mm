import React from "react";
import styled from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { useWallet } from "@manahippo/aptos-wallet-adapter";
import { Button } from "antd";

import { shorten } from "../../utils";

const logoImg = require("../../images/logo.png");

const MENUS = [
  { title: "Home", link: "/" },
  { title: "Config", link: "/config" },
  { title: "Task", link: "/task" },
];

const Wrapper = styled.div`
  width: 100%;
  height: 80px;
  position: sticky;
  top: 0;
  background: #0b0b0f;
  z-index: 99;
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    padding: 20px 80px;
    .logo {
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      line-height: 22px;
      color: white;
      width: 300px;
      img {
        cursor: pointer;
        margin-right: 8px;
      }
    }
    .menus {
      display: flex;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      line-height: 22px;
      color: #a5a5a5;
      .menu {
        padding: 6px 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        &.active {
          color: white;
        }
      }
    }
    [type="button"] {
      -webkit-appearance: none;
    }
    .user {
      display: flex;
      align-items: center;
      color: white;
      width: 300px;
      justify-content: end;
      button {
        margin-left: 8px;
      }
    }
    .menu-mobile {
      display: flex;
      align-items: center;
      .hamburger {
        margin-left: 16px;
        cursor: pointer;
      }
    }
    @media only screen and (max-width: 1260px) {
      padding: 20px 30px;
    }
    @media only screen and (max-width: 767px) {
      padding: 20px 15px;
    }
  }
  @media only screen and (max-width: 950px) {
    height: 60px;
  }
`;

const Header = () => {
  const history = useHistory();
  const location = useLocation();
  const wallet = useWallet();
  const isActiveMenu = React.useCallback(
    (pathname) => (location.pathname === pathname ? "active" : ""),
    [location]
  );
  return (
    <Wrapper>
      <div className="header">
        <div className="logo" onClick={() => history.push("/")}>
          <img src={logoImg} alt="logoImg" height={40} />
        </div>
        <div className="menus">
          {MENUS.map((m, idx) => (
            <div
              className={`menu ${isActiveMenu(m.link)}`}
              key={idx}
              onClick={() => history.push(m.link)}
            >
              {m.title}
            </div>
          ))}
        </div>
        {wallet.connected ? (
          <div className="user">
            {shorten(wallet?.account?.address)}
            <Button
              type="primary"
              className="hover-light"
              onClick={() => wallet.disconnect()}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="user">
            <Button
              type="primary"
              className="hover-light"
              onClick={() => {
                wallet.connect("Pontem");
              }}
            >
              Connect Wallet
            </Button>
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default Header;
