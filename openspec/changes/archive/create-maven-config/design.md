# Design: 创建新 Maven 配置功能

## 架构决策

### 1. 配置目录命名规范

采用 `.m2.<name>` 格式而非子目录方式：

**选择**：`~/.m2.project-a/`

**原因**：
- 与现有的 Maven 扫描逻辑 (`scan_maven_settings`) 兼容，该逻辑会搜索包含 `.m2.` 的文件名
- 避免与标准 `~/.m2/` 目录产生层级混淆
- 便于用户在文件系统中识别不同的 Maven 配置

**目录结构**：
```
~/.m2.project-a/
├── settings.xml       # Maven 配置文件
└── repository/        # 本地仓库目录
```

### 2. settings.xml 模板设计

生成的 `settings.xml` 包含：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                              https://maven.apache.org/xsd/settings-1.0.0.xsd">
  
  <!-- 本地仓库路径 - 自动配置为此配置专用目录 -->
  <localRepository>/Users/username/.m2.project-a/repository</localRepository>
  
  <!-- 
    以下是常用配置示例，请根据需要取消注释并修改：
    
    <mirrors>
      <mirror>
        <id>nexus</id>
        <mirrorOf>*</mirrorOf>
        <url>https://your-nexus-server/repository/maven-public/</url>
      </mirror>
    </mirrors>
    
    <servers>
      <server>
        <id>nexus</id>
        <username>your-username</username>
        <password>your-password</password>
      </server>
    </servers>
    
    <profiles>
      <profile>
        <id>default</id>
        <repositories>
          <repository>
            <id>central</id>
            <url>https://repo.maven.apache.org/maven2</url>
          </repository>
        </repositories>
      </profile>
    </profiles>
  -->
  
</settings>
```

### 3. 配置名称验证规则

| 规则 | 描述 | 正则表达式 |
|------|------|-----------|
| 允许字符 | 小写字母、数字、中划线 | `^[a-z0-9-]+$` |
| 长度限制 | 1-50 字符 | - |
| 首字符 | 必须是字母 | `^[a-z]` |
| 保留名称 | 不允许 `repository`、`settings` | - |

### 4. 文件打开实现

**macOS**：
```rust
Command::new("open")
    .arg(&settings_path)
    .spawn()
```

**Windows**：
```rust
// 使用 cmd /C start "" "path" 可以在默认关联程序中打开文件
Command::new("cmd")
    .args(["/C", "start", "", &settings_path])
    .spawn()
```



### 5. 配置同步策略 (Data Consistency)

为确保 IDE 引用的配置文件 `~/.m2.<name>/settings.xml` 与应用内生效的配置 `maven-configs/<name>.xml` 保持一致，实施以下同步策略：

1.  **Source of Truth**: 应用内的 `maven-configs/<name>.xml` 是主数据源。
2.  **同步时机**:
    *   **创建时**: 生成源文件 -> 导入应用。
    *   **切换时 (`switch_maven_config`)**: 在应用该配置前，检查是否存在对应的 `~/.m2.<name>/` 目录。如果存在，将 `maven-configs/<name>.xml` 的内容强制覆盖写入 `~/.m2.<name>/settings.xml`。
    *   **编辑时**: 若支持应用内保存，保存后应触发同步。但目前编辑功能是调用外部编辑器打开 `maven-configs/<name>.xml`，用户保存是外部行为。因此，**同步主要依赖"切换"动作**。

**流程图**:
```
[User Edits via App] -> modifies [maven-configs/test.xml]
                                     │
                                     ▼
[User Switches Config] ──(Sync)──> [Overwrites ~/.m2.test/settings.xml]
                                     │
                                     ▼
                                [Copies to ~/.m2/settings.xml]
```

### 6. 路径分隔符处理

Maven settings.xml 在所有平台（包括 Windows）都推荐使用正斜杠 `/` 作为路径分隔符，能避免转义问题。

*   **Rust 实现**: 生成 XML 时，路径字符串通过 `.replace("\\", "/")` 标准化。
*   **示例**:
    *   Windows: `C:/Users/User/.m2.test/repository` (正确)
    *   Windows: `C:\Users\User\.m2.test\repository` (避免)

### 7. 与现有功能的集成


```
                    ┌─────────────────────────────────────┐
                    │         VersionsPage.tsx            │
                    │         (Maven Tab)                 │
                    └─────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
    ┌──────▼──────┐         ┌───────▼───────┐        ┌───────▼───────┐
    │  扫描配置    │         │  创建配置 NEW  │        │  导入配置     │
    │ (现有功能)   │         │               │        │ (现有功能)    │
    └──────┬──────┘         └───────┬───────┘        └───────┬───────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │      Maven 配置列表           │
                    │  ┌─────────────────────────┐  │
                    │  │ project-a    [编辑][删除]│  │
                    │  │ corporate    [编辑][删除]│  │
                    │  │ default      [编辑][删除]│  │
                    │  └─────────────────────────┘  │
                    └───────────────────────────────┘
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 目录已存在 | 创建失败 | 检查并提示用户，提供覆盖选项或重命名建议 |
| 文件系统权限 | 无法创建 | 捕获错误，显示友好的权限错误提示 |
| 编辑器未配置 | 无法打开 | macOS/Windows 使用系统默认关联，失败时提示用户手动打开 |
