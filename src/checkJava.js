const winreg = require('winreg');
const fs     = require('fs');
const path   = require('path');
const { shell, dialog } = require('electron');


module.exports = class
{
    constructor() {
		this.javaUrlV1 = 'https://www.java.com/zh-CN/download/';
		this.javaUrlV2 = 'https://download.oracle.com/java/21/latest/jdk-21_windows-x64_bin.exe';
    }
	
	getPath(item) {
		return new Promise((resolve, reject) => {
			item.get('JavaHome', (err, javaHomeItem) => {
				
				if (err) {
					return reject();
				}
				
				const fullPath = path.join(javaHomeItem.value, 'bin', 'java.exe');
				
				if (fs.existsSync(fullPath)) {
					resolve(fullPath);
				} else {
					reject();
				}
			});
		});
	}
	
	getJavaV1() {
		const regKey = new winreg({
			hive: winreg.HKEY_LOCAL_MACHINE,
			key: '\\SOFTWARE\\JavaSoft\\Java Runtime Environment\\1.8'
		});
		
		return this.getPath(regKey);
	}
	
	getJavaV2() {
		return new Promise((resolve, reject) => {
			const regKey = new winreg({
				hive: winreg.HKEY_LOCAL_MACHINE,
				key: '\\SOFTWARE\\JavaSoft\\JDK'
			});
			
			regKey.keys((err, items) => {
				const javaHomes = [];
				
				if (err) {
					return reject();
				}
				
				if (items.length === 0) {
					return reject();
				}
				
				items.forEach(item => {
					const version = path.basename(item.key).split('.')[0];
					
					if (version < 17) {
						return;
					}
					
					javaHomes.push(this.getPath(item));
				});
				
				Promise.allSettled(javaHomes).then((results) => {
					results.forEach((result) => {
						if (result.status === 'fulfilled') {
							resolve(result.value);
						}
					});
					
					reject();
				});
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
	}
	
	checkJavaVersion(minecraft)
	{
		if (minecraft.versionCompare('1.16.5', '<='))
		{
			return this.getJavaV1().then((javaPath) => {
				minecraft.java(javaPath);
			}).catch(() => {
				this.showMessage(`当前我的世界版本需要java8才可以运行，是否打开 ${this.javaUrlV1} 地址进行下载？`, this.javaUrlV1);
				throw('');
			});
		}
		else
		{
			return this.getJavaV2().then((javaPath) => {
				minecraft.java(javaPath);
			}).catch(() => {
				this.showMessage(`当前我的世界版本需要java17或更高才可以运行，是否打开 ${this.javaUrlV2} 地址进行下载？`, this.javaUrlV2);
				throw('');
			});
		}
	}
}