# FortiGate 30E 家庭/小型企业网络监控面板开发提示词

你是一名资深的 **网络工程师 + 全栈开发工程师 + UI/UX 设计师**。

我需要你帮我开发一个类似现代 NOC（Network Operations Center）网络运维大屏的 **家庭/小型企业网络监控 Dashboard**。

## 一、项目目标

开发一个以 **FortiGate 30E** 为核心网络设备的实时网络监控面板。

参考我提供的截图作为整体视觉和信息架构参考，但不要机械复制截图。

截图体现的核心设计理念：

- 深色主题
- 高密度信息展示
- 卡片式 Dashboard
- 网络拓扑可视化
- 实时上下行流量
- 在线设备统计
- VPN 状态
- 网络连接状态
- CPU / 内存 / 温度 / 磁盘等设备健康状态
- Top 流量设备
- Wi-Fi 客户端
- 历史流量曲线
- 实时事件日志
- 网络链路可视化

我的实际核心设备是：

**FortiGate 30E**

因此需要将整个系统的数据模型和 API 设计围绕 FortiGate 30E 进行。

---

# 二、技术要求

请优先使用以下技术栈：

### 前端

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts 或 ECharts
- React Flow 用于网络拓扑
- Lucide Icons

要求：

- 响应式设计
- Desktop 优先
- 支持 1920×1080
- 支持 2560×1440
- 也要兼容普通笔记本屏幕
- 不使用过度圆角
- 不使用大量渐变
- 不使用花哨动画
- 整体偏专业网络运维系统风格

### 后端

优先：

- Node.js
- TypeScript
- Fastify 或 Express

数据存储：

- PostgreSQL

如果为了降低部署复杂度，也可以支持：

- SQLite

实时通信：

- WebSocket
- SSE

二选一即可，优先 WebSocket。

---

# 三、整体 UI 风格

整体采用：

**Dark NOC / Network Operations Center Dashboard**

参考以下视觉方向：

- 深黑/深灰背景
- 卡片使用稍浅的深灰
- 边框非常细
- 少量绿色、蓝色、黄色、红色作为状态色
- 数据数字突出
- 字体清晰
- 信息密度高
- 不要做成普通 SaaS 后台
- 不要使用传统 Admin Dashboard 风格
- 不要大量留白
- 要有类似网络运营中心监控大屏的感觉

背景：

`#0b0d0f` 左右的深色。

卡片：

`#151719` ～ `#1b1d20`

边框：

低透明度灰色。

状态颜色建议：

- 正常：绿色
- 网络流量：蓝色
- VPN：紫色
- 警告：黄色
- 故障：红色
- 管理/控制流量：橙色

---

# 四、页面总体布局

Dashboard 从上到下分为多个区域。

## 第一行：核心网络指标

顶部放置 6～8 个核心指标卡片。

例如：

### WAN 下行

显示：

`1.45 Gbps`

下面：

`PPPoE · WAN`

同时显示较小的：

`↓ 当前速度`

---

### WAN 上行

例如：

`106 Mbps`

显示：

`↑ 当前速度`

---

### 在线设备

例如：

`27`

下面：

`LAN / Wi-Fi Clients`

---

### VPN

例如：

`3 / 3`

显示：

`IPsec / SSL-VPN`

---

### 活跃连接

例如：

`1,284`

显示：

`Sessions`

---

### CPU

例如：

`18%`

---

### 内存

例如：

`42%`

---

### WAN 延迟

例如：

`12 ms`

---

# 五、FortiGate 核心状态

增加一个非常重要的：

## FortiGate 30E 状态卡片

显示：

```text
FortiGate 30E
Online

Firmware
v7.x.x

Uptime
23d 14h

CPU
18%

Memory
42%

Temperature
47°C

Sessions
1,284
```

如果 FortiGate API 可以提供更多硬件状态，则显示：

- CPU
- Memory
- Session Count
- Session Rate
- Packet Rate
- WAN RX
- WAN TX
- Interface Errors
- Interface Drops
- Uptime
- Firmware Version
- HA 状态（如果存在）

---

# 六、核心网络拓扑

页面中间放一个大型：

## Network Topology

使用 React Flow 或类似技术实现。

拓扑结构类似：

```text
                    Internet
                       │
                       │
                 ┌─────▼─────┐
                 │ FortiGate │
                 │    30E    │
                 └─────┬─────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
        LAN          Wi-Fi        VPN
          │            │            │
      ┌───▼───┐    ┌───▼───┐    Clients
      │ Switch │    │ AP     │
      └───┬───┘    └───┬───┘
          │            │
       Devices       Devices
```

但是不要固定写死。

要求：

**拓扑必须从后端数据动态生成。**

节点包括：

- Internet
- FortiGate 30E
- WAN
- LAN
- VLAN
- Switch
- AP
- NAS
- Server
- PC
- Mac
- iPhone
- Android
- IoT
- VPN Client

---

# 七、网络拓扑动态流量

拓扑链路需要显示实时流量。

例如：

```text
Internet
   │
   │ 1.45 Gbps
   ▼
FortiGate
   │
   │ 901 Mbps
   ▼
Core Switch
```

链路可以根据流量大小改变：

- 线宽
- 动画速度
- 节点颜色

例如：

低流量：

细线

中流量：

普通线

高流量：

粗线 + 流动动画

---

# 八、WAN 监控

重点监控 FortiGate WAN 接口。

显示：

- WAN IP
- WAN Gateway
- WAN RX
- WAN TX
- Link Speed
- Packet Loss
- Latency
- Jitter
- Interface Errors
- Interface Drops

如果 WAN 是 PPPoE：

显示：

```text
WAN
PPPoE
Connected

Public IP
xxx.xxx.xxx.xxx

RX
1.45 Gbps

TX
106 Mbps

Latency
12 ms

Packet Loss
0%
```

---

# 九、接口监控

建立：

## Interfaces

展示 FortiGate 30E 所有接口：

```text
wan
lan
internal
dmz
port1
port2
...
```

每个接口显示：

- Status
- IP
- RX
- TX
- RX packets
- TX packets
- Errors
- Drops
- Speed

状态：

🟢 Up

🔴 Down

🟡 Warning

---

# 十、实时流量图

Dashboard 中放置：

## WAN Traffic

使用面积图或者折线图。

至少显示：

- Download
- Upload

时间范围：

- 5 min
- 15 min
- 1 hour
- 6 hours
- 24 hours

例如：

```text
WAN Traffic

1.5 Gbps ┤       ╭──╮
         │    ╭──╯  ╰╮
1.0 Gbps ┤╭───╯       ╰──╮
         ││
500 Mbps ┤╯
         └──────────────────
          12  13  14  15  16
```

---

# 十一、设备流量排行

创建：

## Top Devices

显示当前流量最大的设备。

例如：

```text
Device             IP             RX        TX

MacBook Pro        10.0.0.88     320 Mbps  45 Mbps
NAS                10.0.0.20     175 Mbps  12 Mbps
iPhone             10.0.0.15      43 Mbps   8 Mbps
Ubuntu Server      10.0.0.89      24 Mbps   6 Mbps
Apple TV           10.0.0.66      15 Mbps   3 Mbps
```

支持：

- 按 RX 排序
- 按 TX 排序
- 按总流量排序
- 搜索设备
- 查看设备详情

---

# 十二、客户端列表

建立：

## Clients

显示所有通过 FortiGate 网络连接的客户端。

字段：

- Hostname
- IP
- MAC
- Interface
- VLAN
- Device Type
- RX
- TX
- Session
- Last Seen
- Status

例如：

```text
MacBook Pro
10.0.0.88
MAC xx:xx:xx:xx:xx:xx
LAN
Online
RX 320 Mbps
TX 45 Mbps
```

---

# 十三、VPN 监控

FortiGate VPN 是重点。

支持：

## IPsec VPN

显示：

- Tunnel Name
- Status
- Remote Gateway
- Local Network
- Remote Network
- RX
- TX
- Uptime

例如：

```text
Site-to-Site VPN

Office-A
🟢 Connected
10.10.0.0/24
RX 25 Mbps
TX 8 Mbps
```

---

## SSL-VPN / Remote Access

如果 FortiGate 当前版本/API支持：

显示：

- 在线用户
- 用户名
- IP
- 登录时间
- RX
- TX
- Session

---

# 十四、防火墙状态

增加：

## Firewall Statistics

显示：

- Sessions
- New Sessions/sec
- Allowed Sessions
- Blocked Sessions
- Threats
- IPS Events
- Antivirus Events
- Web Filter Events
- DNS Filter Events

使用数字卡片 + 小型趋势图。

---

# 十五、实时事件

右侧设计：

## Real-time Events

实时滚动事件。

例如：

```text
12:47:20  🟢 WAN interface up
12:47:18  🟣 IPsec VPN connected
12:47:15  🔵 New device detected
12:47:09  🟡 High CPU usage
12:47:02  🔴 Firewall blocked traffic
12:46:58  🟢 DHCP lease assigned
```

事件类型：

- Interface Up
- Interface Down
- VPN Connected
- VPN Disconnected
- New Client
- Client Offline
- DHCP
- Firewall Block
- IPS Alert
- High CPU
- High Memory
- High Temperature
- WAN Down
- WAN Recovery

---

# 十六、设备健康监控

创建：

## System Health

至少显示：

### CPU

```text
CPU
18%

██████░░░░
```

### Memory

```text
Memory
42%

████████░░
```

### Temperature

```text
Temperature
47°C

██████░░░░
```

如果 API 能提供硬盘、风扇等信息，也加入。

注意：

**不要假设 FortiGate 30E 一定拥有所有硬件传感器。**

如果 API 无法获得某个指标：

显示：

`N/A`

而不是伪造数据。

---

# 十七、告警系统

建立：

## Alerts

支持：

### WAN

- WAN Down
- WAN Packet Loss
- WAN Latency High
- WAN Interface Errors

### System

- CPU > 80%
- Memory > 80%
- Temperature > threshold

### VPN

- VPN Down
- VPN Reconnect
- VPN High Latency

### Security

- IPS Alert
- Antivirus Alert
- Firewall Block Spike

告警等级：

```text
INFO
WARNING
CRITICAL
```

---

# 十八、历史数据

必须设计时间序列数据模型。

保存：

- WAN RX
- WAN TX
- Interface RX/TX
- CPU
- Memory
- Sessions
- VPN Traffic
- Client Traffic

时间：

```text
1 minute
5 minutes
1 hour
1 day
7 days
30 days
```

Dashboard 可以查询历史数据。

---

# 十九、FortiGate 数据获取架构

这是整个项目最重要的部分。

不要把 FortiGate API Token 直接暴露给浏览器。

正确架构：

```text
Browser
   │
   │ HTTPS / WebSocket
   ▼
Dashboard Backend
   │
   ├── FortiGate REST API
   │
   ├── SNMP
   │
   ├── Syslog
   │
   └── ICMP
          │
          ▼
     FortiGate 30E
```

后端负责：

- 获取 FortiGate 数据
- 缓存数据
- 清洗数据
- 保存历史数据
- 推送 WebSocket
- 处理告警

---

# 二十、FortiGate API

优先使用：

**FortiGate REST API**

设计一个独立的数据访问层：

```text
FortiGateClient
```

例如：

```typescript
getSystemStatus()
getInterfaces()
getInterfaceStats()
getFirewallSessions()
getVpnStatus()
getIpsecTunnels()
getSslVpnUsers()
getDhcpLeases()
getFirewallPolicies()
getSystemResources()
```

具体 API Endpoint：

**不要凭空假设。**

开发过程中必须根据实际 FortiOS 版本确认 API。

支持配置：

```env
FORTIGATE_HOST=
FORTIGATE_API_TOKEN=
FORTIGATE_VERIFY_SSL=false
FORTIGATE_VDOM=root
```

不要把 token 写死在代码中。

---

# 二十一、SNMP

对于 FortiGate REST API 无法方便获取的数据，可以设计 SNMP Collector。

支持：

- SNMPv2c
- SNMPv3

配置：

```env
SNMP_HOST=
SNMP_PORT=161
SNMP_VERSION=2c
SNMP_COMMUNITY=
```

SNMP 数据用于：

- Interface traffic
- Interface errors
- Interface status
- CPU
- Memory
- Uptime

如果 FortiGate MIB 可以使用，则优先使用 Fortinet 官方 MIB。

---

# 二十二、Syslog

设计可选 Syslog Server。

FortiGate：

```text
FortiGate
    │
    │ Syslog UDP/TCP
    ▼
Monitoring Backend
```

解析：

- Traffic logs
- Event logs
- VPN logs
- Firewall logs
- IPS logs
- System logs

然后转换成统一 Event：

```typescript
interface NetworkEvent {
  timestamp: string;
  severity: "info" | "warning" | "critical";
  type: string;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}
```

---

# 二十三、数据模型

至少建立以下表：

```text
devices
interfaces
clients
traffic_samples
vpn_tunnels
vpn_sessions
firewall_events
system_metrics
alerts
network_events
```

例如：

```text
traffic_samples

id
device_id
interface_id
timestamp
rx_bps
tx_bps
rx_packets
tx_packets
rx_errors
tx_errors
```

---

# 二十四、实时数据刷新

Dashboard 不要全部依赖浏览器轮询。

推荐：

```text
FortiGate
   ↓
Collector
   ↓
Database
   ↓
WebSocket
   ↓
Dashboard
```

实时数据：

1～5 秒更新一次。

历史数据：

30～60 秒采集一次即可。

根据数据类型合理控制 API 请求频率。

避免高频请求导致 FortiGate 30E 本身负载增加。

---

# 二十五、Dashboard 页面结构

首页建议：

```text
┌─────────────────────────────────────────────────────────────┐
│ FortiGate Network Monitor       Online ●      20:18:32     │
├────────┬────────┬────────┬────────┬────────┬───────────────┤
│ WAN RX │ WAN TX │ Clients│ VPN    │Session │ CPU / Memory  │
├────────┴────────┴────────┴────────┴────────┴───────────────┤
│                                                             │
│                  NETWORK TOPOLOGY                           │
│                                                             │
│ Internet → FortiGate → LAN → Switch → Clients              │
│                 ↓                                           │
│                VPN                                           │
│                                                             │
├─────────────────────────────────┬───────────────────────────┤
│ WAN TRAFFIC                     │ REAL-TIME EVENTS          │
│                                 │                           │
│  Graph                          │ 12:47 WAN connected       │
│                                 │ 12:46 VPN connected       │
├─────────────────────────────────┼───────────────────────────┤
│ TOP CLIENTS                     │ VPN STATUS                │
│                                 │                           │
├─────────────────────────────────┼───────────────────────────┤
│ INTERFACES                      │ SYSTEM HEALTH             │
│                                 │                           │
├─────────────────────────────────┴───────────────────────────┤
│ 24H NETWORK TRAFFIC                                          │
└─────────────────────────────────────────────────────────────┘
```

---

# 二十六、设备详情页

点击 FortiGate 节点进入：

```text
/FortiGate
```

显示：

- System Overview
- Interfaces
- Routing
- Sessions
- Firewall
- VPN
- DHCP
- Clients
- System Health
- Logs
- Alerts

---

# 二十七、客户端详情页

点击某个设备：

```text
/clients/:id
```

显示：

```text
MacBook Pro

IP
10.0.0.88

MAC
XX:XX:XX:XX:XX:XX

Interface
lan

First Seen
...

Last Seen
...

Current RX
320 Mbps

Current TX
45 Mbps

24H Traffic
...

Sessions
...

Traffic History
[Graph]
```

---

# 二十八、拓扑页面

单独提供：

```text
/topology
```

实现：

- Zoom
- Pan
- 自动布局
- 节点拖动
- 节点搜索
- 流量动画
- 在线/离线状态
- VLAN 分组
- VPN 链路
- WAN 链路

---

# 二十九、设置页面

提供：

```text
/settings
```

包括：

### FortiGate

```text
Host
API Token
VDOM
Verify SSL
```

### SNMP

```text
Enable
Version
Community
Port
```

### Syslog

```text
Enable
Listen IP
Port
Protocol
```

### Monitoring

```text
Poll Interval
History Retention
Alert Thresholds
```

---

# 三十、模拟数据模式

非常重要：

在没有连接真实 FortiGate 时，也必须可以运行。

增加：

```env
DEMO_MODE=true
```

Demo 模式下生成真实感较强的模拟：

- WAN traffic
- CPU
- Memory
- Sessions
- Clients
- VPN
- Events
- Interface statistics

这样前端开发阶段不需要连接真实设备。

但是：

**必须明确标记 DEMO MODE。**

不能让用户误认为是真实 FortiGate 数据。

---

# 三十一、异常处理

如果 FortiGate 无法连接：

顶部显示：

```text
FortiGate
● Offline

Last Update
2m 31s ago
```

不要让 Dashboard 崩溃。

API timeout：

显示：

```text
Data unavailable
```

而不是：

```text
0
```

---

# 三十二、安全要求

这是网络监控系统。

必须遵守：

- API Token 只能存在后端
- `.env` 不提交 Git
- 前端不能看到 FortiGate Token
- 所有管理 API 需要认证
- WebSocket 需要认证
- 输入参数必须验证
- 防止 SSRF
- 防止任意 URL 请求
- 日志不能输出 API Token
- 不要默认允许公网访问后台

---

# 三十三、UI 细节

需要加入：

### 状态 Badge

```text
● ONLINE
● OFFLINE
● WARNING
```

### 数字动画

核心数字变化可以有轻微 transition。

不要做夸张的数字滚动动画。

### 网络流量

流量变化使用平滑动画。

### 图表

默认展示最近 30～60 分钟。

支持切换：

```text
5m
15m
1h
6h
24h
7d
30d
```

---

# 三十四、响应式布局

桌面：

```text
12-column grid
```

1920×1080：

优先完整展示。

1440×900：

允许部分区域缩小。

1366×768：

确保核心数据仍然可用。

手机：

Dashboard 自动改为单列。

---

# 三十五、代码质量要求

代码必须：

- TypeScript strict
- 模块化
- 组件化
- 不写超大组件
- API 层独立
- 数据采集层独立
- WebSocket 独立
- 数据库层独立
- FortiGate Adapter 独立

推荐目录：

```text
src/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── charts/
│   ├── topology/
│   └── hooks/
│
├── backend/
│   ├── api/
│   ├── websocket/
│   ├── collectors/
│   ├── fortigate/
│   ├── snmp/
│   ├── syslog/
│   ├── database/
│   └── alerts/
│
├── shared/
│   ├── types/
│   └── constants/
│
└── config/
```

---

# 三十六、开发流程

不要一次生成大量不可运行代码。

按照以下顺序开发：

## Phase 1

先完成：

- 项目初始化
- Dashboard UI
- Dark NOC 风格
- Mock Data
- Top Cards
- Network Topology
- WAN Traffic
- Events
- Clients
- System Health

确保页面可以直接运行。

---

## Phase 2

实现：

- Backend
- PostgreSQL
- WebSocket
- 数据模型
- Mock Collector

---

## Phase 3

实现：

- FortiGate REST API Adapter
- FortiGate System Status
- Interfaces
- Interface Traffic
- Sessions
- VPN
- DHCP
- Firewall Events

---

## Phase 4

实现：

- SNMP
- Syslog
- 历史数据
- 告警

---

## Phase 5

实现：

- Authentication
- Settings
- Docker
- Production Build
- Health Check
- Logging
- Backup

---

# 三十七、Docker 部署

最终提供：

```text
docker-compose.yml
```

至少包含：

```text
dashboard
backend
postgres
```

如果 Syslog Collector 独立，则：

```text
syslog
```

也可以集成到 backend。

最终目标：

```bash
docker compose up -d
```

即可启动。

---

# 三十八、最终要求

我希望最终得到的不是一个简单 Demo，而是一个可以长期运行的：

**FortiGate 30E Network Monitoring System**

整体视觉需要接近：

**现代 NOC / Grafana / 网络运营中心大屏**

而不是普通后台管理系统。

重点突出：

1. FortiGate 30E 状态
2. WAN 实时上下行
3. 网络拓扑
4. 在线客户端
5. Top Traffic
6. VPN
7. Firewall
8. 实时事件
9. CPU / Memory / Temperature
10. 历史流量
11. 告警
12. 接口状态

---

# 三十九、非常重要的开发规则

在开始编写代码之前：

1. 先分析整个需求
2. 给出项目架构
3. 给出数据流架构
4. 给出数据库 Schema
5. 给出 FortiGate 数据采集方案
6. 给出前端页面结构
7. 给出 API 设计
8. 给出目录结构

然后开始编码。

**不要为了让 Demo 看起来有数据而伪造真实 FortiGate API 的返回结构。**

如果某个 FortiOS API 不确定：

- 查阅对应版本的 FortiGate REST API 文档
- 或把该接口封装成 Adapter
- 在代码中明确标记 TODO
- 不要凭空编造 Endpoint

---

# 四十、参考图片

我上传了一张网络监控 Dashboard 截图。

请将它作为：

**视觉风格、布局密度、信息层级和 Dashboard 信息架构参考。**

重点参考：

- 深色背景
- 顶部指标卡
- 中央网络拓扑
- 右侧实时事件
- 中间客户端/流量排行
- 设备健康状态
- 底部历史流量
- 高信息密度
- 网络链路动画
- 专业 NOC 风格

但是：

**不要直接复制截图中的品牌、文字、数据和具体布局。**

根据 FortiGate 30E 的实际能力重新设计。

最终让页面看起来像：

> 「这是一个专业的 FortiGate 家庭/小型企业网络运营中心。」

而不是：

> 「这是一个普通的网页 Dashboard。」

现在开始。

第一步先输出完整的技术架构、数据库 Schema、API 设计和项目目录，然后开始实现 Phase 1。