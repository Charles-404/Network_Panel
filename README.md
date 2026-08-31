# FortiGate 30E 网络监控面板

一个基于 FortiGate 30E 的实时家庭/小型企业网络监控系统，采用现代 NOC（Network Operations Center）风格的深色 Dashboard 设计。

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-18.x-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933)

## 功能特性

### 核心监控指标
- **WAN 实时流量** — 上下行速率实时展示（PPPoE WAN）
- **在线设备统计** — LAN / Wi-Fi 客户端数量
- **VPN 状态** — IPsec / SSL-VPN 隧道监控
- **活跃会话数** — 当前防火墙会话统计
- **CPU / 内存 / 温度** — FortiGate 设备健康状态
- **网络延迟** — WAN 端延迟监控

### FortiGate 30E 状态卡片
- 设备型号、序列号、固件版本
- 运行时间（Uptime）
- CPU、内存、温度、会话数等硬件指标
- 设备在线/离线状态

### 网络拓扑可视化
- 基于 React Flow 的动态网络拓扑图
- 支持节点类型：Internet、FortiGate、WAN、LAN、Switch、AP、NAS、PC、手机等
- 链路动态流量展示
- 节点状态着色（在线/离线/警告）

### 流量图表
- 实时上下行流量曲线（Recharts）
- 历史数据支持 5m / 15m / 1h / 6h / 24h / 7d / 30d 切换

### 系统健康图表
- CPU / 内存 / 会话数历史趋势图
- 温度监控

### 设备列表
- 已连接设备列表（名称、IP、类型、接口）
- 设备在线状态标识

### 实时事件日志
- 系统事件实时推送
- 事件级别分类（Info / Warning / Error / Critical）
- 时间线展示

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React 18 + TypeScript + Vite + Tailwind CSS    │
│  Recharts · React Flow · Lucide Icons           │
└──────────────────────┬──────────────────────────┘
                       │ REST API + WebSocket
┌──────────────────────▼──────────────────────────┐
│                   Backend                        │
│  Node.js + TypeScript + Fastify + WebSocket      │
│  FortiGate REST API Adapter                      │
└──────────┬───────────────────┬──────────────────┘
           │                   │
┌──────────▼──────┐  ┌────────▼─────────────────┐
│   PostgreSQL    │  │   FortiGate 30E Device    │
│   数据存储       │  │   REST API (v2)           │
└─────────────────┘  └──────────────────────────┘
```

### 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 3.x | 样式系统 |
| Recharts | 2.x | 图表组件 |
| React Flow | 11.x | 网络拓扑 |
| Lucide React | latest | 图标库 |

### 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x | 运行时 |
| TypeScript | 5.x | 类型安全 |
| Fastify | 4.x | HTTP 框架 |
| WebSocket (ws) | 8.x | 实时通信 |
| pg (PostgreSQL) | 8.x | 数据库驱动 |
| dotenv | 16.x | 环境变量 |

## 项目结构

```
Network_Panel/
├── src/
│   ├── frontend/                  # 前端源码
│   │   ├── components/
│   │   │   ├── cards/             # 卡片组件（MetricCard, FortiGateCard, StatusCard）
│   │   │   ├── charts/           # 图表组件（TrafficChart, SystemChart）
│   │   │   ├── devices/          # 设备列表（DeviceList）
│   │   │   ├── events/           # 事件日志（EventLog）
│   │   │   ├── layout/           # 布局组件（Dashboard, Header）
│   │   │   └── topology/         # 网络拓扑（NetworkTopology）
│   │   ├── hooks/                # 自定义 Hooks（useWebSocket）
│   │   ├── lib/                  # 工具函数（api, utils）
│   │   ├── styles/               # 全局样式
│   │   ├── types/                # TypeScript 类型定义
│   │   ├── App.tsx               # 应用入口
│   │   └── main.tsx              # React 渲染入口
│   ├── backend/                   # 后端源码
│   │   ├── src/
│   │   │   ├── api/              # API 路由（routes.ts）
│   │   │   ├── collectors/       # 数据采集（mockCollector, fortigateCollector）
│   │   │   ├── database/         # 数据库连接（index.ts）
│   │   │   ├── fortigate/        # FortiGate 适配器（adapter.ts）
│   │   │   ├── websocket/        # WebSocket 服务
│   │   │   └── index.ts          # 服务入口
│   │   ├── init-db.cjs           # 数据库初始化脚本
│   │   └── package.json
│   └── shared/                    # 共享代码
│       ├── constants/
│       └── types/
├── public/                        # 静态资源
├── data/                          # 数据目录
├── docker-compose.yml             # Docker 编排
├── Dockerfile.backend             # 后端镜像
├── Dockerfile.frontend            # 前端镜像
├── nginx.conf                     # Nginx 配置
├── package.json                   # 前端依赖
├── vite.config.cjs                # Vite 配置
├── tailwind.config.js             # Tailwind 配置
├── tsconfig.json                  # TypeScript 配置
└── .env                           # 环境变量（不提交 Git）
```

## 快速开始

### 环境要求

- **Node.js** >= 20.x
- **PostgreSQL** >= 14
- **FortiGate 30E** 设备（可选，支持 Mock 模式）

### 1. 克隆项目

```bash
git clone https://github.com/Charles-404/Network_Panel.git
cd Network_Panel
```

### 2. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

```env
# 服务器配置
PORT=3001
HOST=0.0.0.0

# PostgreSQL 数据库
DB_HOST=localhost
DB_PORT=5432
DB_NAME=network_panel
DB_USER=postgres
DB_PASSWORD=your_password

# FortiGate API（可选，不配置则使用 Mock 数据）
FORTIGATE_HOST=10.1.1.1
FORTIGATE_TOKEN=your_api_token
```

### 3. 初始化数据库

```bash
cd src/backend
node init-db.cjs
```

### 4. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd src/backend
npm install
```

### 5. 启动开发服务器

```bash
# 启动后端（端口 3001 + WebSocket 3002）
cd src/backend
npm run dev

# 启动前端（端口 5173）
cd ../..
npm run dev
```

访问 http://localhost:5173 查看面板。

### 快速启动（Windows）

```bash
# 一键启动前后端
./start-all.ps1
```

## Docker 部署

### 构建并启动

```bash
docker compose up -d --build
```

### 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend | 3000 | Nginx + 前端静态文件 |
| backend | 3001 | Fastify API 服务 |

### 停止服务

```bash
docker compose down
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/status` | 系统状态 + 流量 |
| GET | `/api/metrics` | Dashboard 概览指标 |
| GET | `/api/fortigate/status` | FortiGate 连接状态 |
| GET | `/api/fortigate/system` | FortiGate 系统信息 |
| GET | `/api/fortigate/interfaces` | 网络接口列表 |
| GET | `/api/fortigate/vpn` | VPN 隧道信息 |
| GET | `/api/events?limit=N` | 事件日志 |
| GET | `/api/history/:metric?limit=N` | 历史指标数据 |
| GET | `/api/devices` | 设备列表 |
| GET | `/api/topology` | 网络拓扑数据 |

### WebSocket

连接地址：`ws://<host>:3002`

推送消息类型：
- `system_status` — 系统状态更新
- `traffic_update` — 流量数据更新
- `device_update` — 设备列表更新
- `topology_update` — 拓扑数据更新
- `event` — 事件日志推送

## 数据库 Schema

| 表名 | 说明 |
|------|------|
| `devices` | 网络设备信息 |
| `traffic_stats` | 接口流量统计 |
| `system_status` | 系统状态快照（CPU/内存/温度/会话） |
| `events` | 系统事件日志 |
| `alerts` | 告警信息 |
| `history_metrics` | 历史指标数据（图表用） |
| `topology_nodes` | 拓扑节点 |
| `topology_edges` | 拓扑链路 |

## FortiGate API 集成

本系统通过 FortiGate REST API v2 采集数据：

| API Endpoint | 用途 |
|--------------|------|
| `/api/v2/monitor/system/status` | 设备状态 |
| `/api/v2/cmdb/system/global` | 全局配置 |
| `/api/v2/monitor/system/resource/usage` | CPU / 内存 / 温度 |
| `/api/v2/monitor/system/interface` | 接口流量 |
| `/api/v2/cmdb/system/interface` | 接口配置 |
| `/api/v2/monitor/firewall/policy` | 防火墙策略 |
| `/api/v2/monitor/vpn/ipsec` | IPsec VPN 隧道 |
| `/api/v2/cmdb/vpn.ipsec/phase1-interface` | VPN 配置 |
| `/api/v2/monitor/router/ipv4` | 路由表 |

> **注意**：如未配置 FortiGate API，系统将使用数据库中的 Mock 数据运行。

## UI 设计规范

- **主题**：深色 NOC / Network Operations Center
- **背景色**：`#0b0d0f`
- **卡片色**：`#151719` ~ `#1b1d20`
- **边框**：低透明度灰色 (`rgba(255,255,255,0.08)`)
- **状态色**：
  - 正常/在线：绿色
  - 流量：蓝色
  - VPN：紫色
  - 警告：黄色
  - 故障/离线：红色
  - 管理：橙色

## 安全说明

- API Token 仅存储于后端 `.env` 文件
- 前端无法访问 FortiGate Token
- `.env` 已加入 `.gitignore`
- CORS 已配置限制来源

## 开发路线

- [x] Phase 1 — 项目初始化、Dashboard UI、Dark NOC 风格、Mock Data
- [x] Phase 2 — Backend、PostgreSQL、WebSocket、数据模型
- [x] Phase 3 — FortiGate REST API Adapter、系统状态、接口、VPN
- [x] Phase 4 — SNMP、Syslog、告警系统
- [x] Phase 5 — 认证系统、Settings、生产优化

## 许可证

MIT License

## 作者

**Charles** — GitHub: [@Charles-404](https://github.com/Charles-404)
