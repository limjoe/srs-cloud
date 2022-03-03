import {useNavigate, useSearchParams} from "react-router-dom";
import {Container, Tabs, Tab} from "react-bootstrap";
import React from "react";
import {Token, Errors} from "../utils";
import axios from "axios";
import ScenarioDvr from './ScenarioDvr';
import ScenarioSource from './ScenarioSource';
import ScenarioSrt from './ScenarioSrt';
import ScenarioLive from './ScenarioLive';
import useUrls from "../components/UrlGenerator";
import ScenarioVod from './ScenarioVod';
import ScenarioForward from './ScenarioForward';

export default function Scenario() {
  const [searchParams] = useSearchParams();
  const [defaultActiveTab, setDefaultActiveTab] = React.useState();

  React.useEffect(() => {
    const tab = searchParams.get('tab') || 'live';
    console.log(`?tab=live|srt|dvr|source, current=${tab}, Select the tab to render`);
    setDefaultActiveTab(tab);
  }, [searchParams]);

  return (<>
    { defaultActiveTab && <ScenarioImpl defaultActiveTab={defaultActiveTab} /> }
  </>);
}

function ScenarioImpl({defaultActiveTab}) {
  const navigate = useNavigate();
  const [secret, setSecret] = React.useState();
  const [activeTab, setActiveTab] = React.useState(defaultActiveTab);
  const setSearchParams = useSearchParams()[1];

  const {
    rtmpServer,
    rtmpStreamKey,
    srtPublishUrl,
    srtPlayUrl,
    flvUrl,
    m3u8Url,
    cnConsole,
    flvPlayer,
    hlsPlayer,
    rtcPlayer,
    rtcPublisher,
    flvPlayer2,
    hlsPlayer2,
    rtcPlayer2,
    flvUrl2,
    m3u8Url2,
  } = useUrls({secret});

  React.useEffect(() => {
    const token = Token.load();
    axios.post('/terraform/v1/hooks/srs/secret/query', {
      ...token,
    }).then(res => {
      setSecret(res.data.data);
      console.log(`Status: Query ok, secret=${JSON.stringify(res.data.data)}`);
    }).catch(e => {
      const err = e.response.data;
      if (err.code === Errors.auth) {
        alert(`Token过期，请重新登录，${err.code}: ${err.data.message}`);
        navigate('/routers-logout');
      } else {
        alert(`服务器错误，${err.code}: ${err.data.message}`);
      }
    });
  }, [navigate]);

  const onSelectTab = (k) => {
    setSearchParams({'tab': k});
    setActiveTab(k);
  };

  return (
    <>
      <p></p>
      <Container>
        <Tabs defaultActiveKey={activeTab} id="uncontrolled-tab-example" className="mb-3" onSelect={(k) => onSelectTab(k)}>
          <Tab eventKey="live" title="私人直播间">
            { activeTab === 'live' && <ScenarioLive urls={{flvPlayer, rtmpServer, flvUrl, rtmpStreamKey, hlsPlayer, m3u8Url, rtcPlayer, cnConsole, rtcPublisher, flvPlayer2, flvUrl2, hlsPlayer2, m3u8Url2, rtcPlayer2}} /> }
          </Tab>
          <Tab eventKey="srt" title="超清实时直播">
            { activeTab === 'srt' && <ScenarioSrt urls={{srtPublishUrl, srtPlayUrl, flvPlayer, hlsPlayer, flvUrl, m3u8Url, rtcPlayer}}/> }
          </Tab>
          <Tab eventKey="dvr" title="云录制">
            { activeTab === 'dvr' && <ScenarioDvr /> }
          </Tab>
          <Tab eventKey="vod" title="云点播">
            { activeTab === 'vod' && <ScenarioVod /> }
          </Tab>
          <Tab eventKey="forward" title="多平台转播">
            { activeTab === 'forward' && <ScenarioForward /> }
          </Tab>
          <Tab eventKey="source" title="源代码">
            { activeTab === 'source' && <ScenarioSource /> }
          </Tab>
        </Tabs>
      </Container>
    </>
  );
}

