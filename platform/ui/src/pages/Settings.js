import React from "react";
import {Accordion, Container, Form, Button, Tabs, Tab, InputGroup} from "react-bootstrap";
import {Clipboard, Token, PlatformPublicKey} from "../utils";
import axios from "axios";
import {useSearchParams} from "react-router-dom";
import {TutorialsButton, useTutorials} from '../components/TutorialsButton';
import SetupCamSecret from '../components/SetupCamSecret';
import {SrsErrorBoundary} from "../components/SrsErrorBoundary";
import {useErrorHandler} from "react-error-boundary";
import {useTranslation} from "react-i18next";

export default function Systems() {
  return (
    <SrsErrorBoundary>
      <SystemsImpl />
    </SrsErrorBoundary>
  );
}

function SystemsImpl() {
  const [searchParams] = useSearchParams();
  const [defaultActiveTab, setDefaultActiveTab] = React.useState();
  const [upgradeWindow, setUpgradeWindow] = React.useState();
  const handleError = useErrorHandler();

  React.useEffect(() => {
    const tab = searchParams.get('tab') || 'auth';
    console.log(`?tab=https|auth|tencent|beian|platform, current=${tab}, Select the tab to render`);
    setDefaultActiveTab(tab);
  }, [searchParams]);

  React.useEffect(() => {
    const token = Token.load();
    axios.post('/terraform/v1/mgmt/window/query', {
      ...token,
    }).then(res => {
      const data = res.data.data;
      const win = {
        ...data,
        end: data.start ? (data.start + data.duration)%24 : data.duration,
      };

      setUpgradeWindow(win);
      console.log(`Query upgrade window ${JSON.stringify(win)}`);
    }).catch(handleError);
  }, [handleError]);

  return (<>
    {
      defaultActiveTab && upgradeWindow &&
      <SettingsImpl2 defaultActiveTab={defaultActiveTab} defaultWindow={upgradeWindow} />
    }
  </>);
}

function SettingsImpl2({defaultActiveTab, defaultWindow}) {
  const [key, setKey] = React.useState();
  const [crt, setCrt] = React.useState();
  const [domain, setDomain] = React.useState();
  const [secret, setSecret] = React.useState();
  const [apiSecret, setAPISecret] = React.useState();
  const [beian, setBeian] = React.useState();
  const [activeTab, setActiveTab] = React.useState(defaultActiveTab);
  const [apiToken, setApiToken] = React.useState();
  const setSearchParams = useSearchParams()[1];
  const handleError = useErrorHandler();
  const {t} = useTranslation();

  const sslTutorials = useTutorials(React.useRef([
    {author: '程晓龙', id: 'BV1tZ4y1R7qp'},
  ]));

  const timeSeries = React.useRef([...Array(25).keys()]).current;
  const [upgradeWindowStart, setUpgradeWindowStart] = React.useState(defaultWindow.start);
  const [upgradeWindowEnd, setUpgradeWindowEnd] = React.useState(defaultWindow.end);

  React.useEffect(() => {
    const token = Token.load();
    axios.post('/terraform/v1/mgmt/secret/query', {
      ...token,
    }).then(res => {
      setAPISecret(res.data.data);
      console.log(`Status: Query ok, apiSecret=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError]);

  const updateBeian = React.useCallback((e) => {
    e.preventDefault();

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/beian/update', {
      ...token, beian: 'icp', text: beian,
    }).then(res => {
      alert(t('settings.footer'));
    }).catch(handleError);
  }, [handleError, beian, t]);

  const enablePlatformAccess = React.useCallback((e, enabled) => {
    e.preventDefault();

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/pubkey', {
      ...token, enabled,
    }).then(res => {
      alert(enabled ? t('settings.sshEnable') : t('settings.sshDisable'));
      console.log(`PublicKey: Update ok, enabled=${enabled}`);
    }).catch(handleError);
  }, [handleError, t]);

  const updateSSL = React.useCallback((e) => {
    e.preventDefault();

    if (!key || !crt) {
      alert(t('settings.sslNoFile'));
      return;
    }

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/ssl', {
      ...token, key, crt,
    }).then(res => {
      alert(t('settings.sslOk'));
      console.log(`SSL: Update ok`);
    }).catch(handleError);
  }, [handleError, key, crt, t]);

  const requestLetsEncrypt = React.useCallback((e) => {
    e.preventDefault();

    if (!domain) {
      alert(t('settings.sslNoDomain'));
      return;
    }

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/letsencrypt', {
      ...token, domain,
    }).then(res => {
      alert(t('settings.sslLetsOk'));
      console.log(`SSL: Let's Encrypt SSL ok`);
    }).catch(handleError);
  }, [handleError, domain, t]);

  const updateSecret = React.useCallback((e) => {
    e.preventDefault();

    if (!secret) {
      alert(t('settings.secretNoValue'));
      return;
    }

    const token = Token.load();
    axios.post('/terraform/v1/hooks/srs/secret/update', {
      ...token, secret,
    }).then(res => {
      alert(t('settings.secretOk'));
      console.log(`Secret: Update ok`);
    }).catch(handleError);
  }, [handleError, secret, t]);

  const onSelectTab = React.useCallback((k) => {
    setSearchParams({'tab': k});
    setActiveTab(k);
  }, [setSearchParams]);

  const setupUpgradeWindow = React.useCallback((e) => {
    e.preventDefault();

    const [start, end] = [parseInt(upgradeWindowStart || 0), parseInt(upgradeWindowEnd || 0)];

    const duration = start < end ? end - start : end + 24 - start;
    if (duration <= 3) return alert(t('settings.upgradeWindowInvalid'));

    const token = Token.load();
    axios.post('/terraform/v1/mgmt/window/update', {
      ...token, start, duration,
    }).then(res => {
      alert(t('settings.upgradeWindowOk'));
      console.log(`Setup upgrade window start=${start}, end=${end}, duration=${duration}`);
    }).catch(handleError);
  }, [handleError, upgradeWindowStart, upgradeWindowEnd, t]);

  const copyToClipboard = React.useCallback((e, text) => {
    e.preventDefault();

    Clipboard.copy(text).then(() => {
      alert(`已经复制到剪切板`);
    }).catch((err) => {
      alert(`复制失败，请右键复制链接 ${err}`);
    });
  }, []);

  const createApiToken = React.useCallback((e) => {
    e.preventDefault();

    axios.post('/terraform/v1/mgmt/secret/token', {
      apiSecret
    }).then(res => {
      setApiToken(res.data);
      console.log(`OpenAPI Example: Get access_token ok, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, apiSecret]);

  return (
    <>
      <p></p>
      <Container>
        <Tabs defaultActiveKey={activeTab} id="uncontrolled-tab-example" className="mb-3" onSelect={(k) => onSelectTab(k)}>
          <Tab eventKey="https" title="HTTPS">
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>HTTPS: Let's Encrypt</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.letsDomain')}</Form.Label>
                      <Form.Text> * {t('settings.letsDomainTip')}</Form.Text>
                      <Form.Control as="input" defaultValue={domain} onChange={(e) => setDomain(e.target.value)} />
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => requestLetsEncrypt(e)}>
                      {t('settings.letsDomainSubmit')}
                    </Button> &nbsp;
                    <TutorialsButton prefixLine={true} tutorials={sslTutorials} />
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="1">
                <Accordion.Header>{t('settings.sslFileTitle')}</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.sslFileKey')}</Form.Label>
                      <Form.Text> * {t('settings.sslFileKeyTip')}</Form.Text>
                      <Form.Control as="textarea" rows={5} defaultValue={key} onChange={(e) => setKey(e.target.value)} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.sslFileCert')}</Form.Label>
                      <Form.Text> * {t('settings.sslFileCertTip')}</Form.Text>
                      <Form.Control as="textarea" rows={5} defaultValue={crt} onChange={(e) => setCrt(e.target.value)} />
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => updateSSL(e)}>
                      {t('settings.sslFileSubmit')}
                    </Button> &nbsp;
                    <TutorialsButton prefixLine={true} tutorials={sslTutorials} />
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
          <Tab eventKey="auth" title={t('settings.tabAuth')}>
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>{t('settings.authTitle')}</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.authSecret')}</Form.Label>
                      <Form.Text> * {t('settings.authSecretTip')}</Form.Text>
                      <Form.Control as="input" defaultValue={secret} onChange={(e) => setSecret(e.target.value)}/>
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => updateSecret(e, true)}>
                      {t('settings.authSubmit')}
                    </Button> &nbsp;
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
          <Tab eventKey="tencent" title={t('settings.tabTencent')}>
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>{t('settings.tecentTitle')}</Accordion.Header>
                <Accordion.Body>
                  <SetupCamSecret />
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
          <Tab eventKey="beian" title={t('settings.tabFooter')}>
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>{t('settings.footerTitle')}</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.footerIcp')}</Form.Label>
                      <Form.Control as="input" defaultValue={beian} placeholder={t('settings.footerHolder')} onChange={(e) => setBeian(e.target.value)}/>
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => updateBeian(e)}>
                      {t('settings.footerSubmit')}
                    </Button>
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
          <Tab eventKey="api" title="OpenAPI">
            <Accordion defaultActiveKey="2">
              <Accordion.Item eventKey="0">
                <Accordion.Header>接入介绍</Accordion.Header>
                <Accordion.Body>
                  <div>
                    SRS Cloud 向开发者提供 Open API, 方便开发者对接 SRS Cloud 平台。
                    <p></p>
                  </div>
                  <p>平台 Open API 使用说明:</p>
                  <ul>
                    <li> token 是 OpenAPI 接口调用凭据, 调用各接口时都需要使用 token </li>
                    <li> 使用 apiSeceret 调用 /terraform/v1/mgmt/secret/token 接口, 可获取 token, 默认有效期为 1 年 </li>
                  </ul>
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="1">
                <Accordion.Header>获取ApiSecret</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>ApiSecret</Form.Label>
                      <Form.Text> * 使用ApiSecret生成token，用于访问SRS Cloud OpenAPI</Form.Text>
                      <Form.Control as="input" type='password' rows={1} defaultValue={apiSecret} readOnly={true}/>
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => copyToClipboard(e, apiSecret)}>
                      复制
                    </Button>
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="2">
                <Accordion.Header>API: 创建Token</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>API 接口</Form.Label>
                      <Form.Control as="textarea" rows={1} defaultValue='POST /terraform/v1/mgmt/secret/token' readOnly={true} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Body 请求参数</Form.Label>
                      <pre>
                        {JSON.stringify({apiSecret: `${'*'.repeat(apiSecret?.length)}`}, null, 2)}
                      </pre>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      { apiToken && <><Form.Label>响应结果</Form.Label><pre>{JSON.stringify(apiToken, null, 2)}</pre></> }
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => createApiToken(e)}>
                      RUN
                    </Button> &nbsp;
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="3">
                <Accordion.Header>API: 获取推流密钥</Accordion.Header>
                <Accordion.Body>
                  <RunOpenAPI token={apiToken?.data?.token} api='/terraform/v1/hooks/srs/secret/query' />
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
          <Tab eventKey="platform" title={t('settings.tabPlatform')}>
            <Accordion defaultActiveKey="0">
              <Accordion.Item eventKey="0">
                <Accordion.Header>{t('settings.platformSsh')}</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>{t('settings.platformPubkey')}</Form.Label>
                      <Form.Text> * {t('settings.platformPubkeyTip')}</Form.Text>
                      <Form.Control as="textarea" rows={2} defaultValue={PlatformPublicKey} readOnly={true} />
                    </Form.Group>
                    <Button variant="primary" type="submit" onClick={(e) => enablePlatformAccess(e, true)}>
                      {t('settings.platformAccessEnable')}
                    </Button> &nbsp;
                    <Button variant="primary" type="submit" onClick={(e) => enablePlatformAccess(e, false)}>
                      {t('settings.platformAccessDisable')}
                    </Button>
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
              <Accordion.Item eventKey="1">
                <Accordion.Header>{t('settings.upgradeTitle')}</Accordion.Header>
                <Accordion.Body>
                  <Form>
                    <Form.Label htmlFor="basic-url">{t('settings.upgradeWindow')}</Form.Label>
                    <Form.Text> * {t('settings.upgradeTip')}</Form.Text>
                    <InputGroup className="mb-3">
                      <InputGroup.Text>{t('settings.upgradeStart')}</InputGroup.Text>
                      <Form.Select
                        aria-label="Start time"
                        defaultValue={upgradeWindowStart}
                        onChange={(e) => setUpgradeWindowStart(e.target.value)}
                      >
                        {timeSeries.map((e) => {
                          return <option key={e} value={e}>{`${String(e).padStart(2, '0')}:00`}</option>;
                        })}
                      </Form.Select>
                    </InputGroup>
                    <InputGroup className="mb-3">
                      <InputGroup.Text>{t('settings.upgradeEnd')}</InputGroup.Text>
                      <Form.Select
                        aria-label="End time"
                        defaultValue={upgradeWindowEnd}
                        onChange={(e) => setUpgradeWindowEnd(e.target.value)}
                      >
                        {timeSeries.map((e) => {
                          return <option key={e} value={e}>{`${String(e).padStart(2, '0')}:00`}</option>;
                        })}
                      </Form.Select>
                    </InputGroup>
                    <Button variant="primary" type="submit" onClick={(e) => setupUpgradeWindow(e)}>
                      {t('settings.upgradeSubmit')}
                    </Button>
                  </Form>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Tab>
        </Tabs>
      </Container>
    </>
  );
}

function RunOpenAPI(props) {
  const [showResult, setShowResult] = React.useState();
  const {token, api} = props;

  const onClick = React.useCallback((e) => {
    e.preventDefault();
    setShowResult(!showResult);
  }, [showResult]);

  if (!token) {
    return (
      <div>
        没有Token，请先运行<code>API: 创建Token</code>
      </div>
    );
  }

  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label>API 接口</Form.Label>
        <Form.Control as="textarea" rows={1} defaultValue={`POST ${api}`} readOnly={true} />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Body 请求参数 </Form.Label>
        <pre>
          {JSON.stringify({token: `${token || ''}`}, null, 2)}
        </pre>
      </Form.Group>
      <Form.Group className="mb-3">
        { showResult && <SrsErrorBoundary><OpenAPIResult {...props} /></SrsErrorBoundary> }
      </Form.Group>
      <Button variant="primary" type="submit" onClick={(e) => onClick(e)}>
        {showResult ? 'RESET' : 'RUN'}
      </Button> &nbsp;
    </Form>
  );
}

function OpenAPIResult({token, api}) {
  const handleError = useErrorHandler();
  const [openAPIRes, setOpenAPIRes] = React.useState();

  React.useEffect(() => {
    axios.post(api, {
      token: token
    }).then(res => {
      setOpenAPIRes(res.data);
      console.log(`OpenAPI: Run api=${api} ok, data=${JSON.stringify(res.data.data)}`);
    }).catch(handleError);
  }, [handleError, token, api]);

  return (
    <>
      <Form.Label>响应结果</Form.Label>
      <pre>
      {JSON.stringify(openAPIRes, null, 2)}
      </pre>
    </>
  );
}

