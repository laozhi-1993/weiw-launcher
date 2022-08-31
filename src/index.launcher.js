const {spawn,execFile} = require("child_process");
const https            = require('https');
const fs               = require('fs');


module.exports = class
{
    constructor(root,java,versions,xmn,xmx)
    {
        this.root          = root;
        this.java          = java;
        this.versions      = versions;
        this.versions_jar  = `${root}\\.minecraft\\versions\\${versions}\\${versions}.jar`;
        this.versions_json = `${root}\\.minecraft\\versions\\${versions}\\${versions}.json`;
        this.cmd           = `-Xmn${xmn}m -Xmx${xmx}m`;
        this.cmd           += ' -XX:+UnlockExperimentalVMOptions';
        this.cmd           += ' -XX:G1NewSizePercent=20';
        this.cmd           += ' -XX:G1ReservePercent=20';
        this.cmd           += ' -XX:MaxGCPauseMillis=50';
        this.cmd           += ' -XX:G1HeapRegionSize=16m';
        this.cmd           += ' -XX:+UseG1GC';
        this.cmd           += ' -XX:-UseAdaptiveSizePolicy';
        this.cmd           += ' -XX:-OmitStackTraceInFastThrow';
        this.cmd           += ' -XX:-DontCompileHugeMethods';
        this.json          = JSON.parse(fs.readFileSync(this.versions_json,'utf-8'));


        this.username         = 'laozhi';
        this.uuid             = 'be2c077954673b69865a1633750d0eaa';
        this.token            = 'be2c077954673b69865a1633750d0eaa';
        this.width            = '854';
        this.height           = '480';
        this.launcher_name    = 'weiw-Launcher';
        this.launcher_version = '1.0.0';
        this.fullscreen       = false;
        this.server           = '';
        this.port             = '';
        this.auth_route       = '';
        this.auth_url         = '';


        this.auth = function (route,url,prefetched)
        {
            this.cmd += ' -javaagent:${root}\\'+route+'='+url;
            this.cmd += ' -Dauthlibinjector.yggdrasil.prefetched='+Buffer.from(prefetched).toString('base64');
        }
    
        this.game = function ()
        {
            if(typeof this.json['minecraftArguments'] != 'undefined')
            {
                this.cmd += ' -Djava.library.path=${natives_directory}';
                this.cmd += ' -Dminecraft.launcher.brand=${launcher_name}';
                this.cmd += ' -Dminecraft.launcher.version=${launcher_version}';
                this.cmd += ' -cp ${classpath}';
                this.cmd += ' '+this.json['mainClass'];
                this.cmd += ' '+this.json['minecraftArguments'];
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
                        this.cmd += ' '+value;
                    }
                }
        
                this.cmd += ' '+this.json['mainClass'];
            }
    
            if(typeof this.json['arguments'] != 'undefined' && typeof this.json['arguments']['game'] != 'undefined')
            {
                for(var value of this.json['arguments']['game'])
                {
                    if(typeof value != 'object')
                    {
                        this.cmd += ' '+value;
                    }
                }
            }
    
            this.cmd += ' --width';
            this.cmd += ' ${resolution_width}';
            this.cmd += ' --height';
            this.cmd += ' ${resolution_height}';

            if(this.fullscreen)
            {
                this.cmd += ' --fullscreen';
            }

            if(this.server != "" && this.port != "")
            {
                this.cmd += ' --server';
                this.cmd += ' '+this.server;
                this.cmd += ' --port';
                this.cmd += ' '+this.port;
            }
        }

        this.libraries = function (library_directory,classpath_separator)
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
    }

    start(output,success,exit)
    {
        var thiss = this;
        var th = {};
        th['auth_player_name']    = this.username;                                                                 //玩家名字
        th['auth_uuid']           = this.uuid;                                                                     //玩家UUID
        th['auth_access_token']   = this.token;                                                                    //玩家令牌
        th['auth_session']        = this.token;                                                                    //玩家令牌
        th['root']                = this.root;                                                                     //根目录
        th['game_directory']      = this.root+'\\.minecraft';                                                      //游戏目录
        th['assets_root']         = this.root+'\\.minecraft\\assets';                                              //游戏资源目录
        th['version_name']        = this.versions;                                                                 //游戏版本
        th['assets_index_name']   = this.json['assetIndex']['id'];                                                 //游戏资源版本
        th['user_properties']     = '{}';                                                                          //用户属性
        th['user_type']           = 'mojang';                                                                      //用户类型
        th['version_type']        = this.launcher_name;                                                            //启动器名称
        th['resolution_width']    = this.width;                                                                    //游戏窗口宽度
        th['resolution_height']   = this.height;                                                                   //游戏窗口高度
        th['natives_directory']   = this.root+'\\.minecraft\\versions\\'+this.versions+'\\natives-windows-x86_64'; //natives目录路径
        th['library_directory']   = this.root+'\\.minecraft\\libraries';                                           //library目录路径
        th['launcher_name']       = this.launcher_name;                                                            //启动器名字
        th['launcher_version']    = this.launcher_version;                                                         //启动器版本号
        th['classpath_separator'] = ';';                                                                           //游戏依赖库分隔符
        th['classpath']           = this.libraries(th['library_directory'],th['classpath_separator']);             //游戏依赖库
        th['primary_jar_name']    = this.versions+'.jar';                                                          //主程序名


        https.get(thiss.auth_url, function (res){
            let rawData = "";
            res.on("data", (chunk) => {
                rawData += chunk;
            });
            res.on("end", () => {
                thiss.auth(thiss.auth_route,thiss.auth_url,rawData);
                thiss.game();
                
                var str = JSON.stringify(thiss.cmd.split(' '));
                for(var key in th)
                {
                    th[key] = th[key].replace(/\\/g,'\\\\');
                    th[key] = th[key].replace(/"/g,'\\"');
                    str = str.replace(new RegExp('\\${'+key+'}','g'),th[key]);
                }
                
                
                const c = spawn(thiss.java,JSON.parse(str));
                c.stdout.on('data', function (data) {
                    if(success && data.toString().indexOf("Setting user:") != -1)
                    {
                        success();
                    }
                    if(output) output('STDOUT',data.toString());
                });
                c.stderr.on('data', function (data) {
                    if(output) output('ERROR',data.toString());
                });
                c.on('exit', function (exitCode) {
                    if(exit) exit(exitCode);
                });
            });
        }).on('error', function (e){
            if(output) output('ERROR',e.message);
        });
    }
}