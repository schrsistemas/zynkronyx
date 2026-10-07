import Document, { Html, Head, Main, NextScript } from "next/document";

export default class ZynkronyxDocument extends Document {
  render() {
    return (
      <Html lang="pt-BR">
        <Head>
          <title>Zynkronyx Control Center</title>
          <meta name="description" content="Zynkronyx Control Center operacional" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
