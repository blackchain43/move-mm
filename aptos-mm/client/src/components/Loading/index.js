import React from "react";

const Loading = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
      width: "100%",
      position: "fixed",
      minHeight: "-webkit-fill-available",
      top: 0,
      left: 0,
      background: "#00000073",
    }}
  >
    <div style={{ textAlign: "center" }}></div>
  </div>
);

export default Loading;
