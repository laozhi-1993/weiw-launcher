const { contextBridge, ipcRenderer } = require('electron');
	contextBridge.exposeInMainWorld('windowApi', function (data){ return ipcRenderer.send("windowApi", data) });
	contextBridge.exposeInMainWorld('openApi',   function (data){ return ipcRenderer.send("openApi",   data) });
	contextBridge.exposeInMainWorld('start',     function (data){ return ipcRenderer.send("start",     data) });	
	
	
	ipcRenderer.on('addEvent', (event, arg) => {
		if(arg.name === 'consoleLog') {
			console.log(arg.data);
		} else {
			window.dispatchEvent(new CustomEvent(arg.name ,{detail:arg.data}));
		}
	});
	
	
	function isMaximized()
	{
		if(ipcRenderer.sendSync("isMaximized"))
		{
			if(id = document.getElementById('maximize')) id.style.display = 'none';
			if(id = document.getElementById('restore'))  id.style.display = 'inline-block';
		}
		else
		{
			if(id = document.getElementById('maximize')) id.style.display = 'inline-block';
			if(id = document.getElementById('restore'))  id.style.display = 'none';
		}
		
		return isMaximized;
	}
	
	
window.addEventListener('keydown', function(event) {
    if(event.key === 'F12') ipcRenderer.send("DevTools");
});
window.addEventListener('DOMContentLoaded', function() {
	if(!ipcRenderer.sendSync("isResizable"))
	{
		requestAnimationFrame(() => {
			if(id = document.getElementById('maximize')) id.style.display = 'none';
			if(id = document.getElementById('restore'))  id.style.display = 'none';
		});
	}
	
	window.addEventListener('resize', isMaximized());
	if(id = document.getElementById('minimize')) id.addEventListener('click', function(){ ipcRenderer.send("minimize") });
	if(id = document.getElementById('maximize')) id.addEventListener('click', function(){ ipcRenderer.send("maximize") });
	if(id = document.getElementById('close'))    id.addEventListener('click', function(){ ipcRenderer.send("close")    });
	if(id = document.getElementById('restore'))  id.addEventListener('click', function(){ ipcRenderer.send("restore")  });
	if(id = document.getElementById('reload'))   id.addEventListener('click', function(){ ipcRenderer.send("reload")   });
});