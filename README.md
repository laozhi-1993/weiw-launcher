# weiw-launcher

## 项目简介
weiw-launcher 客户端是一个基于 [authlib-injector](https://github.com/yushijinhun/authlib-injector) 项目开发的我的世界启动器，实现了类似于原版我的世界的登录认证。

[ui](https://github.com/laozhi-1993/weiw-launcher/blob/main/ui.png)
## 功能特性
- **登录认证**：通过 authlib-injector 实现与原版我的世界相同的登录认证体验。
- **用户界面**：友好的用户界面，方便用户操作。
- **皮肤系统**：实现了简单的皮肤更换和使用功能。
- **金钱系统**：可以编辑 Minecraft 服务器指令让玩家使用金钱购买执行、进行每日签到获取金钱，并使用管理员权限进行金钱分配。
- **RCON 指令执行**：可以使用 RCON 在客户端执行 Minecraft 服务器上的指令。

## 如何使用

1. **下载和安装**
   - 从 [发布页面](https://github.com/laozhi-1993/weiw-launcher/releases) 下载最新的 `weiw-launcher` 客户端版本。
   - 解压下载的文件到你选择的目录。

2. **下载和配置 Java**
   - 从 [Oracle 官网](https://www.oracle.com/cn/java/technologies/downloads/#jdk22-windows) 下载 Java JDK（建议选择与 Minecraft 兼容的版本，例如 JDK 22）。
   - 下载完成后，你会得到一个压缩文件（如 `jdk-22.0.2_windows-x64_bin.zip`）。
   - 解压下载的 Java JDK 文件。你可以使用系统自带的解压工具或第三方解压软件（如 7-Zip 或 WinRAR）来解压。
   - 解压后，找到解压出来的文件夹，将其重命名为 `java`。例如，将 `jdk-22.0.2` 重命名为 `java`。
   - 将重命名后的 `java` 文件夹移动到 `weiw-launcher` 客户端目录中。

3. **下载或配置 authlib-injector**
   - 从 [authlib-injector 发布页面](https://github.com/yushijinhun/authlib-injector/releases) 下载 `authlib-injector`。
   - 解压下载的 `authlib-injector` 文件（如果是压缩文件），然后将其重命名为 `authlib-injector`（不带版本号）。
   - 将重命名后的 `authlib-injector` 文件夹移动到 `weiw-launcher` 客户端目录中。

4. **配置启动器**
   - 打开启动器目录，找到并编辑 `config.json` 文件。
   - 配置文件示例：
     ```json
     {
       "URL": "http://127.0.0.1",  // 替换为 weiw-server 服务端的 IP 地址
       "xmn": "128",  // Minecraft 启动时分配的最小内存（MB）
       "xmx": "4096", // Minecraft 启动时分配的最大内存（MB）
       "fullscreen": false, // 设置启动时是否全屏：true 为全屏，false 为窗口模式
       "server": "",  // 启动后自动连接的服务器地址（高版本中无效）
       "port": "25565",  // 启动后自动连接的服务器端口（高版本中无效）
       "width": "954",  // 窗口模式下启动游戏时的窗口宽度（像素）
       "height": "580", // 窗口模式下启动游戏时的窗口高度（像素）
       "key": [
         {"key": "ctrl+e", "value": "enderchest"},
         {"key": "ctrl+t", "value": "tpaccept"},
         {"key": "home", "value": "home home"},
         {"key": "ctrl+home", "value": "sethome home"},
         {"key": "ctrl+f", "value": "fly"},
         {"key": "ctrl+b", "value": "back"}
       ]
     }
     ```
   - 将 `"URL"` 字段中的 `http://127.0.0.1` 替换为你的 weiw-server 服务端的实际 IP 地址。
   - 根据需要调整 `xmn` 和 `xmx` 以设置 Minecraft 启动时分配的最小和最大内存（单位为 MB）。默认情况下，`xmn` 是最小内存，`xmx` 是最大内存。
   - 将 `"fullscreen"` 设置为 `true` 以全屏模式启动 Minecraft，或设置为 `false` 以窗口模式启动。
   - 如果选择窗口模式，`"width"` 和 `"height"` 字段用于设置游戏窗口的宽度和高度（单位为像素）。
   - **快捷键配置**：`"key"` 字段定义了快捷键与 Minecraft 指令的映射。请注意，使用这些快捷键需要服务器支持 `sudo` 指令。例如：
     - `"ctrl+e"` 映射到 `enderchest` 指令
     - `"home"` 映射到 `home home` 指令

5. **进行 Minecraft 文件补全**
   - 使用附带的 [HMCL 启动器](https://github.com/HMCL-dev/HMCL) 进行 Minecraft 的补全操作。这一步将下载并配置所需的 Minecraft 文件。
   - 启动 HMCL 启动器，并选择所需的 Minecraft 版本进行启动和补全操作。
   - 将补全后的 `.minecraft` 文件夹移动到 `weiw-launcher` 客户端目录中。

6. **启动客户端**
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
   - **Java 文件夹**：将准备好的 `java` 文件夹移动到解压后的源码目录中的 `other` 文件夹内。
   - **.minecraft 文件夹**：将生成的 `.minecraft` 文件夹移动到解压后的源码目录中的 `other` 文件夹内。
   - **authlib-injector.jar 文件**：将下载或使用附带的 `authlib-injector.jar` 文件移动到解压后的源码目录中的 `other` 文件夹内。
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

## 帮助

### 常见问题：
  - **启动器无法启动**：检查 Java JDK 和 authlib-injector 是否正确配置，确保 config.json 文件中的路径和设置正确。
  - **Minecraft 运行时出现错误**：确保 Minecraft 文件和 JDK 配置无误，检查 config.json 中的内存设置是否适当。
  - **登录问题**：确保 [weiw-server](https://github.com/laozhi-1993/weiw-server) 服务端正常运行，检查 URL 配置是否正确。

### 联系支持：
如果你遇到无法解决的问题，可以通过以下途径获取帮助：
  - **项目 GitHub Issues**：在项目的 [GitHub](https://github.com/laozhi-1993/weiw-launcher/issues) 仓库中报告问题。
  - **服务端项目 GitHub**：查看和获取服务端的 [weiw-server](https://github.com/laozhi-1993/weiw-server) 项目。
