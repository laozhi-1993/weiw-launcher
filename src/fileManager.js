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
			extraFiles.push({
				'url': download.url,
				'time':download.time,
				'path': this.minecraft.getRootDir(download.path)
			});
		}
		
		await taskDownloads(task, extraFiles, '下载额外文件');
	}
}