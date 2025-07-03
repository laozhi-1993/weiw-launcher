const path = require('path');
const fs   = require('fs/promises');
const { taskDownloads, taskDownload } = load('httpSeries');


module.exports = class
{
	constructor(minecraft) {
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
		} catch {}
	}
	
	async downloadFiles(task, downloads)
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
		
		await taskDownloads(task, extraFiles, '下载额外文件');
	}
}