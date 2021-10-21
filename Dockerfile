FROM node:12-slim
LABEL maintainer="s.misawa@april-knights.com"

ENV PORT 8080
ENV HOST 0.0.0.0

# Install app dependencies.
WORKDIR /src
COPY package.json /src/package.json
COPY index.js /src/index.js
RUN npm install

# Bundle app source.
COPY data /src

CMD ["node", "index.js"]
