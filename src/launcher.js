const {spawn} = require("child_process");
const https   = require('https');
const http    = require('http');
const fs      = require('fs');


module.exports = class
{
    constructor(root,java,versions,xmn,xmx)
    {
        this.username         = 'laozhi';
        this.uuid             = 'be2c077954673b69865a1633750d0eaa';
        this.token            = 'be2c077954673b69865a1633750d0eaa';
        this.width            = '854';
        this.height           = '480';
        this.launcher_name    = 'weiw-Launcher';
        this.launcher_version = '1.1.0';
        this.fullscreen       = false;
        this.server           = '';
        this.port             = '';
        this.auth_route       = '';
        this.auth_url         = '';
		
		
        this.root          = root;
        this.java          = java;
        this.versions      = versions;
        this.versions_jar  = `${root}\\.minecraft\\versions\\${versions}\\${versions}.jar`;
        this.versions_json = `${root}\\.minecraft\\versions\\${versions}\\${versions}.json`;
        this.json          = JSON.parse(fs.readFileSync(this.versions_json,'utf-8'));
        this.th            = [];
        this.cmd           = [];
		
		
        this.cmd.push(`-Xmn${xmn}m`);
        this.cmd.push(`-Xmx${xmx}m`);
        this.cmd.push('-XX:+UnlockExperimentalVMOptions');
        this.cmd.push('-XX:G1NewSizePercent=20');
        this.cmd.push('-XX:G1ReservePercent=20');
        this.cmd.push('-XX:MaxGCPauseMillis=50');
        this.cmd.push('-XX:G1HeapRegionSize=16m');
        this.cmd.push('-XX:+UseG1GC');
        this.cmd.push('-XX:-UseAdaptiveSizePolicy');
        this.cmd.push('-XX:-OmitStackTraceInFastThrow');
        this.cmd.push('-XX:-DontCompileHugeMethods');
    }
	
	
	auth(route,url,prefetched)
	{
		this.cmd.push('-javaagent:${root}\\'+route+'='+url);
		this.cmd.push('-Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(prefetched).toString('base64'));
	}
	
	game()
	{
		if(typeof this.json['minecraftArguments'] != 'undefined')
		{
			this.cmd.push('-Djava.library.path=${natives_directory}');
			this.cmd.push('-Dminecraft.launcher.brand=${launcher_name}');
			this.cmd.push('-Dminecraft.launcher.version=${launcher_version}');
			this.cmd.push('-cp ${classpath}');
			this.cmd.push(this.json['mainClass']);
			this.cmd.push(this.json['minecraftArguments']);
		}
		else
		{
			for(var value of this.json['arguments']['jvm'])
			{
				if(typeof value == 'object')
				{
					//占位
					
					
					
				}
				else
				{
					this.cmd.push(value);
				}
			}
			
			this.cmd.push(this.json['mainClass']);
		}

		if(typeof this.json['arguments'] != 'undefined' && typeof this.json['arguments']['game'] != 'undefined')
		{
			for(var value of this.json['arguments']['game'])
			{
				if(typeof value != 'object')
				{
					this.cmd.push(value);
				}
			}
		}

		this.cmd.push('--width');
		this.cmd.push('${resolution_width}');
		this.cmd.push('--height');
		this.cmd.push('${resolution_height}');

		if(this.fullscreen)
		{
			this.cmd.push('--fullscreen');
		}

		if(this.server != "" && this.port != "")
		{
			this.cmd.push('--server');
			this.cmd.push(this.server);
			this.cmd.push('--port');
			this.cmd.push(this.port);
		}
	}
	
	libraries(library_directory,classpath_separator)
	{
		var libraries = '';
		for(var value of this.json['libraries'])
		{
			if(typeof value['downloads'] != 'undefined' && typeof value['downloads']['classifiers'] != 'undefined')
			{
				//占位
				
				
				
			}
			else if(typeof value['downloads'] != 'undefined' && typeof value['downloads']['artifact'] != 'undefined')
			{
				if(typeof value['rules'] != 'undefined')
				{
					if(typeof value['downloads']['artifact']['path'] != 'undefined' && typeof value['rules'][0] != 'undefined' && typeof value['rules'][0]['os'] != 'undefined' && typeof value['rules'][0]['os']['name'] != 'undefined' && value['rules'][0]['os']['name'] == 'windows' || typeof value['rules'][1] != 'undefined')
					{
						libraries += library_directory+'\\'+value['downloads']['artifact']['path']+classpath_separator;
					}
				}
				else
				{
					if(typeof value['downloads']['artifact']['path'] != 'undefined')
					{
						libraries += library_directory+'\\'+value['downloads']['artifact']['path']+classpath_separator;
					}
				}
			}
			else
			{
				if(typeof value['name'] != 'undefined')
				{
					var n = value['name'].split(':');
					if(typeof n[3] != 'undefined')
					{
						libraries += library_directory+'\\'+n[0].replace(/\./g,'\\')+'\\'+n[1]+'\\'+n[2]+'\\'+n[1]+'-'+n[2]+'-'+n[3]+'.jar'+classpath_separator;
					}
					else
					{
						libraries += library_directory+'\\'+n[0].replace(/\./g,'\\')+'\\'+n[1]+'\\'+n[2]+'\\'+n[1]+'-'+n[2]+'.jar'+classpath_separator;
					}
				}
			}
		}

		libraries += this.versions_jar;
		return libraries;
	}
	
	
	kill()
	{
		this.process && this.process.kill()
	}
	
    start(output,success,exit)
    {
		const get = function (url)
		{
			let httpClient = url.startsWith('https://') ? https : http;
			let rawData = "";
			
			
			return new Promise((success,error) => {
				httpClient.get( url, (res) => {
					if(res.statusCode == 200)
					{
						res.on("data", (data) => { rawData += data });
						res.on("end", () => { success(rawData) });
					}
					else
					{
						error();
						throw new Error('认证服务器宕机中');
					}
				}).on('error', (e) => {
					error();
					throw new Error(e.message);
				});
			});
		}
		
		
        this.th['auth_player_name']    = this.username;                                                                 //玩家名字
        this.th['auth_uuid']           = this.uuid;                                                                     //玩家UUID
        this.th['auth_access_token']   = this.token;                                                                    //玩家令牌
        this.th['auth_session']        = this.token;                                                                    //玩家令牌
        this.th['root']                = this.root;                                                                     //根目录
        this.th['game_directory']      = this.root+'\\.minecraft';                                                      //游戏目录
        this.th['assets_root']         = this.root+'\\.minecraft\\assets';                                              //游戏资源目录
        this.th['version_name']        = this.versions;                                                                 //游戏版本
        this.th['assets_index_name']   = this.json['assetIndex']['id'];                                                 //游戏资源版本
        this.th['user_properties']     = '{}';                                                                          //用户属性
        this.th['user_type']           = 'mojang';                                                                      //用户类型
        this.th['version_type']        = this.launcher_name;                                                            //启动器名称
        this.th['resolution_width']    = this.width;                                                                    //游戏窗口宽度
        this.th['resolution_height']   = this.height;                                                                   //游戏窗口高度
        this.th['natives_directory']   = this.root+'\\.minecraft\\versions\\'+this.versions+'\\natives-windows-x86_64'; //natives目录路径
        this.th['library_directory']   = this.root+'\\.minecraft\\libraries';                                           //library目录路径
        this.th['launcher_name']       = this.launcher_name;                                                            //启动器名字
        this.th['launcher_version']    = this.launcher_version;                                                         //启动器版本号
        this.th['classpath_separator'] = ';';                                                                           //游戏依赖库分隔符
        this.th['classpath']           = this.libraries(this.th['library_directory'],this.th['classpath_separator']);   //游戏依赖库
        this.th['primary_jar_name']    = this.versions+'.jar';                                                          //主程序名
		
		
		get(this.auth_url).catch(exit).then((data) => {
			this.auth(this.auth_route,this.auth_url,data);
			this.game();
			
			
			
			this.process = spawn(this.java,this.cmd.map((value) => {
				return value.replace(/\${([a-zA-Z_]+)}/g,(match, key) => {
					return this.th[key] || match;
				});
			}));
			this.process.stdout.on('data', (data) => {
				if(data.toString().indexOf("Setting user:") != -1)
				{
					success();
				}
				
				output(data.toString());
			});
			this.process.stderr.on('data', (data) => {
				output('ERROR: '+data.toString());
			});
			this.process.on('exit', exit);
		});
    }
}