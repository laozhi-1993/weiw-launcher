const { shell, dialog } = require('electron');
const registry          = require('winreg');
const fs                = require('fs');
const path              = require('path');


module.exports = class
{
    constructor()
	{
		this.javaUrl  = 'https://download.oracle.com/java/21/latest/jdk-21_windows-x64_bin.exe';
		this.java8Url = 'https://www.java.com/zh-CN/download/';
    }
	
	getJavaHome()
	{
		return new Promise((resolve) => {
			let index = 0;
			let regKey = new registry({
				hive: registry.HKEY_LOCAL_MACHINE,
				key: '\\SOFTWARE\\JavaSoft\\JDK'
			});
			
			regKey.keys((err, items) => {
				if (err || items.length === 0) {
					return resolve(null);
				}
				
				items.forEach(item => {
					item.get('JavaHome', (err, javaHomeItem) => {
						index++;
						
						if (!err) {
							const javaPath = path.join(javaHomeItem.value, 'bin', 'java.exe');
							const majorVersion = path.basename(item.key).split('.')[0];
							
							if ((majorVersion >= 17) && fs.existsSync(javaPath)) {
								resolve(javaPath);
							}
						}
						
						if (items.length === index) {
							resolve();
						}
					});
				});
			});
		});
	}
	
	getJava8Home()
	{
		return new Promise((resolve) => {
			const regKey = new registry({
				hive: registry.HKEY_LOCAL_MACHINE,
				key: '\\SOFTWARE\\JavaSoft\\Java Runtime Environment\\1.8'
			});
			
			regKey.get('JavaHome', (err, javaHomeItem) => {
				if (!err) {
					const javaPath = path.join(javaHomeItem.value, 'bin', 'java.exe');
					if (fs.existsSync(javaPath)) {
						resolve(javaPath);
					}
				}
				
				resolve(null);
			});
		});
	}
	
	showMessage(message, url) {
		const result = dialog.showMessageBoxSync({
			type: 'question',
			buttons: ['关闭', '打开'],
			title: '系统中未找到java虚拟机！',
			message: message,
		});
		
		if (result === 1) {
			shell.openExternal(url);
		}
		
		
		throw null;
	}
	
	async checkJavaVersion(minecraft) {
		if (minecraft.versionCompare('1.17', '>=')) {
			minecraft.setJava(await this.getJavaHome());
			
			if (!minecraft.getJava()) {
				this.showMessage(`当前我的世界版本需要java17或更高才可以运行，是否打开 ${this.javaUrl} 地址进行下载？`, this.javaUrl);
			}
		} else {
			minecraft.setJava(await this.getJava8Home());
			
			if (!minecraft.getJava()) {
				this.showMessage(`当前我的世界版本需要java8才可以运行，是否打开 ${this.java8Url} 地址进行下载？`, this.java8Url);
			}
		}
	}
}