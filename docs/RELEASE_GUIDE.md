# 发布指南

本文档说明如何配置 CI/CD 并发布 AEM Environment Manager 新版本。

## 前置条件

### 1. GitHub Secrets 配置

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下 secrets：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `TAURI_SIGNING_PRIVATE_KEY` | Tauri 签名私钥内容 | `cat ~/.tauri/aem-env-manager.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码（如果设置了） | 生成密钥时设置的密码，无密码则留空 |

### 2. 配置更新端点

编辑 `src-tauri/tauri.conf.json`，将 `endpoints` 中的 URL 更新为你的 GitHub 仓库地址：

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/yjwu-leadstec/aem-env-manager/releases/latest/download/latest.json"
      ]
    }
  }
}
```

## 发布流程

### 方式一：通过 Git Tag 触发（推荐）

1. 更新版本号：
   ```bash
   # 编辑 src-tauri/tauri.conf.json 中的 version
   # 编辑 package.json 中的 version
   ```

2. 提交更改：
   ```bash
   git add .
   git commit -m "chore: bump version to 0.2.0"
   ```

3. 创建并推送标签：
   ```bash
   git tag v0.2.0
   git push origin main --tags
   ```

4. GitHub Actions 会自动：
   - 构建 macOS、Windows、Linux 版本
   - 签名更新包
   - 创建 Draft Release
   - 上传所有构建产物
   - 发布 Release

### 方式二：手动触发

1. 进入 GitHub 仓库的 **Actions** 页面
2. 选择 **Release** workflow
3. 点击 **Run workflow**
4. 输入版本号（如 `0.2.0`）
5. 点击 **Run workflow**

## 构建产物

每次发布会生成以下文件：

### macOS
- `AEM.Environment.Manager_x.x.x_universal.dmg` - DMG 安装包
- `AEM.Environment.Manager_x.x.x_universal.dmg.sig` - 签名文件

### Windows
- `AEM.Environment.Manager_x.x.x_x64-setup.exe` - NSIS 安装包
- `AEM.Environment.Manager_x.x.x_x64_en-US.msi` - MSI 安装包
- `*.sig` - 对应的签名文件

### Linux
- `aem-environment-manager_x.x.x_amd64.deb` - Debian 包
- `aem-environment-manager_x.x.x_amd64.AppImage` - AppImage
- `*.sig` - 对应的签名文件

### 更新清单
- `latest.json` - 自动更新检测用的版本信息文件

## 更新文件格式

`latest.json` 示例：

```json
{
  "version": "0.2.0",
  "notes": "Release notes here",
  "pub_date": "2024-01-20T12:00:00Z",
  "platforms": {
    "darwin-universal": {
      "signature": "...",
      "url": "https://github.com/.../AEM.Environment.Manager_0.2.0_universal.dmg"
    },
    "linux-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../aem-environment-manager_0.2.0_amd64.AppImage"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../AEM.Environment.Manager_0.2.0_x64-setup.exe"
    }
  }
}
```

## 本地测试构建

```bash
# 开发模式
npm run tauri dev

# 生产构建（不签名）
npm run tauri build

# 生产构建（签名）
TAURI_SIGNING_PRIVATE_KEY=$(cat ~/.tauri/aem-env-manager.key) npm run tauri build
```

## 故障排除

### 签名失败
- 确认 `TAURI_SIGNING_PRIVATE_KEY` secret 已正确设置
- 检查私钥内容是否完整（包括开头和结尾的标记）

### 更新检测失败
- 确认 `tauri.conf.json` 中的 `pubkey` 与生成的公钥匹配
- 确认 `endpoints` URL 正确指向 GitHub releases
- 检查网络连接是否可以访问 GitHub

### 构建失败
- 查看 GitHub Actions 日志了解详细错误
- 确认所有依赖已正确安装
- Linux 构建需要特定的系统库
