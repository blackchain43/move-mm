/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import styled from "styled-components";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import {
  Collapse,
  Row,
  Col,
  Table,
  Button,
  Form,
  InputNumber,
  Select,
  Input,
  notification,
  Modal,
} from "antd";
import { useQuery } from "react-query";
import clone from "lodash/clone";
import { useWallet } from "@manahippo/aptos-wallet-adapter";

import { systemService } from "../../services";
import Container from "../../components/Container";
import { TOKENS } from "../../utils/constants";
import { shorten, formatMoney } from "../../utils";
import useWindowDimensions from "../../hooks/useWindowDimensions";

const { Panel } = Collapse;
const { confirm } = Modal;

const Wrapper = styled.div`
  position: relative;
  padding: 30px;
  .ant-collapse-item {
    .ant-collapse-header {
      font-weight: bold;
    }
  }
  .ant-input-number {
    width: 100%;
  }
  .ant-form-item-label > label {
    width: 150px;
  }
  .actions {
    display: flex;
    gap: 16px;
  }
  .red {
    color: red;
  }
  .green {
    color: green;
  }
`;

const Config = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState(null);
  const [form] = Form.useForm();
  const { width } = useWindowDimensions();
  const wallet = useWallet();

  const {
    data = {},
    isFetching,
    refetch,
  } = useQuery(
    [
      "systemService.fetchConfig",
      { requestor: wallet?.account?.address || "" },
    ],
    ({ queryKey }) => {
      return systemService.fetchConfig({ ...queryKey[1] });
    }
  );

  const items = React.useMemo(() => {
    if (data?.length > 0) return data;
    return [];
  }, [data]);

  const addConfig = React.useCallback(() => {
    setSelectedRow(null);
    form.setFieldsValue({
      tokenAType: TOKENS[1].token,
      tokenBType: TOKENS[0].token,
      swapAforB: true,
      slippage: 0.1,
      stopThreshold: undefined,
      lowerBound: undefined,
      upperBound: undefined,
      baseGasSwap: 0.06,
      poolAddress: undefined,
      decimalsA: TOKENS[1].decimals,
      decimalsB: TOKENS[0].decimals,
      name: undefined,
    });
  }, []);

  const onEdit = React.useCallback(
    (id) => {
      const row = clone(items.find((x) => x.id === id));
      setSelectedRow(row);
      form.setFieldsValue(row);
    },
    [items]
  );

  const onDelete = React.useCallback(
    async (id) => {
      confirm({
        title: "Are you sure delete this config?",
        icon: <ExclamationCircleOutlined />,
        okText: "Yes",
        okType: "danger",
        cancelText: "No",
        onOk: async () => {
          setIsLoading(true);
          try {
            const result = await systemService.deleteConfig({
              id,
              requestor: wallet?.account?.address,
            });
            if (result) {
              await refetch();
              notification.success({
                message: "Delete Success!",
              });
            }
          } catch (error) {
            console.log(error);
          } finally {
            setIsLoading(false);
          }
        },
        onCancel() {
          console.log("Cancel");
        },
      });
    },
    [items, wallet]
  );

  const onFinish = React.useCallback(
    async (values) => {
      setIsLoading(true);
      try {
        const result = await systemService.saveConfig({
          ...values,
          stopThreshold: `${values.stopThreshold}`,
          lowerBound: `${values.lowerBound}`,
          upperBound: `${values.upperBound}`,
          baseGasSwap: `${values.baseGasSwap}`,
          ...(selectedRow ? { id: selectedRow.id } : {}),
          requestor: wallet?.account?.address,
        });
        if (result) {
          await refetch();
          await addConfig();
          notification.success({
            message: "Save Success!",
          });
          form.resetFields();
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRow, wallet]
  );

  const onChangeType = React.useCallback((type, value) => {
    if (type === "A") {
      if (value === TOKENS[0].token) {
        form.setFieldValue("decimalsA", TOKENS[0].decimals);
        form.setFieldValue("tokenBType", TOKENS[1].token);
        form.setFieldValue("decimalsB", TOKENS[1].decimals);
      } else {
        form.setFieldValue("decimalsA", TOKENS[1].decimals);
        form.setFieldValue("tokenBType", TOKENS[0].token);
        form.setFieldValue("decimalsB", TOKENS[0].decimals);
      }
    } else {
      if (value === TOKENS[0].token) {
        form.setFieldValue("decimalsB", TOKENS[0].decimals);
        form.setFieldValue("tokenAType", TOKENS[1].token);
        form.setFieldValue("decimalsA", TOKENS[1].decimals);
      } else {
        form.setFieldValue("decimalsB", TOKENS[1].decimals);
        form.setFieldValue("tokenAType", TOKENS[0].token);
        form.setFieldValue("decimalsA", TOKENS[0].decimals);
      }
    }
  }, []);

  return (
    <Container>
      <Wrapper>
        <Collapse defaultActiveKey={["1", "2"]}>
          <Panel header="Config" key="1">
            <Row style={{ marginBottom: 16 }} justify="end">
              <Button type="primary" onClick={addConfig} loading={isLoading}>
                Add Config
              </Button>
            </Row>
            <Row style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Table
                  tableLayout="fixed"
                  loading={isFetching || isLoading}
                  rowKey="id"
                  columns={[
                    {
                      title: "Name",
                      dataIndex: "name",
                      width: 250,
                      render: (data, record) => (
                        <span className={record.swapAforB ? "red" : "green"}>
                          {data}
                        </span>
                      ),
                    },
                    {
                      title: "Stop Threshold",
                      dataIndex: "stopThreshold",
                      render: (data) => <span>{formatMoney(data)}</span>,
                    },
                    {
                      title: "Lower Bound",
                      dataIndex: "lowerBound",
                      render: (data) => <span>{formatMoney(data)}</span>,
                    },
                    {
                      title: "Upper Bound",
                      dataIndex: "upperBound",
                      render: (data) => <span>{formatMoney(data)}</span>,
                    },
                    ...(width > 1500
                      ? [
                          {
                            title: "Base Gas Swap",
                            dataIndex: "baseGasSwap",
                            render: (data) => <span>{formatMoney(data)}</span>,
                          },
                          {
                            title: "TokenA Type",
                            dataIndex: "tokenAType",
                            render: (data) => <span>{`${shorten(data)}`}</span>,
                          },
                          {
                            title: "Decimals A",
                            dataIndex: "decimalsA",
                          },
                          {
                            title: "TokenB Type",
                            dataIndex: "tokenBType",
                            render: (data) => <span>{`${shorten(data)}`}</span>,
                          },
                          {
                            title: "Decimals B",
                            dataIndex: "decimalsB",
                          },
                          {
                            title: "Pool Address",
                            dataIndex: "poolAddress",
                            render: (data) => <span>{`${shorten(data)}`}</span>,
                          },

                          {
                            title: "Swap A for B",
                            dataIndex: "swapAforB",
                            render: (data) => (
                              <span>{`${data ? "SELL" : "BUY"}`}</span>
                            ),
                          },
                          {
                            title: "Slippage",
                            dataIndex: "slippage",
                          },
                        ]
                      : []),
                    {
                      title: "Action",
                      dataIndex: "id",
                      width: 200,
                      render: (data) => (
                        <div className="actions">
                          <Button type="primary" onClick={() => onEdit(data)}>
                            Edit
                          </Button>
                          <Button
                            type="primary"
                            danger
                            onClick={() => onDelete(data)}
                          >
                            Delete
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  dataSource={items}
                  pagination={false}
                />
              </Col>
            </Row>
          </Panel>
          <Panel
            header={!selectedRow ? "Add Config" : `Detail ${selectedRow.id}`}
            key="2"
          >
            <Form
              form={form}
              name="horizontal_login"
              onFinish={onFinish}
              initialValues={{
                tokenAType: TOKENS[1].token,
                decimalsA: TOKENS[1].decimals,
                tokenBType: TOKENS[0].token,
                decimalsB: TOKENS[0].decimals,
                swapAforB: true,
                slippage: 0.1,
                baseGasSwap: 0.06,
              }}
              validateTrigger="onBlur"
            >
              <Row gutter={16}>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item
                    name="name"
                    label="Name"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <Input placeholder="Name" />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item
                    name="stopThreshold"
                    label="Stop Threshold"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <InputNumber placeholder="Enter Stop Threshold" />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item
                    name="lowerBound"
                    label="Lower Bound"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <InputNumber placeholder="Enter Lower Bound" />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item
                    name="upperBound"
                    label="Upper Bound"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <InputNumber placeholder="Enter Upper Bound" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Row gutter={16}>
                    <Col xl={6} lg={12} md={24}>
                      <Form.Item name="tokenAType" label="TokenA Type">
                        <Select
                          onChange={(value) => onChangeType("A", value)}
                          options={[
                            {
                              value: TOKENS[0].token,
                              label: "APT",
                            },
                            {
                              value: TOKENS[1].token,
                              label: "TOKEN",
                            },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xl={6} lg={12} md={24}>
                      <Form.Item
                        name="decimalsA"
                        label="Decimals A"
                        rules={[
                          {
                            required: true,
                          },
                        ]}
                      >
                        <InputNumber placeholder="Enter Decimals A" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
                <Col span={24}>
                  <Row gutter={16}>
                    <Col xl={6} lg={12} md={24}>
                      <Form.Item name="tokenBType" label="TokenB Type">
                        <Select
                          onChange={(value) => onChangeType("B", value)}
                          options={[
                            {
                              value: TOKENS[0].token,
                              label: "APT",
                            },
                            {
                              value: TOKENS[1].token,
                              label: "TOKEN",
                            },
                          ]}
                        />
                      </Form.Item>
                    </Col>
                    <Col xl={6} lg={12} md={24}>
                      <Form.Item
                        name="decimalsB"
                        label="Decimals B"
                        rules={[
                          {
                            required: true,
                          },
                        ]}
                      >
                        <InputNumber placeholder="Enter Decimals B" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item
                    name="poolAddress"
                    label="Pool Address"
                    rules={[
                      {
                        required: true,
                      },
                    ]}
                  >
                    <Input placeholder="Enter Pool Address" />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item name="swapAforB" label="Swap A for B">
                    <Select
                      options={[
                        {
                          value: true,
                          label: "SELL",
                        },
                        {
                          value: false,
                          label: "BUY",
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item name="slippage" label="Slippage">
                    <Select
                      options={[
                        {
                          value: 0.1,
                          label: 0.1,
                        },
                        {
                          value: 0.5,
                          label: 0.5,
                        },
                        {
                          value: 1,
                          label: 1,
                        },
                        {
                          value: 5,
                          label: 5,
                        },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xl={6} lg={12} md={24}>
                  <Form.Item name="baseGasSwap" label="Base Gas Swap">
                    <InputNumber placeholder="Enter Base Gas Swap" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item shouldUpdate className="no-bottom">
                {() => (
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={isLoading}
                  >
                    Save
                  </Button>
                )}
              </Form.Item>
            </Form>
          </Panel>
        </Collapse>
      </Wrapper>
    </Container>
  );
};

export default Config;
