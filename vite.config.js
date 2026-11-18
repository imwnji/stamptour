import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// npm run build            → 일반 배포용 (Vercel / GitHub Pages)
// npm run build:artifact   → 폰트까지 한 덩어리로 묶은 미리보기용 빌드
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    assetsInlineLimit: mode === 'artifact' ? 1024 * 1024 : 4096,
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
  },
}))
