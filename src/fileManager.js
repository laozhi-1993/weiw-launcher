const path = require('path');
const fs   = require('fs/promises');
const { downloadFiles, downloadFile } = load('taskManager');


module.exports = class
{
	constructor(minecraft)
	{
		this.minecraft = minecraft;
	}
	
	async clearUnwantedMods(mods)
	{
		const modsDirectory = this.minecraft.getRootDir("mods");
		
		try {
			await fs.access(modsDirectory);
			
			const files = await fs.readdir(modsDirectory);
			
			for (const fileName of files) {
				const filePath = path.join(modsDirectory, fileName);
				const stats = await fs.stat(filePath);

				if (!mods.includes(fileName) && stats.isFile()) {
					await fs.unlink(filePath);
				}
			}
		} catch (err) {}
	}
	
	async downloadAuth(taskWindow, authUrl)
	{
		this.minecraft.setAuthPath(this.minecraft.getRootDir(path.basename(authUrl)));
		
		try {
			await fs.access(this.minecraft.getAuthPath());
		} catch (error) {
			await downloadFile(taskWindow, authUrl, '下载认证模块', '下载认证模块失败', f => f.saveToFile(this.minecraft.getAuthPath()));
		}
	}
	
	async downloadFiles(taskWindow, downloads)
	{
		const extraFiles = [];
		
		for (const download of downloads) {
			try {
				const stats = await fs.stat(this.minecraft.getRootDir(download.path));
				const modificationTimeInSeconds = Math.floor(stats.mtime.getTime() / 1000);
				
				if (download.time && download.time >= modificationTimeInSeconds) {
					throw new Error('');
				}
			} catch(error) {
				extraFiles.push({'url': download.url, 'path': this.minecraft.getRootDir(download.path)});
			}
		}
		
		await downloadFiles(taskWindow, extraFiles, '下载额外文件');
	}
}