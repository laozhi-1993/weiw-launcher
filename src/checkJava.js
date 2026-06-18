const winreg = require('winreg');
const fs     = require('fs');
const path   = require('path');
const { shell, dialog } = require('electron');


module.exports = class
{
    constructor() {
		this.javaUrlV1 = 'https://www.java.com/zh-CN/download/';
		this.javaUrlV2 = 'https://download.oracle.com/java/17/archive/jdk-17.0.12_windows-x64_bin.exe';
		this.javaUrlV3 = 'https://download.oracle.com/java/21/archive/jdk-21.0.10_windows-x64_bin.exe';
		this.javaUrlV4 = 'https://download.oracle.com/java/25/archive/jdk-25.0.2_windows-x64_bin.exe';
    }
	
	getJava()
	{
		return new Promise((resolve, reject) => {
			let javaItem = [];
			let javaPaths = {};
			
			
			javaItem.push(this.getPath(new winreg({
				hive: winreg.HKEY_LOCAL_MACHINE,
				key: '\\SOFTWARE\\JavaSoft\\Java Runtime Environment\\1.8'
			}), 8));
			
			
			const regKey = new winreg({
				hive: winreg.HKEY_LOCAL_MACHINE,
				key: '\\SOFTWARE\\JavaSoft\\JDK'
			});
			
			regKey.keys((err, items) => {
				items.forEach(item => {
					const version = path.basename(item.key).split('.')[0];
					javaItem.push(this.getPath(item, version));
				});
				
				Promise.allSettled(javaItem).then((results) => {
					results.forEach((result) => {
						if (result.status === 'fulfilled') {
							const [version, fullPath] = result.value;
							javaPaths[version] = fullPath;
						}
					});
					
					resolve(javaPaths);
				});
			});
		});
	}
	
	getPath(item, version)
	{
		return new Promise((resolve, reject) => {
			item.get('JavaHome', (err, javaHomeItem) => {
				
				if (err) {
					return reject();
				}
				
				const fullPath = path.join(javaHomeItem.value, 'bin', 'java.exe');
				
				if (fs.existsSync(fullPath)) {
					resolve([version, fullPath]);
				} else {
					reject();
				}
			});
		});
	}
	
	showMessage(message, url)
	{
		const result = dialog.showMessageBoxSync({
			type: 'question',
			buttons: ['关闭', '打开'],
			title: '系统中未找到java虚拟机！',
			message: message,
		});
		
		if (result === 1) {
			shell.openExternal(url);
		}
	}
	
	checkJavaVersion(minecraft)
	{
		return this.getJava().then((javaPaths) => {
			
			if (minecraft.versionCompare('1.16.5', '<='))
			{
				if (!Object.hasOwn(javaPaths, '8')) {
					this.showMessage(`当前我的世界版本需要java8才可以运行，是否打开 ${this.javaUrlV1} 地址进行下载？`, this.javaUrlV1);
					throw('stop');
				}
				
				minecraft.java(javaPaths['8']);
				return;
			}
			
			if (minecraft.versionCompare('1.20.4', '<='))
			{
				if (!Object.hasOwn(javaPaths, '17')) {
					this.showMessage(`当前我的世界版本需要java17才可以运行，是否打开 ${this.javaUrlV2} 地址进行下载？`, this.javaUrlV2);
					throw('stop');
				}
				
				minecraft.java(javaPaths['17']);
				return;
			}
			
			if (minecraft.versionCompare('1.21.11', '<='))
			{
				if (!Object.hasOwn(javaPaths, '21')) {
					this.showMessage(`当前我的世界版本需要java21才可以运行，是否打开 ${this.javaUrlV3} 地址进行下载？`, this.javaUrlV3);
					throw('stop');
				}
				
				minecraft.java(javaPaths['21']);
				return;
			}
			
			
			if (!Object.hasOwn(javaPaths, '25')) {
				this.showMessage(`当前我的世界版本需要java25才可以运行，是否打开 ${this.javaUrlV4} 地址进行下载？`, this.javaUrlV4);
				throw('stop');
			}
			
			minecraft.java(javaPaths['25']);
		});
	}
}