# Design: AEM 实例状态检测改进

## 概述

本设计文档描述了改进 AEM 实例状态检测功能的技术方案，采用**混合检测策略**提供快速、可靠、无需认证的实例状态监控。

## 架构设计

### 检测层级架构

```
┌─────────────────────────────────────────────────────────┐
│                    状态检测请求                           │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 1: TCP 端口检测 (< 500ms)                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ TcpStream::connect_timeout(host:port, 500ms)   │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                              │
│                    端口开放?                             │
│                    /      \                             │
│                  是        否                            │
│                  │          └──────► 返回 STOPPED        │
└──────────────────┼──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 2: 进程检测 (< 100ms)                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │ lsof -ti :<port> → 获取 PID                     │    │
│  │ ps -p <pid> -o comm= → 检查是否为 java          │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                              │
│                    是 Java 进程?                         │
│                    /      \                             │
│                  是        否                            │
│                  │          └──────► 返回 PORT_CONFLICT  │
└──────────────────┼──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Layer 3: HTTP 检测 (可选, < 3s)                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ GET /libs/granite/core/content/login.html      │    │
│  └───────────────────────┬─────────────────────────┘    │
│                          │                              │
│                    HTTP 响应成功?                        │
│                    /      \                             │
│                  是        否                            │
│                  │          │                           │
│                  ▼          ▼                           │
│            返回 RUNNING  返回 STARTING                   │
└─────────────────────────────────────────────────────────┘
```

### 状态机

```
          ┌──────────────────────────────────────┐
          │                                      │
          ▼                                      │
    ┌──────────┐    端口开放     ┌──────────┐   │
    │ STOPPED  │ ─────────────► │ STARTING │   │
    └──────────┘                └────┬─────┘   │
          ▲                          │         │
          │                    HTTP响应成功     │
          │                          ▼         │
          │                    ┌──────────┐    │
          │                    │ RUNNING  │    │
          │                    └────┬─────┘    │
          │                         │          │
          └─────────────────────────┘          │
                   端口关闭                     │
                                               │
    ┌───────────────┐                          │
    │ PORT_CONFLICT │ ◄────────────────────────┘
    └───────────────┘   端口被非Java进程占用
```

## 数据结构

### Rust 后端

```rust
/// 实例状态检测结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceStatusResult {
    /// 实例 ID
    pub instance_id: String,
    
    /// 检测到的状态
    pub status: AemInstanceStatus,
    
    /// 检测时间戳
    pub checked_at: String,
    
    /// 检测耗时（毫秒）
    pub duration_ms: u64,
    
    /// 占用端口的进程 ID（如果有）
    pub process_id: Option<u32>,
    
    /// 占用端口的进程名称（如果非 Java）
    pub process_name: Option<String>,
    
    /// 错误信息（如果检测失败）
    pub error: Option<String>,
}

/// 扩展的实例状态枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AemInstanceStatus {
    /// 实例完全就绪，HTTP 响应正常
    Running,
    
    /// 端口已开放，但 HTTP 无响应（AEM 启动中）
    Starting,
    
    /// 端口未开放
    Stopped,
    
    /// 端口被其他进程占用（非 Java）
    PortConflict,
    
    /// 进程存在但 HTTP 响应异常
    Error,
    
    /// 无法确定状态
    Unknown,
}
```

### TypeScript 前端

```typescript
export interface InstanceStatusResult {
  instance_id: string;
  status: AemInstanceStatus;
  checked_at: string;
  duration_ms: number;
  process_id?: number;
  process_name?: string;
  error?: string;
}

export type AemInstanceStatus = 
  | 'running'
  | 'starting'
  | 'stopped'
  | 'port_conflict'
  | 'error'
  | 'unknown';
```

## API 设计

### Tauri Commands

```rust
/// 检测单个实例状态
#[command]
pub async fn detect_instance_status(id: String) -> Result<InstanceStatusResult, String> {
    // 实现三层检测逻辑
}

/// 批量检测所有实例状态
#[command]
pub async fn detect_all_instances_status() -> Result<Vec<InstanceStatusResult>, String> {
    // 并行检测所有实例
    // 使用 futures::future::join_all
}

/// 检查端口是否开放（底层工具函数）
pub fn check_port_open(host: &str, port: u16, timeout_ms: u64) -> bool {
    use std::net::TcpStream;
    use std::time::Duration;
    
    let addr = format!("{}:{}", host, port);
    TcpStream::connect_timeout(
        &addr.parse().unwrap(),
        Duration::from_millis(timeout_ms)
    ).is_ok()
}

/// 获取端口占用进程信息
pub fn get_port_process_info(port: u16) -> Option<(u32, String)> {
    // 返回 (pid, process_name)
}
```

### 前端 API

```typescript
// src/api/instance.ts

/**
 * 检测单个实例状态
 */
export async function detectInstanceStatus(id: string): Promise<InstanceStatusResult> {
  return invoke<InstanceStatusResult>('detect_instance_status', { id });
}

/**
 * 批量检测所有实例状态
 */
export async function detectAllInstancesStatus(): Promise<InstanceStatusResult[]> {
  return invoke<InstanceStatusResult[]>('detect_all_instances_status');
}
```

## 平台特定实现

### macOS

```rust
impl PlatformOps for MacOSPlatform {
    fn check_port_open(&self, host: &str, port: u16, timeout_ms: u64) -> bool {
        use std::net::TcpStream;
        let addr = format!("{}:{}", host, port);
        TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_millis(timeout_ms)
        ).is_ok()
    }
    
    fn get_port_process_info(&self, port: u16) -> Option<(u32, String)> {
        // 使用 lsof 获取 PID
        let pid_output = Command::new("lsof")
            .args(["-ti", &format!(":{}", port)])
            .output()
            .ok()?;
        
        let pid: u32 = String::from_utf8_lossy(&pid_output.stdout)
            .trim()
            .parse()
            .ok()?;
        
        // 使用 ps 获取进程名称
        let name_output = Command::new("ps")
            .args(["-p", &pid.to_string(), "-o", "comm="])
            .output()
            .ok()?;
        
        let name = String::from_utf8_lossy(&name_output.stdout)
            .trim()
            .to_string();
        
        Some((pid, name))
    }
}
```

### Windows

```rust
impl PlatformOps for WindowsPlatform {
    fn check_port_open(&self, host: &str, port: u16, timeout_ms: u64) -> bool {
        // 与 macOS 相同，TcpStream 是跨平台的
    }
    
    fn get_port_process_info(&self, port: u16) -> Option<(u32, String)> {
        // 使用 netstat 获取 PID
        let output = Command::new("netstat")
            .args(["-ano"])
            .output()
            .ok()?;
        
        // 解析 netstat 输出找到端口对应的 PID
        // 然后使用 tasklist /FI "PID eq <pid>" 获取进程名称
    }
}
```

## 性能考量

### 检测超时配置

| 层级 | 默认超时 | 说明 |
|------|----------|------|
| TCP 检测 | 500ms | 快速判断端口状态 |
| 进程检测 | 100ms | 系统命令执行 |
| HTTP 检测 | 3000ms | AEM 响应可能较慢 |

### 批量检测优化

- 使用 `tokio::spawn` 并行检测多个实例
- 限制并发数量（建议最多 10 个）
- 提供进度回调

### 自动刷新策略

- 默认间隔：30 秒
- 最小间隔：15 秒
- 用户可配置或完全关闭
- 页面不可见时暂停检测

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络超时 | 返回 `Unknown` 状态，记录错误信息 |
| 系统命令失败 | 回退到 TCP 检测结果 |
| 实例 ID 不存在 | 返回错误 |

## 向后兼容

- 保留原有 `check_instance_health` 命令（标记为 deprecated）
- 新命令 `detect_instance_status` 可逐步替换
- 前端同时支持两种检测方式，根据配置选择
