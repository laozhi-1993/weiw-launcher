const path = require('path');
const fs   = require('fs');


module.exports = class
{
    constructor(version, rootDir)
	{
        this.version    = version;
        this.rootDir    = rootDir;
		this.classPaths = [];
		this.natives    = [];
		
        this.userName    = 'laozhi';
        this.uuid        = 'be2c077954673b69865a1633750d0eaa';
        this.accessToken = 'be2c077954673b69865a1633750d0eaa';
		
		
		this.authUrl    = null;
		this.authPath   = null;
		this.mainClass  = null;
		this.assetIndex = null;
		this.arguments  = {'game': [], 'jvm': []};
		this.java       = 'java';
		
		
		this.librariesDir    = path.join(rootDir, 'libraries');
		this.assetsDir       = path.join(rootDir, 'assets');
		this.versionDir      = path.join(rootDir, 'versions', this.version);
		this.nativesDir      = path.join(rootDir, 'versions', this.version, 'natives-windows-x86_64');
		this.versionJarPath  = path.join(rootDir, 'versions', this.version, `${this.version}.jar`);
		this.versionJsonPath = path.join(rootDir, 'versions', this.version, `${this.version}.json`);
	}
	
	static parseVersion(versionString) {
		const basename = path.basename(versionString).toLowerCase();
		const parts = basename.split('-');
		
		if (parts[0] && parts[1] && parts[2]) {
			return {
				versionString: versionString,
				version: parts[1],
				loaderType: parts[0],
				loaderVersion: parts[2],
			};
		}
		
		return {
			versionString: versionString,
			version: versionString,
			loaderType: null,
			loaderVersion: null,
		};
	}
	
	isActionAllowed(rules, osName)
	{
		let allowed = false;
		
		for (const rule of rules)
		{
			if (rule.os)
			{
				if (rule.os.name === osName)
				{
					if (rule.action === "allow")    return true;
					if (rule.action === "disallow") return false;
				}
				
				continue;
			}
			
			if (rule.action === "allow")
			{
				allowed = true;
				continue;
			}
			
			if (rule.action === "disallow")
			{
				allowed = false;
				continue;
			}
		}
		
		return allowed;
	}
	
	versionCompare(version, operator = '==')
	{
		// 辅助函数：将版本号字符串解析为数组，每部分转换为数字
		const parseVersion = (version) => {
			return version.split('.').map((v) => parseInt(v, 10) || 0);
		};

		const v1Parts = parseVersion(this.version);
		const v2Parts = parseVersion(version);

		const maxLength = Math.max(v1Parts.length, v2Parts.length);

		for (let i = 0; i < maxLength; i++) {
			const part1 = v1Parts[i] || 0;
			const part2 = v2Parts[i] || 0;

			if (part1 > part2) {
				return operator === '>' || operator === '>=' || operator === '!=';
			}

			if (part1 < part2) {
				return operator === '<' || operator === '<=' || operator === '!=';
			}
		}

		// 如果所有部分都相等，版本号相等
		if (operator === '==' || operator === '<=' || operator === '>=') {
			return true;
		}

		if (operator === '!=' || operator === '<' || operator === '>') {
			return false;
		}

		throw new Error(`无效的操作符: ${operator}`);
	}
	
	generateJarPath(name, filename)
	{
		const [firstElement, ...otherElements] = name.split(':');
		const pathArray = firstElement.split('.');
		
		pathArray.push(otherElements[0]);
		pathArray.push(otherElements[1]);
		pathArray.push(filename || otherElements.join('-')+'.jar');
		
		
		return pathArray.join('/');
	}
	
	resolvePath(dir, ...subPaths) {
		if (subPaths.length === 0) {
			return dir;
		}
		
		return path.join(dir, ...subPaths);
	}
	
	classPathsToString() {
		return this.classPaths.concat(this.versionJarPath).join('${classpath_separator}');
	}
	
	setClassPath(classPath) {
		const classPathDir     = path.dirname (path.dirname(classPath));
		const classPathVersion = path.basename(path.dirname(classPath));

		// 提前检查 classPath 是否已经存在于 this.classPaths 中
		if (this.classPaths.includes(classPath)) {
			return;
		}

		for (let index = 0; index < this.classPaths.length; index++) {
			const value = this.classPaths[index];
			const classPathsDir = path.dirname(path.dirname(value));
			const classPathsVersion = path.basename(path.dirname(value));

			// 只需比较目录和版本，如果目录相同且版本不同，更新路径
			if (classPathsDir === classPathDir && classPathVersion !== classPathsVersion) {
				this.classPaths[index] = classPath;
				return; // 更新完毕后直接退出
			}
		}

		// 如果没有找到合适的路径，直接添加 classPath
		this.classPaths.push(classPath);
	}
	
	setNative(native) {
		this.natives.push(native);
	}
	
	setArguments(args) {
		if (args) {
			if (typeof args === 'string') {
				this.arguments = args;
			} else {
				args.game && this.arguments.game.push(...args.game);
				args.jvm && this.arguments.jvm.push(...args.jvm);
			}
		}
	}
	
	setClassPaths(classPaths) {
		this.classPaths = classPaths;
	}
	
	setMainClass(mainClass) {
		this.mainClass = mainClass;
	}
	
	setVersionJson(versionJson) {
		this.versionJson = versionJson;
	}
	
	setAssetsJson(assetsJson) {
		this.assetsJson = assetsJson;
	}
	
	setAssetIndex(assetIndex) {
		this.assetIndex = assetIndex;
	}
	
	setJava(java) {
		this.java = java;
	}
	
	setUserName(userName) {
		this.userName = userName;
	}
	
	setUuid(uuid) {
		this.uuid = uuid;
	}
	
	setAccessToken(accessToken) {
		this.accessToken = accessToken;
	}
	
	setAuthUrl(authUrl) {
		this.authUrl = authUrl;
	}
	
	setAuthPath(authPath) {
		this.authPath = authPath;
	}
	
	
	getSeparator()   { return ';'              }
	getUserName()    { return this.userName    }
	getUuid()        { return this.uuid        }
	getAccessToken() { return this.accessToken }
	getJava()        { return this.java        }
	getVersion()     { return this.version     }
	getClassPaths()  { return this.classPaths  }
	getNatives()     { return this.natives     }
	getMainClass()   { return this.mainClass   }
	getArguments()   { return this.arguments   }
	getAssetIndex()  { return this.assetIndex  }
	
	getVersionJarPath()  { return this.versionJarPath  }
	getVersionJsonPath() { return this.versionJsonPath }
	
	getAuthUrl()  { return this.authUrl  }
	getAuthPath() { return this.authPath }
	
	getRootDir()      { return this.resolvePath(this.rootDir,      ...arguments) }
	getLibrariesDir() { return this.resolvePath(this.librariesDir, ...arguments) }
	getAssetsDir()    { return this.resolvePath(this.assetsDir,    ...arguments) }
	getVersionDir()   { return this.resolvePath(this.versionDir,   ...arguments) }
	getNativesDir()   { return this.resolvePath(this.nativesDir,   ...arguments) }
}