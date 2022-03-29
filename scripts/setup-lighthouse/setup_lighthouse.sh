#!/bin/bash

REALPATH=$(realpath $0)
WORK_DIR=$(cd $(dirname $REALPATH)/../.. && pwd)
echo "Run setup at $WORK_DIR from $0"
cd $WORK_DIR

########################################################################################################################
# Check OS first, only support CentOS 7.
yum --version >/dev/null 2>&1 && rpm --version >/dev/null 2>&1
if [[ $? -ne 0 ]]; then echo "Only support CentOS 7"; exit 1; fi

# Check CentOS version.
CentOS_VERSION=$(rpm --eval '%{centos_ver}')
if [[ $CentOS_VERSION -ne 7 ]]; then echo "Only support CentOS 7, yours is $CentOS_VERSION"; exit 1; fi

# User should install nodejs, because we can't do it.
(cd scripts/check-node-version && npm install && node .)
if [[ $? -ne 0 ]]; then echo "Please install node from https://nodejs.org"; exit 1; fi

# Check user lighthouse
if [[ $(id -un lighthouse 2>/dev/null) == '' ]]; then
  echo "No user lighthouse"; exit 1;
fi

# Check user lighthouse home directory.
if [[ ! -d ~lighthouse ]]; then
  echo "No home directory ~lighthouse"; exit 1;
fi

# Ignore darwin
if [[ $(uname -s) == 'Darwin' ]]; then
  echo "Mac is not supported"; exit 1;
fi

########################################################################################################################
# Install depends services, except nodejs.
yum install -y git gcc-c++ gdb make tree dstat docker redis nginx &&
systemctl enable docker nginx redis
if [[ $? -ne 0 ]]; then echo "Install dependencies failed"; exit 1; fi

# Install files to lighthouse directory.
mkdir -p /usr/local/lighthouse/softwares &&
rm -rf /usr/local/lighthouse/softwares/srs-cloud &&
(cd $(dirname $WORK_DIR) && cp -r $(basename $WORK_DIR) /usr/local/lighthouse/softwares/srs-cloud) &&
cd /usr/local/lighthouse/softwares/srs-cloud &&
make build && make install
if [[ $? -ne 0 ]]; then echo "Copy srs-cloud failed"; exit 1; fi

cd /usr/local/lighthouse/softwares && rm -rf srs-terraform && ln -sf srs-cloud srs-terraform
if [[ $? -ne 0 ]]; then echo "Link srs-cloud failed"; exit 1; fi

########################################################################################################################
# Cache the docker images for srs-cloud to startup faster.
systemctl start docker &&
echo "Cache docker images from TCR Beijing" &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs:4 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/lighthouse:4 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/node:slim &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs-cloud:hooks-1 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs-cloud:tencent-1 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs-cloud:ffmpeg-1 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/srs-cloud:platform-1 &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/prometheus &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/redis_exporter &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/node-exporter &&
docker pull registry.cn-hangzhou.aliyuncs.com/ossrs/certbot &&
echo "Cache docker images from TCR Singapore" &&
docker pull sgccr.ccs.tencentyun.com/ossrs/srs:4 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/lighthouse:4 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/node:slim &&
docker pull sgccr.ccs.tencentyun.com/ossrs/srs-cloud:hooks-1 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/srs-cloud:tencent-1 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/srs-cloud:ffmpeg-1 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/srs-cloud:platform-1 &&
docker pull sgccr.ccs.tencentyun.com/ossrs/prometheus &&
docker pull sgccr.ccs.tencentyun.com/ossrs/redis_exporter &&
docker pull sgccr.ccs.tencentyun.com/ossrs/node-exporter &&
docker pull sgccr.ccs.tencentyun.com/ossrs/certbot
if [[ $? -ne 0 ]]; then echo "Cache docker images failed"; exit 1; fi

# If install ok, the directory should exists.
if [[ ! -d /usr/local/srs-cloud || ! -d /usr/local/srs-cloud/mgmt ]]; then
  echo "Install srs-cloud failed"; exit 1;
fi

cd /usr/local && rm -rf srs-terraform && ln -sf srs-cloud srs-terraform
if [[ $? -ne 0 ]]; then echo "Link srs-cloud failed"; exit 1; fi

# Create srs-cloud service, and the credential file.
# Remark: Never start the service, because the IP will change for new machine created.
cd /usr/local/srs-cloud &&
cp -f usr/lib/systemd/system/srs-cloud.service /usr/lib/systemd/system/srs-cloud.service &&
touch /usr/local/srs-cloud/mgmt/.env &&
systemctl enable srs-cloud
if [[ $? -ne 0 ]]; then echo "Install srs-cloud failed"; exit 1; fi

# Choose default language.
echo 'REACT_APP_LOCALE=zh' > /usr/local/srs-cloud/mgmt/.env
if [[ $? -ne 0 ]]; then echo "Setup language failed"; exit 1; fi

# Generate self-sign HTTPS crt and file.
if [[ ! -f /etc/nginx/ssl/nginx.key ]]; then
  mkdir -p /etc/nginx/ssl &&
  rm -f /etc/nginx/ssl/nginx.key /etc/nginx/ssl/nginx.crt &&
  openssl genrsa -out /etc/nginx/ssl/nginx.key 2048 &&
  openssl req -new -x509 -key /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
    -days 3650 -subj "/C=CN/ST=Beijing/L=Beijing/O=Me/OU=Me/CN=ossrs.net"
  if [[ $? -ne 0 ]]; then echo "Create self-sign cert failed"; exit 1; fi
fi

# Setup the nginx configuration.
rm -f /etc/nginx/nginx.conf &&
cp /usr/local/lighthouse/softwares/srs-cloud/mgmt/containers/conf/nginx.conf /etc/nginx/nginx.conf &&
rm -f /usr/share/nginx/html/index.html &&
cp /usr/local/lighthouse/softwares/srs-cloud/mgmt/containers/www/nginx.html /usr/share/nginx/html/index.html &&
rm -f /usr/share/nginx/html/50x.html &&
cp /usr/local/lighthouse/softwares/srs-cloud/mgmt/containers/www/50x.html /usr/share/nginx/html/50x.html
if [[ $? -ne 0 ]]; then echo "Setup nginx config failed"; exit 1; fi

cd /usr/local/lighthouse/softwares/srs-cloud/mgmt &&
cp containers/conf/nginx.default.conf /etc/nginx/default.d/default.conf && echo "Refresh nginx default.conf ok" &&
cp containers/conf/nginx.mgmt.conf /etc/nginx/default.d/mgmt.conf && echo "Refresh nginx mgmt.conf ok" &&
cp containers/conf/nginx.srs.conf /etc/nginx/default.d/srs.conf && echo "Refresh nginx srs.conf ok" &&
cp containers/conf/nginx.dvr.preview.conf /etc/nginx/default.d/dvr.preview.conf && echo "Refresh nginx dvr.preview.conf ok"
if [[ $? -ne 0 ]]; then echo "Reload nginx failed"; exit 1; fi

# Update sysctl.conf and add if not exists. For example:
#   update_sysctl net.ipv4.ip_forward 1 0 "# Controls IP packet forwarding"
function update_sysctl() {
    SYSCTL_KEY=$1 && SYSCTL_VALUE=$2 && SYSCTL_EMPTY_LINE=$3 && SYSCTL_COMMENTS=$4
    echo "Update with sysctl $SYSCTL_KEY=$SYSCTL_VALUE, empty-line=$SYSCTL_EMPTY_LINE, comment=$SYSCTL_COMMENTS"

    grep -q "^${SYSCTL_KEY}[ ]*=" /etc/sysctl.conf
    if [[ $? == 0 ]]; then
      sed -i "s/^${SYSCTL_KEY}[ ]*=.*$/${SYSCTL_KEY} = ${SYSCTL_VALUE}/g" /etc/sysctl.conf
    else
      if [[ $SYSCTL_EMPTY_LINE == 1 ]]; then echo '' >> /etc/sysctl.conf; fi &&
      if [[ $SYSCTL_COMMENTS != '' ]]; then echo "$SYSCTL_COMMENTS" >> /etc/sysctl.conf; fi &&
      echo "${SYSCTL_KEY} = ${SYSCTL_VALUE}" >> /etc/sysctl.conf
    fi
    if [[ $? -ne 0 ]]; then echo "Failed to sysctl $SYSCTL_KEY = $SYSCTL_VALUE $SYSCTL_COMMENTS"; exit 1; fi

    RESULT=$(grep "^${SYSCTL_KEY}[ ]*=" /etc/sysctl.conf)
    echo "Update done: ${RESULT}"
}

# Allow network forwarding, required by docker.
# See https://stackoverflow.com/a/41453306/17679565
update_sysctl net.ipv4.ip_forward 1 1 "# Controls IP packet forwarding"

# Setup the UDP buffer for WebRTC and SRT.
# See https://www.jianshu.com/p/6d4a89359352
update_sysctl net.core.rmem_max 16777216 1 "# For RTC/SRT over UDP"
update_sysctl net.core.rmem_default 16777216
update_sysctl net.core.wmem_max 16777216
update_sysctl net.core.wmem_default 16777216

########################################################################################################################
# Setup the mod and link.
chown -R lighthouse:lighthouse /usr/local/lighthouse/softwares/ &&
chown -R lighthouse:lighthouse /etc/nginx/default.d/ &&
chown -R lighthouse:lighthouse /etc/nginx/ssl/ &&
chown -R lighthouse:lighthouse /usr/local/srs-cloud/
if [[ $? -ne 0 ]]; then echo "Link files failed"; exit 1; fi

rm -rf ~/lighthouse/ssl && ln -sf /etc/nginx/ssl ~lighthouse/ssl &&
rm -rf ~lighthouse/credentials.txt && ln -sf /usr/local/srs-cloud/mgmt/.env ~lighthouse/credentials.txt &&
rm -rf ~lighthouse/upgrade && ln -sf /usr/local/lighthouse/softwares/srs-cloud/mgmt/upgrade ~lighthouse/upgrade
if [[ $? -ne 0 ]]; then echo "Link files failed"; exit 1; fi

