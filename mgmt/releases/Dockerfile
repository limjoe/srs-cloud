FROM node:slim

COPY mgmt/releases /releases
RUN cd /releases && npm i

WORKDIR /releases
CMD ["node", "."]
