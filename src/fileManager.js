const path = require('path');
const fs   = require('fs/promises');

module.exports = class
{
	constructor(taskManager, minecraft)
	{
		this.taskManager = taskManager;
		this.minecraft   = minecraft;
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
	
	async downloadAuthModule(authModuleUrl)
	{
		this.minecraft.authModulePath = this.minecraft.getRootDir(path.basename(authModuleUrl));
		this.minecraft.getAuthModulePath = () => {
			return this.minecraft.authModulePath;
		}
		
		try {
			await fs.access(this.minecraft.getAuthModulePath());
		} catch (error) {
			this.taskManager.start();
			this.taskManager.operation('下载认证组件');
			
			await this.taskManager.fileDownloads.add(authModuleUrl, this.minecraft.getAuthModulePath()).catch((error) => {
				this.taskManager.operation('下载认证组件失败');
				this.taskManager.stop();
			});
		}
	}
	
	async downloadAdditionalFiles(downloads)
	{
		let success = 0;
		let failure = 0;
		
		for (const download of downloads) {
			await fs.access(this.minecraft.getRootDir(download.path)).catch((error) => {
				this.taskManager.start();
				this.taskManager.operation('下载额外文件');
				
				this.taskManager.fileDownloads.add(download.url, this.minecraft.getRootDir(download.path)).then(() => success++).catch(() => failure++);
			});
		}
		
		await this.taskManager.fileDownloads.waitDone();
		if (failure) {
			this.taskManager.operation(`有 ${failure} 个文件下载失败请重新尝试下载`);
			this.taskManager.stop();
		}
	}
}