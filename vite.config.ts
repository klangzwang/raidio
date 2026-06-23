import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: 'src',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'img/*', dest: './' },
        { src: 'img/icons/*', dest: './' },
        { src: 'img/thumbs/*', dest: './' },
        { src: 'snd/*', dest: './' },
        { src: 'snd/airplane/*', dest: './' },
        { src: 'snd/ping/*', dest: './' },
        { src: 'snd/pop/*', dest: './' },
        { src: 'snd/ui/*', dest: './' }
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@css": path.resolve(__dirname, "./src/css"),
      "lib": path.resolve(__dirname, "./src/lib"),
      "components": path.resolve(__dirname, "./src/components")
    },
  },
  base: './',
  build: {
    minify: false,
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        raidio: resolve(__dirname, 'src/raidio.html'),
        radial: resolve(__dirname, 'src/radial.html'),
        panel: resolve(__dirname, 'src/panel.html')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'js/[name][extname]',
      }
    }
  }
});
