const path = require('path');
const fs   = require('fs');

const Fabric    = load('extension-fabric');
const NeoForge  = load('extension-neoForge');
const Forge     = load('extension-forge');
const Forge1121 = load('extension-forge-1.12.1');
const { downloadFiles, downloadFile } = load('taskManager');


module.exports = class
{
    constructor( minecraft )
	{
		this.assets      = [];
		this.libraries   = [];
		this.minecraft   = minecraft;
		
		this.ensureConfigExists();
	}
	
	getLibraries()
	{
		for(const librarie of this.versionJson.libraries)
		{
			if (librarie.downloads && (librarie.downloads.classifiers || librarie.downloads.artifact))
			{
				const classifiers = librarie.downloads.classifiers;
				const artifact    = librarie.downloads.artifact;
				
				
				if (classifiers)
				{
					const os = [
						'natives-windows',
						'natives-windows-64'
					];
					
					for (const classifier of os)
					{
						const native = classifiers[classifier];
						
						if (native)
						{
							this.libraries.push({
								'url': native.url,
								'path': this.minecraft.getLibrariesDir(native.path)
							});
							
							this.minecraft.setNative(this.minecraft.getLibrariesDir(native.path));
						}
					}
				}
				else
				{
					if(!librarie.rules || this.minecraft.isActionAllowed(librarie.rules, 'windows'))
					{
						this.libraries.push({
							'url': artifact.url,
							'path': this.minecraft.getLibrariesDir(artifact.path)
						});
						
						this.minecraft.setClassPath(this.minecraft.getLibrariesDir(artifact.path));
					}
				}
			}
			else
			{
				if(librarie.name) {
					this.minecraft.setClassPath(this.minecraft.getLibrariesDir(this.minecraft.generateJarPath(librarie.name)));
				}
			}
		}
	}

	getAssets()
	{
		for (const { hash } of Object.values(this.assetsJson.objects))
		{
			const hashPrefix = hash.slice(0, 2);
			const url  = `https://resources.download.minecraft.net/${hashPrefix}/${hash}`;
			const path = `${this.minecraft.getAssetsDir()}/objects/${hashPrefix}/${hash}`;
			
			
			this.assets.push({
				'url': url,
				'path': path
			});
		}
	}
	
	getAssetsUrl()
	{
		return this.versionJson.assetIndex.url;
	}
	
	getAssetsPath()
	{
		return this.minecraft.getAssetsDir('indexes', `${this.versionJson.assetIndex.id}.json`);
	}
	
	
	ensureConfigExists()
	{
		const optionsPath          = this.minecraft.getRootDir('options.txt');
		const launcherProfilesPath = this.minecraft.getRootDir('launcher_profiles.json');


		const writeFileIfNotExists = (filePath, content) => {
			if (!fs.existsSync(filePath)) {
				fs.writeFileSync(filePath, content);
			}
		};

		if(!fs.existsSync(this.minecraft.getRootDir())) {
			fs.mkdirSync(this.minecraft.getRootDir(), { recursive: true });
		}
		
		writeFileIfNotExists(optionsPath, 'lang:zh_CN');
		writeFileIfNotExists(launcherProfilesPath, JSON.stringify({
			selectedProfile: "(Default)",
			profiles: {
				"(Default)": { name: "(Default)" }
			},
			clientToken: "88888888-8888-8888-8888-888888888888"
		}));
	}
	
	async extension(taskWindow, extensionType, extensionValue)
	{
		if (extensionType === 'fabric') {
			const fabric = new Fabric(this.minecraft, extensionValue);
			await fabric.setup(taskWindow);
			return;
		}
		
		if (extensionType === 'forge') {
			if (this.minecraft.versionCompare('1.12.2', '>=')) {
				const forge = new Forge(this.minecraft, extensionValue);
				await forge.setup(taskWindow);
			} else {
				const forge = new Forge1121(this.minecraft, extensionValue);
				await forge.setup(taskWindow);
			}
			
			return;
		}
		
		if (extensionType === 'neoforge') {
			const neoForge = new NeoForge(this.minecraft, extensionValue);
			await neoForge.setup(taskWindow);
			return;
		}
	}
	
	
	async setup(taskWindow)
	{
		if (!fs.existsSync(this.minecraft.getVersionJsonPath()))
		{
			let versionList;
			let version;
			
			await downloadFile(taskWindow, 'https://launchermeta.mojang.com/mc/game/version_manifest.json', '获取版本清单', '获取版本清单失败', async (f) => {
				versionList = f.dataToJson();
				version = versionList.versions.find(v => v.id === this.minecraft.getVersion());
			});
			
			if (version)
			{
				await downloadFile(taskWindow, version.url, '获取版本元数据', '获取版本元数据失败', f => f.saveToFile(this.minecraft.getVersionJsonPath()));
			}
			else throw('未找到指定版本的元数据');
		}
		
		this.versionJson = JSON.parse(fs.readFileSync(this.minecraft.getVersionJsonPath(), 'utf8'));
		
		
		if (!fs.existsSync(this.getAssetsPath()))
		{
			await downloadFile(taskWindow, this.getAssetsUrl(), '获取资源清单文件', '获取资源清单文件失败', f => f.saveToFile(this.getAssetsPath()));
		}
		
		this.assetsJson = JSON.parse(fs.readFileSync(this.getAssetsPath(), 'utf8'));
		
		
		if (!fs.existsSync(this.minecraft.getVersionJarPath()))
		{
			await downloadFile(taskWindow, this.versionJson.downloads.client.url, '下载我的世界主程序', '下载我的世界主程序失败', f => f.saveToFile(this.minecraft.getVersionJarPath()));
		}
		
		if (this.versionJson.minecraftArguments) {
			this.minecraft.setAssetIndex(this.versionJson.assetIndex.id);
			this.minecraft.setMainClass (this.versionJson.mainClass);
			this.minecraft.setArguments (this.versionJson.minecraftArguments);
		} else {
			this.minecraft.setAssetIndex(this.versionJson.assetIndex.id);
			this.minecraft.setMainClass (this.versionJson.mainClass);
			this.minecraft.setArguments (this.versionJson.arguments);
		}
		
		
		this.getLibraries();
		this.getAssets();
		
		
		await downloadFiles(taskWindow, this.assets, '下载资源文件');
		await downloadFiles(taskWindow, this.libraries, '下载依赖库');
    }
}