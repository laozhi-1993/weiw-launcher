const sudo = once();
const { contextBridge, ipcRenderer } = require('electron');
	contextBridge.exposeInMainWorld('OpenAPI' ,function (data){ return ipcRenderer.send("open"  ,data) });
	contextBridge.exposeInMainWorld('start'   ,function (data){ return ipcRenderer.send("start" ,data) });	
	
	
	
    ipcRenderer.on('mc_state' ,(event,arg)=>{ window.dispatchEvent(new CustomEvent("mc_state" ,{detail:arg})) });
    ipcRenderer.on('mc_data'  ,(event,arg)=>{ window.dispatchEvent(new CustomEvent("mc_data"  ,{detail:arg})) });
    ipcRenderer.on('mc_key'   ,(event,arg)=>{
		sudo((open) => fetch('/weiw/index.php?mods=mc_sudo&command='+arg.value).then(open).catch(open));
    });
    ipcRenderer.on('noResize' ,(event,arg)=>{
		if(id = document.getElementById('maximize')) id.style.display = 'none';
		if(id = document.getElementById('restore'))  id.style.display = 'none';
	});
	
	
	function once()
	{
		let state = true;
		return function(callback)
		{
			if(state)
			{
				state = false;
				callback(() => { state = true });
			}
		}
	}
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
	}
	
	
window.addEventListener('keydown', function(event) {
    if(event.key === 'F12') ipcRenderer.send("DevTools");
});
window.addEventListener('resize', isMaximized);
window.addEventListener('DOMContentLoaded', isMaximized);
window.addEventListener('DOMContentLoaded', function() {
	if(id = document.getElementById('minimize')) id.addEventListener('click', function(){ ipcRenderer.send("minimize") });
	if(id = document.getElementById('maximize')) id.addEventListener('click', function(){ ipcRenderer.send("maximize") });
	if(id = document.getElementById('close'))    id.addEventListener('click', function(){ ipcRenderer.send("close")    });
	if(id = document.getElementById('restore'))  id.addEventListener('click', function(){ ipcRenderer.send("restore")  });
});