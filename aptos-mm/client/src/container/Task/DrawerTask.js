import React from "react";
import {
  Collapse,
  Row,
  Col,
  Table,
  Button,
  notification,
  Divider,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Input,
} from "antd";
import { useWallet } from "@manahippo/aptos-wallet-adapter";
import styled from "styled-components";

import { formatMoney } from "../../utils";
import { systemService } from "../../services";
import moment from "moment";

const { Panel } = Collapse;

const Wrapper = styled.div`
  position: relative;
  .ant-collapse-item {
    .ant-collapse-header {
      font-weight: bold;
    }
  }
  .ant-input-number,
  .ant-picker {
    width: 100%;
  }
  .ant-form-item-label > label {
    width: 100px;
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

const DrawerTask = ({ selectedTask, configs, wallets, isLoading, reset }) => {
  const [isSubmiting, setIsSubmiting] = React.useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [form] = Form.useForm();
  const wallet = useWallet();

  const selectAll = React.useCallback(() => {
    if (selectedRowKeys?.length === 0) {
      setSelectedRowKeys(wallets?.map((x) => x.address) || []);
    } else {
      setSelectedRowKeys([]);
    }
  }, [wallets, selectedRowKeys]);

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = React.useMemo(() => {
    return selectedRowKeys.length > 0;
  }, [selectedRowKeys]);

  const onFinish = React.useCallback(
    async (values) => {
      setIsSubmiting(true);
      try {
        let result;
        if (selectedTask?.isResue) {
          result = await systemService.reuseTask({
            startTime: values.startTime.valueOf(),
            taskId: selectedTask?.id,
          });
        } else {
          result = await systemService.saveTask({
            ...values,
            startTime: values.startTime.valueOf(),
            wallets: selectedRowKeys,
            requestor: wallet?.account?.address,
          });
        }

        if (result) {
          notification.success({
            message: "Save Success!",
          });
          form.resetFields();
          setSelectedRowKeys([]);
          await reset();
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsSubmiting(false);
      }
    },
    [
      form,
      reset,
      selectedRowKeys,
      selectedTask?.id,
      selectedTask?.isResue,
      wallet?.account?.address,
    ]
  );

  const walletsTask = React.useMemo(() => {
    if (selectedTask?.walletList) {
      return (
        wallets?.filter((x) => selectedTask?.walletList?.includes(x.address)) ||
        []
      );
    } else {
      return wallets || [];
    }
  }, [selectedTask, wallets]);

  return (
    <Wrapper>
      <Collapse defaultActiveKey={["1", "2"]}>
        <Panel header="Config" key="1">
          {!selectedTask && (
            <Row align="middle" style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Row align="middle" style={{ gap: 16 }}>
                  <Button
                    type="primary"
                    onClick={selectAll}
                    loading={isLoading || isSubmiting}
                  >
                    Select/DeSelect All
                  </Button>
                  <span style={{ marginLeft: 8 }}>
                    Selected {selectedRowKeys.length}/{walletsTask.length} items
                  </span>
                </Row>
              </Col>
            </Row>
          )}
          <Row style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Table
                loading={isSubmiting || isLoading}
                rowKey="address"
                columns={[
                  {
                    title: "Address",
                    key: "Address",
                    dataIndex: "address",
                  },
                  {
                    title: "APT",
                    key: "APT",
                    dataIndex: "aptBalance",
                    render: (apt) => <span>{formatMoney(apt)}</span>,
                  },
                  {
                    title: "TOKEN",
                    key: "TOKEN",
                    dataIndex: "tokenBalance",
                    render: (token) => <span>{formatMoney(token)}</span>,
                  },
                ]}
                dataSource={walletsTask}
                rowSelection={selectedTask ? null : rowSelection}
              />
            </Col>
          </Row>
          <Divider orientation="left" plain>
            Information
          </Divider>
          <Form
            form={form}
            name="horizontal_login"
            onFinish={onFinish}
            initialValues={
              selectedTask
                ? {
                    ...selectedTask,
                    startTime: selectedTask?.startTime
                      ? moment(selectedTask?.startTime)
                      : undefined,
                  }
                : {}
            }
            validateTrigger="onBlur"
          >
            <Row gutter={16}>
              <Col xxl={6} xl={12} span={24}>
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Input placeholder="Name" disabled={selectedTask} />
                </Form.Item>
              </Col>
              <Col xxl={6} xl={12} span={24}>
                <Form.Item
                  name="startTime"
                  label="Start Time"
                  rules={[
                    {
                      required: true,
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (
                          !value ||
                          moment(getFieldValue("startTime")).diff(
                            moment(),
                            "minutes"
                          ) >= 5
                        ) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(
                            "Start Time must be after now at least 5 min!"
                          )
                        );
                      },
                    }),
                  ]}
                >
                  <DatePicker
                    showTime
                    disabled={selectedTask && selectedTask?.isResue !== true}
                  />
                </Form.Item>
              </Col>
              <Col xxl={6} xl={12} span={24}>
                <Form.Item
                  name="duration"
                  label="Duration"
                  rules={[
                    {
                      required: true,
                    },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (
                          !value ||
                          (getFieldValue("duration") >= 300000 &&
                            getFieldValue("duration") <= 2147483647)
                        ) {
                          return Promise.resolve();
                        }
                        return Promise.reject(
                          new Error(
                            getFieldValue("duration") < 300000
                              ? "Duration must be greater than 300000"
                              : "Duration must be lower than 2147483647!"
                          )
                        );
                      },
                    }),
                  ]}
                >
                  <InputNumber
                    placeholder="millisecond"
                    disabled={selectedTask}
                  />
                </Form.Item>
              </Col>
              <Col xxl={6} xl={12} span={24}>
                <Form.Item
                  name="strategies"
                  label="Strategies"
                  rules={[
                    {
                      required: true,
                    },
                  ]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Please select"
                    style={{ width: "100%" }}
                    options={configs}
                    disabled={selectedTask}
                  />
                </Form.Item>
              </Col>
              {(!selectedTask || selectedTask?.isResue === true) && (
                <Col span={24}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={isLoading}
                    disabled={!hasSelected && selectedTask?.isResue !== true}
                  >
                    Save
                  </Button>
                </Col>
              )}
            </Row>
          </Form>
        </Panel>
      </Collapse>
    </Wrapper>
  );
};

export default DrawerTask;
