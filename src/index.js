const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const launcher = require('./index.launcher.js');

const ini = JSON.parse(fs.readFileSync('launcher.json','utf-8'));
const createWindow = () => {
  // 打开一个窗口
  const mainWindow = new BrowserWindow({
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences:{
      preload: path.join(__dirname, 'index.preload.js')
    }
  });
  
  
  Menu.setApplicationMenu(null); //关闭默认菜单
  mainWindow.loadURL(ini.index); //打开一个网址
  //mainWindow.openDevTools();     //打开控制台
  
  var state = 0;
  // 网页加载完毕时发送消息给preload.js
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.send('mc_state',state);
  });
  // 监听mc_start事件启动游戏
  ipcMain.on('mc_start', (e,message) => {
    if(state == 0)
    {
      state = 1;
      mainWindow.send('mc_start');

      
      var output = (type,data) => {
        mainWindow.send('mc_output',{"type":type,"data":data});
        console.log(`${type}: ${data}`);
      }
      var success = () => {
        mainWindow.send('mc_success');
        mainWindow.minimize();
        console.log('success');
        state = 2;
      }
      var exit = () => {
        mainWindow.send('mc_exit');
        mainWindow.restore();
        console.log('exit');
        state = 0;
      }
      var mc = new launcher(path.resolve('.'),path.resolve(ini.java),ini.versions,ini.xmn,ini.xmx);
      mc.username   = message.username;
      mc.uuid       = message.uuid;
      mc.token      = message.token;
      mc.fullscreen = ini.fullscreen;
      mc.server     = ini.server;
      mc.port       = ini.port;
      mc.width      = ini.width;
      mc.height     = ini.height;
      mc.auth_route = ini.auth_route;
      mc.auth_url   = ini.auth_url;
      mc.start(output,success,exit);
    }
  });
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});