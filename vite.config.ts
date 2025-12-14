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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('elkjs')){
              return 'elkjs'
            }
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            if (id.includes('@tiptap')){
              return 'tiptap'
            }
            if (id.includes('reactflow') || id.includes('@xyflow')){
              return 'reactflow'
            }
            if (id.includes('lucide')){
              return 'lucide'
            }
            if (id.includes('argon2-browser')){
              return 'argon2-browser'
            }
            if (id.includes('react-dom')){
              return 'react-dom'
            }
            if (id.includes('crypto-js')){
              return 'crypto-js'
            }
            if (id.includes('tanstack')){
              return 'tanstack'
            }
            if (id.includes('src/components/ui')){
              return 'shadcn'
            }
            if (
                id.includes('react-router-dom') ||
                id.includes('@remix-run') ||
                id.includes('react-router')
            ) {
              return 'react-router';
            }

            return undefined
          }
        }
      }
    }
  })
}
