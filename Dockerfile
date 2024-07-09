FROM node:18
LABEL maintainer="s.misawa@april-knights.com"

ENV PORT 8080
ENV HOST 0.0.0.0

# 作業ディレクトリを作成
WORKDIR /src

# 依存関係をインストール
COPY package.json package-lock.json /src/
RUN npm install

# アプリケーションのソースコードをコピー
COPY . /src

# アプリケーションを起動
CMD ["node", "index.js"]