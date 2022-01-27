FROM node:slim

COPY hooks /hooks
RUN cd /hooks && npm i

WORKDIR /hooks
CMD ["node", "."]
