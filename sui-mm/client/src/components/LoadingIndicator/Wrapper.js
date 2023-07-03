import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  min-height: ${props => props.height};
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export default Wrapper;
