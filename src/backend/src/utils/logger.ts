/**
 * 统一日志系统
 * 基于 pino 实现，支持多级别日志、文件轮转和请求日志
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const LOG_DIR = process.env.LOG_DIR || './logs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 日志级别配置
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// 生产环境日志目标配置
function getLogTargets(): pino.TransportTargetOptions[] {
  const targets: pino.TransportTargetOptions[] = [
    // 控制台输出（始终启用）
    {
      target: process.env.NODE_ENV === 'production' ? 'pino/file' : 'pino-pretty',
      level: LOG_LEVEL,
      options: process.env.NODE_ENV === 'production'
        ? { destination: 1 } // stdout
        : {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
    },
  ];

  // 生产环境添加文件日志
  if (process.env.NODE_ENV === 'production') {
    // 普通日志文件
    targets.push({
      target: 'pino-roll',
      level: LOG_LEVEL,
      options: {
        file: path.join(LOG_DIR, 'app.log'),
        frequency: 'daily',
        size: '50m',
        mkdir: true,
        limit: {
          count: 30, // 保留 30 天
        },
      },
    });

    // 错误日志单独输出
    targets.push({
      target: 'pino-roll',
      level: 'error',
      options: {
        file: path.join(LOG_DIR, 'error.log'),
        frequency: 'daily',
        size: '50m',
        mkdir: true,
        limit: {
          count: 90, // 错误日志保留 90 天
        },
      },
    });
  }

  return targets;
}

// 创建 logger 实例
const logger = pino({
  level: LOG_LEVEL,
  transport: {
    targets: getLogTargets(),
  },
  // 基础字段
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'network-panel',
    service: 'fortigate-backend',
  },
  // 序列化器
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // 时间戳格式
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// 创建子 logger 工厂
export function createChildLogger(module: string): pino.Logger {
  return logger.child({ module });
}

// 导出默认 logger
export default logger;

// 导出常用的子 logger
export const dbLogger = createChildLogger('database');
export const apiLogger = createChildLogger('api');
export const wsLogger = createChildLogger('websocket');
export const collectorLogger = createChildLogger('collector');
export const syslogLogger = createChildLogger('syslog');
export const alertLogger = createChildLogger('alerts');
