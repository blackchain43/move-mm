import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  body {
    background: #ffffff;
    color: rgba(0, 0, 0, 0.88);
  }

  html,
  body {
    height: 100%;
    width: 100%;
    line-height: 1.5;
    font-size: 14px;
    overflow-x: hidden;
    position: fixed;
    min-height: -webkit-fill-available;
  }

  body, p, label, h1, h2, h3, h4, h5, h6 {
    font-family: 'Archivo' !important;
  }

  body.fontLoaded {
    font-family: 'Archivo' !important;
  }

  #root {
    background: #ffffff;
    color: rgba(0, 0, 0, 0.88);
    width: 100%;
    height: 100%;
    margin: 0 auto;
    overflow-x: hidden;
    overflow-y: auto;
    position: fixed;
    min-height: -webkit-fill-available;
  }

  .main {
    min-height: -webkit-fill-available;
    width: 100%;
    margin: 0 auto;
    height: 100%;
  }

   #root::-webkit-scrollbar-track
  {
    box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
    background-color: #f1f1f1;
  }

  #root::-webkit-scrollbar
  {
    width: 6px;
    background-color: #f1f1f1;
  }

  #root::-webkit-scrollbar-thumb
  {
    background-color: #888;
  }

  .hover-light {
    &:hover, &:focus {
      filter: brightness(1.25);
      &:disabled {
        filter: none;
      }
    }
  }

  .ant-notification-notice {
    color: white;
    padding: 8px 12px !important;
    &.ant-notification-notice-warning {
      background-color: #faad14;
    }
    &.ant-notification-notice-error {
      background-color: #E55656;
    }
    &.ant-notification-notice-success {
      background-color: #267559;
    }
    .ant-notification-notice-icon {
      color: white !important;
    }
    .ant-notification-notice-message {
      color: white;
      margin-bottom: 0px;
    }
    .ant-notification-notice-close {
      font-size: 16px;
      color: white;
      top: 8px !important;
    }
    .ant-notification-notice-with-icon {
      display: flex;
      align-items: center;
    }
  }

  .ant-dropdown {
    top: 60px !important;
    width: 184px !important;
    .ant-dropdown-menu {
      background: #2D3237;
      border-radius: 8px;
      .ant-dropdown-menu-item {
        &:hover {
          background: #3D4856;
        }
        .ant-dropdown-menu-title-content {
          color: white;
          .wkit-button {
            background: transparent !important;
            justify-content: flex-start;
            padding: 0 !important;
            font-weight: 400 !important;
            font-size: 14px !important;
            line-height: 22px !important;
            height: 22px !important;
          }
        }
      }
    }
  }
  .ant-popover {
    .ant-popover-arrow {
      .ant-popover-arrow-content::before {
        background: #383838;
      }
    }
    .ant-popover-inner {
      background: #383838;
      border-radius: 6px;
      font-family: 'Archivo';
      font-style: normal;
      font-weight: 400;
      font-size: 13px;
      line-height: 18px;
      .ant-popover-inner-content {
        color: #FFFFFF;
      }
    }
  }
`;

export default GlobalStyle;
