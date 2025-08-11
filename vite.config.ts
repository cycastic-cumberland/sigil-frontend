import path from "path"
import tailwindcss from "@tailwindcss/vite"
import {defineConfig, loadEnv, type ServerOptions} from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from "node:fs";

type LocalServerConfiguration = {
  allowedHosts: string[],
  port: number | undefined
  https: {
    key: string,
    cert: string
  } | undefined
}

const getLocalServerConfig = (): ServerOptions | undefined => {
  const cfg = path.resolve(__dirname, 'local-server.json')
  if (!fs.existsSync(cfg)){
    return undefined
  }

  const content: LocalServerConfiguration = JSON.parse(fs.readFileSync(cfg, 'utf-8'))
  return {
    allowedHosts: content.allowedHosts,
    port: content.port,
    https: !content.https ? undefined : {
      key: fs.readFileSync(content.https.key),
      cert: fs.readFileSync(content.https.cert)
    }
  }
}

// https://vite.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = {...process.env, ...loadEnv(mode, process.cwd())};
  return defineConfig({
    plugins: [react(), tailwindcss()],
    server: getLocalServerConfig(),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  })
}
