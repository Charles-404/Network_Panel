const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/frontend'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3002',
        ws: true,
      },
    },
  },

  // 构建优化配置
  build: {
    // 输出目录
    outDir: 'dist/frontend',

    // 生产环境启用源码映射（可选，便于调试）
    sourcemap: process.env.NODE_ENV !== 'production',

    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除 console.log（生产环境）
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production'
          ? ['console.log', 'console.debug', 'console.trace']
          : [],
      },
      format: {
        // 移除注释
        comments: false,
      },
    },

    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分割 chunks
        manualChunks: {
          // React 核心
          'vendor-react': ['react', 'react-dom'],
          // 图表库
          'vendor-charts': ['recharts'],
          // 流程图库
          'vendor-flow': ['reactflow', '@reactflow/core'],
          // UI 工具
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        // chunk 文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // 资源优化
    assetsInlineLimit: 4096, // 4KB 以下的资源内联为 base64
    cssCodeSplit: true, // CSS 代码分割
    cssMinify: true, // CSS 压缩

    // 构建目标
    target: 'es2020',

    // chunk 大小警告阈值
    chunkSizeWarningLimit: 500, // 500KB
  },

  // CSS 配置
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {},
  },

  // 依赖优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'reactflow',
      'recharts',
      'lucide-react',
    ],
    exclude: [],
  },

  // 环境变量前缀
  envPrefix: 'VITE_',
});
