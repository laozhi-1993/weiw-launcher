window.addEventListener('DOMContentLoaded', () => {
    const { ipcRenderer } = require('electron');
    const start = document.querySelector('#start');

    // 发送打开游戏的命令
    start.onclick = function()
    {
        var username = start.getAttribute('username');
        var uuid     = start.getAttribute('uuid');
        var token    = start.getAttribute('token');
        ipcRenderer.send('mc_start', {"username":username,"uuid":uuid,"token":token});
    }
    // 监听游戏启动状态
    ipcRenderer.on('mc_state',(event,arg)=>{
        const sendEvent = new CustomEvent("mc_state", {detail:arg});
        window.dispatchEvent(sendEvent);
    });
    // 监听游戏进程发来的数据
    ipcRenderer.on('mc_output',(event,arg)=>{
        const sendEvent = new CustomEvent("mc_output", {detail:{"type":arg.type,"data":arg.data}});
        window.dispatchEvent(sendEvent);
    });
    // 监听游戏打开事件
    ipcRenderer.on('mc_start',()=>{
        const sendEvent = new CustomEvent("mc_start");
        window.dispatchEvent(sendEvent);
    });
    // 监听游戏打开成功事件
    ipcRenderer.on('mc_success',()=>{
        const sendEvent = new CustomEvent("mc_success");
        window.dispatchEvent(sendEvent);
    });
    // 监听游戏退出事件
    ipcRenderer.on('mc_exit',()=>{
        const sendEvent = new CustomEvent("mc_exit");
        window.dispatchEvent(sendEvent);
    });
});