import {useNavigate} from "react-router-dom";
import Container from "react-bootstrap/Container";
import React from "react";
import {Token, Errors} from "./utils";
import axios from "axios";
import {Row, Col, Card, Button} from "react-bootstrap";
import PopoverConfirmButton from './PopoverConfirmButton';
const semver = require('semver');

export default function System() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState();
  const [srs, setSRS] = React.useState();
  const [hooks, setHooks] = React.useState();
  const [upgrading, setUpgrading] = React.useState();
  const [enableUpgrading, setEnableUpgrading] = React.useState();
  const [enableSrsOperators, setEnableSrsOperators] = React.useState();
  const [restartSrs, setRestartSrs] = React.useState();

  React.useEffect(() => {
    const token = Token.load();
    axios.post('/terraform/v1/mgmt/status', {
      ...token,
    }).then(res => {
      const status = res.data.data;
      if (status && status.releases && status.releases.latest) {
        if (semver.lt(status.version, status.releases.latest)) setEnableUpgrading(true);
      }
      setStatus(status);
      console.log(`Status: Query ok, status=${JSON.stringify(status)}`);
    }).catch(e => {
      const err = e.response.data;
      if (err.code === Errors.auth) {
        alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
        navigate('/logout');
      } else {
        alert(`服务器错误，${err.code}: ${err.data.message}`);
      }
    });
  }, [navigate]);

  React.useEffect(() => {
    // We never update the status when restarting.
    if (restartSrs === true) return;

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/srs', {
      ...token,
    }).then(res => {
      const status = res.data.data;
      if (status) setEnableSrsOperators(true);
      setSRS(status);
      console.log(`SRS: Query ok, status=${JSON.stringify(status)}`);
    }).catch(e => {
      const err = e.response.data;
      if (err.code === Errors.auth) {
        alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
        navigate('/logout');
      } else {
        alert(`服务器错误，${err.code}: ${err.data.message}`);
      }
    });
  }, [navigate, restartSrs]);

  React.useEffect(() => {
    if (!restartSrs) return;

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/srs', {
      ...token,
      action: 'restart',
    }).then(res => {
      setRestartSrs(false);
      console.log(`SRS: Restart ok`);
    }).catch(e => {
      const err = e.response.data;
      if (err.code === Errors.auth) {
        alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
        navigate('/logout');
      } else {
        alert(`服务器错误，${err.code}: ${err.data.message}`);
      }
    });
  }, [navigate, restartSrs]);

  React.useEffect(() => {
    const token = Token.load();
    axios.post('/terraform/v1/mgmt/hooks', {
      ...token,
    }).then(res => {
      const status = res.data.data;
      setHooks(status);
      console.log(`Hooks: Query ok, status=${JSON.stringify(status)}`);
    }).catch(e => {
      const err = e.response.data;
      if (err.code === Errors.auth) {
        alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
        navigate('/logout');
      } else {
        alert(`服务器错误，${err.code}: ${err.data.message}`);
      }
    });
  }, [navigate]);

  React.useEffect(() => {
    if (!upgrading) return;

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/upgrade', {
      ...token,
    }).then(res => {
      setUpgrading(false);
      console.log(`Status: Upgrade ok, status=${JSON.stringify(res.data.data)}`);
    }).catch(e => {
      if (e.response.status === 502) {
        alert(`升级完成，请刷新页面`);
      } else {
        alert(`未知错误, ${e.message}`);
      }
    });
  }, [upgrading]);

  return (
    <>
      <p></p>
      <Container>
        <Row>
          <Col xs lg={3}>
            <Card style={{ width: '18rem' }}>
              <Card.Header>SRS服务器</Card.Header>
              <Card.Body>
                <Card.Text>
                  容器名：{srs?.name} <br/>
                  容器ID：{srs?.container?.ID} <br/>
                  状态：{srs?.container.State} {srs?.container.Status}
                </Card.Text>
                <div style={{display: 'inline-block'}}>
                  {
                    !enableSrsOperators
                      ? <Button className='disabled'>重启</Button>
                      : <PopoverConfirmButton upgrading={restartSrs} handleClick={() => setRestartSrs(true)} text='重启' operator='重启'>
                        <p>
                          重启SRS会造成
                          <span className='text-danger'><strong>推拉流不可用</strong></span>，
                          确认继续重启么？
                        </p>
                      </PopoverConfirmButton>
                  } &nbsp;
                  <Button className='disabled'>
                    升级
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs lg={3}>
            <Card style={{ width: '18rem' }}>
              <Card.Header>SRS回调</Card.Header>
              <Card.Body>
                <Card.Text>
                  容器名：{hooks?.name} <br/>
                  容器ID：{hooks?.container?.ID} <br/>
                  状态：{hooks?.container.State} {hooks?.container.Status}
                </Card.Text>
                <div style={{display: 'inline-block'}}>
                  <Button className='disabled'>
                    重启
                  </Button> &nbsp;
                  <Button className='disabled'>
                    升级
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs lg={3}>
            <Card style={{ width: '18rem' }}>
              <Card.Header>管理后台</Card.Header>
              <Card.Body>
                <Card.Text>
                  你的版本: {status?.version} <br/>
                  稳定版本: {status?.releases?.stable} <br/>
                  最新版本: <a href='https://github.com/ossrs/srs/issues/2856#changelog' target='_blank' rel='noreferrer'>{status?.releases?.latest}</a>
                </Card.Text>
                {
                  !enableUpgrading
                  ? <Button className='disabled'>升级</Button>
                  : <PopoverConfirmButton upgrading={upgrading} handleClick={() => setUpgrading(true)} text='升级'>
                    <p>
                      升级管理后台，并且可能造成
                      <span className='text-danger'><strong>系统不可用</strong></span>，
                      确认继续升级么？
                    </p>
                  </PopoverConfirmButton>
                } &nbsp;
                {!enableUpgrading &&
                  <PopoverConfirmButton handleClick={() => setEnableUpgrading(true)} text='强制升级' operator='开启强制升级'>
                    <p>
                      你目前已经是最新版本，
                      <span className='text-warning'>没有必要强制升级</span>，
                      确认继续强制升级么？
                    </p>
                  </PopoverConfirmButton>
                }
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

