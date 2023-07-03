import React from "react";
import styled from "styled-components";
import { useHistory } from "react-router-dom";

const arrowLeft = require("../../images/arrow-left.png");

const Wrapper = styled.div`
  .back {
    display: flex;
    gap: 8px;
    font-weight: 400;
    font-size: 16px;
    line-height: 24px;
    align-items: center;
    margin-bottom: 30px;
    cursor: pointer;
  }
`;

const Back = () => {
  const history = useHistory();
  return (
    <Wrapper>
      <div className="back" onClick={() => history.goBack()}>
        <img src={arrowLeft} alt="arrowLeft" width={24} />
        Back
      </div>
    </Wrapper>
  );
};

export default Back;
