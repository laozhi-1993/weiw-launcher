const { contextBridge, ipcRenderer } = require('electron');
	contextBridge.exposeInMainWorld('windowApi', function (...args){ return ipcRenderer.send("windowApi", args) });
	contextBridge.exposeInMainWorld('openApi',   function (...args){ return ipcRenderer.send("openApi",   args) });
	contextBridge.exposeInMainWorld('start',     function (...args){ return ipcRenderer.send("start",     args) });	
	
	
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
	if(id = document.getElementById('show'))     id.addEventListener('click', function(){ ipcRenderer.send("show")     });
	if(id = document.getElementById('hide'))     id.addEventListener('click', function(){ ipcRenderer.send("hide")     });
});