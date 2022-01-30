FROM node:slim

COPY hooks /srs-terraform/hooks
COPY js-core /srs-terraform/js-core
RUN cd /srs-terraform/hooks && npm i

WORKDIR /srs-terraform/hooks
CMD ["node", "."]
