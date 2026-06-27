const path   = require('path');
const fs     = require('fs');
const AdmZip = require("adm-zip");
const { taskDownload } = load('httpSeries');


module.exports = class
{
    constructor(minecraft, mainWindows, javaInstallDir = 'java') {
		this.minecraft = minecraft;
		this.mainWindows = mainWindows;
		this.javaInstallDir = javaInstallDir;
    }
	
	getRequiredJavaVersion()
	{
		if (this.minecraft.versionCompare('1.16.5', '<=')) {
			return '8';
		}
		
		if (this.minecraft.versionCompare('1.20.4', '<=')) {
			return '17';
		}
		
		if (this.minecraft.versionCompare('1.21.11', '<=')) {
			return '21';
		}
		
		return '25';
	}
	
	getAllJavaPaths()
	{
		try {
			const javaPaths = {};
			const entries = fs.readdirSync(this.javaInstallDir, { withFileTypes: true });
			
			for(let entrie of entries.filter(entry => entry.isDirectory())) {
				const match = entrie.name.match(/([0-9]+)/);
				const javaPath = path.join(this.javaInstallDir, entrie.name, 'bin', 'java.exe');
				
				if (match && fs.existsSync(javaPath)) {
					javaPaths[match[1]] = javaPath;
				}
			}
			
			return javaPaths;
		} catch (error) {
			return {};
		}
	}
	
	getJavaPath(javaVersion)
	{
		const javaPaths = this.getAllJavaPaths();
		if (javaPaths.hasOwnProperty(javaVersion)) {
			return javaPaths[javaVersion];
		}
		
		return null;
	}
	
	async getJavaDownloadUrl(javaVersion)
	{
		const htmlUrl = `https://mirrors.tuna.tsinghua.edu.cn/Adoptium/${javaVersion}/jre/x64/windows/`;
		const htmlDownloadConfig = {
			'url': htmlUrl,
			'title': `获取 java${javaVersion} 下载地址`,
			'failure': `获取 java${javaVersion} 下载地址失败`,
		};
		const html = await taskDownload(this.mainWindows, htmlDownloadConfig, false);
		const match = html.match(/href="([^"]+\.zip)"/);
		
		if (match) {
			return path.posix.join(htmlUrl, match[1]);
		}
		
		return null;
	}
	
	async setup()
	{
		const javaVersion = this.getRequiredJavaVersion();
		const javaPath = this.getJavaPath(javaVersion);
		
		if (javaPath)
		{
			this.minecraft.java(javaPath);
		}
		else
		{
			const javaDownloadUrl = await this.getJavaDownloadUrl(javaVersion);
			const javaDownloadPath = path.join(this.javaInstallDir, 'java.zip');
			const javaDownloadConfig = {
				'url': javaDownloadUrl,
				'path': javaDownloadPath,
				'title': `下载安装 java${javaVersion} 虚拟机`,
				'failure': `下载安装 java${javaVersion} 虚拟机失败`,
			};
			await taskDownload(this.mainWindows, javaDownloadConfig);
			
			
			const zip = new AdmZip(javaDownloadPath);
			const zipEntries = zip.getEntries();
			zip.extractAllTo(this.javaInstallDir);
			
			const oldName = path.join(this.javaInstallDir, zipEntries[0].entryName);
			const newName = path.join(this.javaInstallDir, javaVersion);
			fs.renameSync(oldName, newName);
			fs.unlinkSync(javaDownloadPath);
			
			const javaPath = this.getJavaPath(javaVersion);
			
			if (!javaPath) {
				throw '获取java路径失败';
			}
			
			this.minecraft.java(javaPath);
		}
	}
}