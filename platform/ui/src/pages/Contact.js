import React from "react";
import {Container, Carousel} from "react-bootstrap";
import srsCloud from "../resources/srs-cloud-1296x648.png";
import srsServer from "../resources/srs-server-1296x648.png";
import srsVideo from "../resources/srs-video-1296x648.png";
import {useSrsLanguage} from "../components/LanguageSwitch";

export default function Contact() {
  const language = useSrsLanguage();
  return language === 'zh' ? <ContactCn /> : <ContactEn />;
}

function ContactCn() {
  return (
    <Container>
      <Carousel variant="dark">
        <Carousel.Item>
          <img
            className="d-block w-100"
            src={srsCloud}
            alt="SRS云服务器"
          />
          <Carousel.Caption>
            <h5>欢迎加SRS云服务器专享微信群</h5>
            <p>
              欢迎加群探讨使用经验，寻求帮助，请先观看<a href='https://www.bilibili.com/video/BV1844y1L7dL/' target='_blank' rel='noreferrer'>视频入门教程</a>。<br/>
              SRS以及音视频相关的问题，请移步相关开源社区交流。
            </p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src={srsVideo}
            alt="SRS每周答疑"
          />
          <Carousel.Caption>
            <h5>欢迎关注SRS视频号</h5>
            <p>
              每周六晚上20点答疑哦，有问必答，欢迎来问。
            </p>
          </Carousel.Caption>
        </Carousel.Item>
        <Carousel.Item>
          <img
            className="d-block w-100"
            src={srsServer}
            alt="SRS开源服务器"
          />
          <Carousel.Caption>
            <h5>欢迎加SRS开源服务器社区</h5>
            <p>
              SRS是全球Top1的开源视频服务器，应用在直播和WebRTC领域。
            </p>
          </Carousel.Caption>
        </Carousel.Item>
      </Carousel>
    </Container>
  );
}

function ContactEn() {
  return (
    <Container>
      Welcome to contact us by:
      <ul>
        <li>
          Discord:
          <a href='https://discord.gg/yZ4BnPmHAd' target='_blank' rel='noreferrer'>
            https://discord.gg/yZ4BnPmHAd
          </a>
        </li>
        <li>
          Twitter:
          <a href='https://twitter.com/srs_server' target='_blank' rel='noreferrer'>
            https://twitter.com/srs_server
          </a>
        </li>
        <li>
          GitHub:
          <a href='https://github.com/ossrs/srs' target='_blank' rel='noreferrer'>
            https://github.com/ossrs/srs
          </a>
        </li>
      </ul>
    </Container>
  );
}
