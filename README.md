# weiw-launcher

## 项目简介
`weiw-launcher` 是一个基于 [authlib-injector](https://github.com/yushijinhun/authlib-injector) 项目开发的 Minecraft 启动器，它与 [weiw-server](https://github.com/laozhi-1993/weiw-server) 服务端组件协同工作，提供了一个完整的 Minecraft 登录和管理解决方案。

![ui](https://github.com/laozhi-1993/weiw-launcher/blob/main/ui.png)

## 如何使用

1. **下载和安装**
   - 从 [发布页面](https://github.com/laozhi-1993/weiw-launcher/releases) 下载最新的 `weiw-launcher` 客户端版本。
   - 解压下载的文件到你选择的目录。

2. **配置启动器**
   - 打开启动器目录，找到并编辑 `config.json` 文件。
   - 配置文件示例：
     ```json
     {
       "URL": "http://127.0.0.1",  // 替换为 weiw-server 服务端的 IP 地址
       "width": "954",  // 窗口模式下启动游戏时的窗口宽度（像素）
       "height": "580"  // 窗口模式下启动游戏时的窗口高度（像素）
     }
     ```
   - 将 `"URL"` 字段中的 `http://127.0.0.1` 替换为你的 weiw-server 服务端的实际 IP 地址。
   - 如果选择窗口模式，`"width"` 和 `"height"` 字段用于设置游戏窗口的宽度和高度（单位为像素）。

3. **启动客户端**
   - 双击 `weiw-launcher.exe` 以启动客户端。
   - 登录或注册。

## 编译说明

如果你需要从源代码编译 `weiw-launcher` 以生成 exe 安装包，请按照以下步骤操作：

### 准备开发环境

1. **安装 Node.js**
   - 从 [Node.js 官网](https://nodejs.org/) 下载并安装 Node.js。建议使用 LTS（长期支持）版本，以确保稳定性和兼容性。
   - 安装完成后，可以使用以下命令检查 Node.js 和 npm 的版本：
     ```sh
     node -v
     npm -v
     ```

### 配置 npm

1. **配置 `.npmrc` 文件**
   - 由于国内网络情况，npm 安装依赖可能会非常缓慢或失败。你可以将源码中的 `.npmrc` 文件复制到用户主目录下，以使用配置好的镜像源。
   - 将项目根目录下的 `.npmrc` 文件复制到用户主目录中。用户主目录通常位于 `C:\Users\<你的用户名>\`。
     ```sh
     copy .npmrc C:\Users\<你的用户名>\
     ```

### 下载源码并解压

1. **下载源代码**
   - 从 [GitHub 仓库](https://github.com/laozhi-1993/weiw-launcher) 下载项目源代码的最新版本。

2. **解压源码**
   - 如果下载的是压缩文件（如 `.zip`），请使用系统自带的解压工具或第三方解压软件（如 7-Zip 或 WinRAR）将其解压到你选择的目录。

3. **准备和移动文件**
   - **config.json 文件**：编辑 `other` 文件夹内的 `config.json` 文件。

4. **打开 CMD 窗口并导航到源码目录**
   - 按下 `Win + R` 组合键，输入 `cmd` 并按回车键打开命令提示符窗口。
   - 使用 `cd` 命令导航到源码目录。例如：
     ```sh
     cd C:\Users\<你的用户名>\Desktop\weiw-launcher
     ```

### 安装依赖

1. **安装 Electron**
   - 在 CMD 窗口中，输入以下命令来安装 Electron：
     ```sh
     npm install electron --save-dev
     ```

2. **安装 Electron Builder**
   - 在 CMD 窗口中，输入以下命令来安装 Electron Builder：
     ```sh
     npm install electron-builder --save-dev
     ```

### 编译项目

1. 使用以下命令编译项目：
   ```sh
   npx electron-builder build
   ```

## 相关项目

- [weiw-server](https://github.com/laozhi-1993/weiw-server): `weiw-server` 是 `weiw-launcher` 项目的服务端组件，提供用户认证和游戏相关的服务器功能。
- [authlib-injector](https://github.com/yushijinhun/authlib-injector): 一个用于 Minecraft 登录认证的库，`weiw-launcher` 使用该库来实现与原版 Minecraft 相同的登录认证体验。
