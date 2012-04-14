/* Author: Abhishek Munie */
;
window.jQuery||document.write("\x3Cscript src='https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js'\x3e\x3C/script\x3e");
$('html').addClass(RegExp(" AppleWebKit/").test(navigator.userAgent)?'applewebkit':'not-applewebkit');
var config=$.extend(true,{
    urls:{
        resource:location.protocol+'//'+location.hostname+'/',
        workers:{
            ajax:"/js/modules/ajaxloader.worker.js",
            jsonp:"/js/modules/jsonploader.worker.js"
        }
    },
    preloads:[],
    twitter_streams:[],
    flickr_photostreams:[],
    facebookAppId:'',
    googleAnalyticsID:'',
    addThisID:'',
    enable:{
        facebook:true,
        twitter:true,
        google_plus:true,
        google_translate:true,
        google_search:true,
        flickr:true,
        addthis:true,
        cufon:true
    }
},window.config);

// usage: log('inside coolFunc', this, arguments);
window.log=function f(){
    log.history = log.history || [];
    log.history.push(arguments);
    if(this.console) {
        var args = arguments, newarr;
        args.callee = args.callee.caller;
        newarr = [].slice.call(args);
        if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);
    }
};
(function(a){
    function b(){}
    for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){
        a[d]=a[d]||b;
    }
})(function(){
    try{
        console.log();
        return window.console;
    }catch(a){
        return (window.console={});
    }
}());

var qualifyURL=function(url){
    var div=document.createElement('div');
    div.innerHTML="<a></a>";
    div.firstChild.href=url;//Ensures that the href is properly escaped
    div.innerHTML=div.innerHTML;//Run the current innerHTML back through the parser
    return div.firstChild.href;
};
var getLevels=function(url){
    var Levels=url.toString().split('/');
    for(var i=0;i<Levels.length;i++)
        if(!Levels[i])Levels.splice(i--,1);
    return Levels;
};
function Location(location){
    location=location||window.location;
    this.href=location.href;
    this.url=location.href.replace(location.hash,"");
    this.hash=location.hash;
    this.pageChangeLevel=undefined;
    this.params={
        serviceMode:(location.hash=="#?test=true")
    };
    var HASH=this.hash;
    if(HASH){
        var off1=HASH.indexOf('!');
        var off2=HASH.indexOf('?');
        if(off2>=0){
            var p=HASH.slice(off2+1).split(/&amp;|&/g);
            var params=[];
            var param;
            for(var i in p){
                param=p[i].split('=');
                try{
                    param[1]=JSON.parse(param[1]);
                }catch(e){}
                params[param[0]]=param[1];
            }
            $.extend(this.params,params);
            this.hash=HASH.slice(0,off2-1);
            if(off1>=0){
                this.url=HASH.slice(off1+1,off2-1);
                this.hash=HASH.slice(0,off1-1);
            }
        }else if(off1>=0){
            this.url=mySite.qualifyURL(HASH.slice(off1+1));
            this.hash=HASH.slice(0,off1-1);
        }
    }
    this.Levels=getLevels(this.url);
    this.pageLevel=(this.Levels.length-2||1);
    this.is404=false;
}

var mySite=$.extend(true,{
    domain:location.protocol+'//'+location.hostname+'/',
    resource:config.urls.resource,
    qualifyURL:qualifyURL,
    getLevels:getLevels,
    /* Internal: Parse URL components and returns a Locationish object.
     * url - String URL
     * Returns HTMLAnchorElement that acts like Location.
     */
    parseURL:function(url){
        var a=document.createElement('a');
        a.href=url;
        return a;
    },
    checkString:function(str){
        try{
            str=JSON.parse(str);
        }catch(e){}
        return str;
    },
    location:new Location(),
    pre_location:undefined,
    next_location:null,
    calcLevelChange:function(current,previous){
        previous=previous||mySite.pre_location;
        current=current||mySite.location;
        var len=Math.min(current.Levels.length,previous.Levels.length)-1;
        if(len<2)len=2;
        for(current.pageChangeLevel=1;current.pageChangeLevel<len;current.pageChangeLevel++)
            if(current.Levels[current.pageChangeLevel+1]!=previous.Levels[current.pageChangeLevel+1])
                break;
    },
    ajaxPageLoader:null,
    ajaxTo:null,
    twitter_streams:{},
    flickr_photostreams:{},
    sky:{
        stars:[],
        snow:[],
        starsWorker:undefined,
        snowWorker:undefined
    },
    fireEvent:function(eType,eParams,eExtraParams){
        var e=jQuery.Event(eType,eParams);
        $(document).trigger(e,eExtraParams);
        return e.isDefaultPrevented();
    },
    user:{
        facebook:undefined,
        twitter:undefined
    },
    overlayTheater:{
        theater:$('<aside id="overlayTheaterBack" class="overlayTheaterBack" onclick="mySite.overlayTheater.close()"></aside>'+
            '<aside id="overlayTheater" class="overlayTheater">'+
            '<img class="LoadingImg" src="/img/icons/loading.png" alt="Loading..."/>'+
            '<div class="info"><div id="msg"></div></div>'+
            '<div class="warning"><div id="msg"></div></div>'+
            '<div class="error"><div id="msg"></div></div>'+
            '<div class="learnmore"><div id="msg"></div></div>'+
            '</div>'+
            '</aside>'),
        info:function(msg){
            $('html').addClass('info');
            $('.info .msg').html(msg);
        },
        warning:function(msg){
            $('html').addClass('warning');
            $('.warning .msg').html(msg);
        },
        error:function(msg){
            $('html').addClass('error');
            $('.error .msg').html(msg);
        },
        close:function(){
            $('html').removeClass('loading info warning error');
        }
    },
    // ----------------------------------------------------------
    // If you're not in IE (or IE version is less than 5) then:
    //     ie === undefined
    // If you're in IE (>5) then you can determine which version:
    //     ie === 7; // IE7
    // Thus, to detect IE:
    //     if (ie) {}
    // And to detect the version:
    //     ie === 6 // IE6
    //     ie > 7 // IE8, IE9 ...
    //     ie < 9 // Anything less than IE9
    // ----------------------------------------------------------
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    ieVersion:(function(){
        var undef,v=3,div=document.createElement('div');
        while(
            div.innerHTML='<!--[if gt IE '+(++v)+']><i></i><![endif]-->',
            div.getElementsByTagName('i')[0]
            );
        return v>4?v:undef;
    }()),
    getVisibilityState:function(){
        return document.visibilityState||document.webkitVisibilityState||document.msVisibilityState;
    },
    applyAcrossBrowser:function(fn){
        var browsers=["","webkit","moz","o","ms"];
        for(var len=browsers.length;len;)
            fn(browsers[--len]);
    },
    cloneObject:function(o){
        var newObj=(o instanceof Array)?[]:{};
        for(var i in o){
            if(o[i] && typeof 0[i]=="object") {
                newObj[i]=cloneThis(o[i]);
            }else newObj[i]=o[i];
        }
        return newObj;
    },
    // remove all own properties on obj, effectively reverting it to a new object
    wipeObject:function(obj){
        for(var p in obj)
            if(obj.hasOwnProperty(p))
                delete obj[p];
    },
    /*loadScript:function (url){
        var req=new XMLHttpRequest();
        req.onreadystatechange=function(e){
            if(req.readyState===4){//4=Loaded
                if(req.status===200){
                    eval(req.responseText);
                }else{
                //Error
                }
            }
        }
        req.open("GET", url, true);
        req.send();
    },*/
    relative_time:function(time_value){
        var values=time_value.split(" ");
        time_value=values[1]+" "+values[2]+", "+values[5]+" "+values[3];
        var parsed_date=Date.parse(time_value);
        var relative_to=(arguments.length>1)?arguments[1]:new Date();
        var delta=parseInt((relative_to.getTime()-parsed_date)/1000);
        delta=delta+(relative_to.getTimezoneOffset()*60);
        var r='';
        if(delta<60){
            r='a minute ago';
        }else if(delta<120){
            r='couple of minutes ago';
        }else if(delta<(45*60)){
            r=(parseInt(delta/60)).toString()+' minutes ago';
        }else if(delta<(90*60)){
            r='an hour ago';
        }else if(delta<(24*60*60)){
            r=''+(parseInt(delta/3600)).toString()+' hours ago';
        }else if(delta<(48*60*60)){
            r='1 day ago';
        }else{
            r=(parseInt(delta/86400)).toString()+' days ago';
        }
        return r;
    }
},window.mySite);

mySite.location.is404=!!$('.container404')[0];
if(mySite.location.params.serviceMode)$('html').addClass('serviceMode');
//navigator.registerProtocolHandler("abhishekmunie","http://abhishekmunie.com/","abhishekmunie Protocol");

if(config.enable.facebook){
    window.fbAsyncInit=function(){
        FB.init({
            appId     :config.facebookAppId, // App ID
            channelUrl:'http//'+document.domain+'/channel.html', // Channel File
            status    :true, // check login status
            cookie    :true, // enable cookies to allow the server to access the session
            xfbml     :!!mySite.enhanced,// parse XFBML
            oauth     :true,
            frictionlessRequests:true
        });

        $.fn.FBWelcome=function(o){
            o=$.extend({},o);
            return this.each(function(){
                if((mySite.user.facebook.currentUser)!=null)this.innerHTML=(/undefined/i.test(mySite.user.facebook.currentUser.name))?'Welcome, Guest':'Welcome, <img id="FBImage" class="fb_profile_image" src="https://graph.facebook.com/'+mySite.user.facebook.currentUser.id+'/picture"/> '+mySite.user.facebook.currentUser.name;
            });
        };
        // Additional initialization code here
        mySite.user.facebook={
            setCurrentUser:function(){
                FB.api('/me',function(user){
                    mySite.user.facebook.currentUser=user;
                });
            },
            getLoginStatus:function(){
                FB.getLoginStatus(function(response) {
                    if (response.status === 'connected') {
                        // the user is logged in and has authenticated your
                        // app, and response.authResponse supplies
                        // the user's ID, a valid access token, a signed
                        // request, and the time the access token 
                        // and signed request each expire
                        var uid = response.authResponse.userID;
                        var accessToken = response.authResponse.accessToken;
                    } else if (response.status === 'not_authorized') {
                    // the user is logged in to Facebook, 
                    // but has not authenticated your app
                    } else {
                    // the user isn't logged in to Facebook.
                    }
                });
            },
            getUpdateLoginStatus:function(){
                FB.getLoginStatus(function(response) {
                    if (response.status === 'connected') {
                        // the user is logged in and has authenticated your
                        // app, and response.authResponse supplies
                        // the user's ID, a valid access token, a signed
                        // request, and the time the access token 
                        // and signed request each expire
                        var uid = response.authResponse.userID;
                        var accessToken = response.authResponse.accessToken;
                    } else if (response.status === 'not_authorized') {
                    // the user is logged in to Facebook, 
                    // but has not authenticated your app
                    } else {
                    // the user isn't logged in to Facebook.
                    }
                },true);
            },
            login:function(callback,scope){
                FB.login(callback,{
                    scope:scope
                });
            },
            logout:function(callback){
                FB.logout(callback);
            },
            // run once with current status and whenever the status changes
            update:function(response){
                if (response.authResponse) {
                    //user is already logged in and connected
                    console.log('Welcome!  Fetching your information.... ');
                    FB.api('/me', function(response) {
                        mySite.user.facebook.currentUser=response;
                        console.log('Good to see you, '+response.name+'.');
                    });
                } else {
                    //user is not connected to your app or logged out
                    console.log('User cancelled login || did not fully authorize || logged out.');
                    mySite.user.facebook.currentUser=undefined;
                }
                mySite.user.facebook.refresh();
            },
            refresh:function(){
                $('.FBWelcome').FBWelcome();
            },
            publishPost:function(msg){
                FB.api('/me/feed','post',{
                    message:msg
                },function(response){
                    if(!response||response.error){
                        alert('Error occured');
                    }else{
                        alert('Post ID: '+response.id);
                    }
                });
            },
            deletePost:function(postId){
                FB.api(postId,'delete',function(response){
                    if(!response||response.error){
                        alert('Error occured');
                    }else{
                        alert('Post was deleted');
                    }
                });
            },
            getPost:function(n){
                FB.api('/me/posts',{
                    limit: n
                },function(response){
                    for (var i=0,l=response.length;i<l;i++){
                        var post=response[i];
                        if(post.message){
                            alert('Message: '+post.message);
                        }else if(post.attachment&&post.attachment.name){
                            alert('Attachment: '+post.attachment.name);
                        }
                    }
                });
            },
            post:function(o){
                FB.ui(
                    $.extend({
                        method: 'feed',
                        name: mySite.domain,
                        link: mySite.location.url,
                        picture: '',
                        caption: ".",
                        description: 'Dialogs provide a simple, consistent interface for applications to interface with users.',
                        message: "I like this Website!"
                    },o),
                    function(response){
                        if (response&&response.post_id) {
                            alert('Post was published.');
                        } else {
                            alert('Post was not published.');
                        }
                    }
                    );
            },
            /*canvas methods*/
            sendRequestViaMultiFriendSelector:function(){
                FB.ui({
                    method:'apprequests',
                    message:'Use this app to get personalized experience on '+mySite.domain
                },requestCallback);
            },
            sendRequestToRecipients:function(ids,requestCallback){
                FB.ui({
                    method:'apprequests',
                    message:'Use this app to get personalized experience on '+mySite.domain,
                    to:ids
                },requestCallback);
            }
        };

        // run once with current status and whenever the status changes
        FB.getLoginStatus(mySite.user.facebook.update);
        FB.Event.subscribe('auth.statusChange',mySite.user.facebook.update);
        FB.Event.subscribe('auth.login',function(response){});
        FB.Event.subscribe('auth.logout',function(response){});
    };
    // Load the SDK Asynchronously
    if(!document.getElementById('facebook-jssdk'))insertScript("//connect.facebook.net/en_US/all.js#appId="+config.facebookAppId,false,'facebook-jssdk');
}

if(config.enable.google_plus){
    window.___gcfg.parsetags='explicit';
    insertScript('https://apis.google.com/js/plusone.js');
}

if(config.enable.twitter){
    window.twttr=(function(d,s,id){
        var t,js,fjs=d.getElementsByTagName(s)[0];
        if(d.getElementById(id))return;
        js=d.createElement(s);
        js.id=id;
        js.src="//platform.twitter.com/widgets.js";
        js.async=true;
        fjs.parentNode.insertBefore(js, fjs);
        return window.twttr||(t={
            _e:[],
            ready:function(f){
                t._e.push(f);
            }
        });
    }(document,"script","twitter-wjs"));
    // Define our custom Twitter event hanlders
    function clickEventToAnalytics(intent_event){
        if(intent_event){
            var label=intent_event.region;
            _gaq.push(['_trackEvent','twitter_web_intents',intent_event.type,label]);
        }
    }
    function tweetIntentToAnalytics(intent_event){
        if(intent_event){
            var label="tweet";
            _gaq.push(['_trackEvent','twitter_web_intents',intent_event.type,label]);
        }
    }
    function favIntentToAnalytics(intent_event){
        tweetIntentToAnalytics(intent_event);
    }
    function retweetIntentToAnalytics(intent_event){
        if(intent_event){
            var label=intent_event.data.source_tweet_id;
            _gaq.push(['_trackEvent','twitter_web_intents',intent_event.type,label]);
        }
    }
    function followIntentToAnalytics(intent_event){
        if(intent_event){
            var label=intent_event.data.user_id+" ("+intent_event.data.screen_name+")";
            _gaq.push(['_trackEvent','twitter_web_intents',intent_event.type,label]);
        }
    }
    // Wait for the asynchronous resources to load
    twttr.ready(function(twttr){
        mySite.user.twitter={
            logout:function(){
            //twttr.anywhere.signOut();
            },
            refresh:function(){
                /*$("#twitter-connect-placeholder").html("");
                 if(mySite.user.twitter.currentUser){
                 $("#twitter-connect-placeholder").append("Logged in as " + "<img src='" + mySite.user.twitter.currentUser.data('profile_image_url') + "'/>" + " " + mySite.user.twitter.currentUser.data('screen_name') +'<button type="button" class="btn" onclick=" mySite.user.twitter.logout();">Sign out of Twitter</button>');
                 }else{
                 mySite.user.twitter.T("#twitter-connect-placeholder").connectButton();
                 };*/
                twttr.widgets.load();
            }
        };
        /*twttr.anywhere(function(T){
         mySite.user.twitter.T=T;
         T.hovercards();
         mySite.user.twitter.isConnected=function(){
         return T.isConnected();
         }
         mySite.user.twitter.setCurrentUser=function(){
         if(T.isConnected())mySite.user.twitter.currentUser=T.currentUser;
         else mySite.user.twitter.currentUser=null;
         }
         mySite.user.twitter.update=function(){
         mySite.user.twitter.setCurrentUser()
         try{
         mySite.user.twitter.refresh();
         }catch(e){}
         }
         T.bind("authComplete", function (e, user) {
         // triggered when auth completed successfully
         mySite.user.twitter.update();
         });
         T.bind("signOut", function (e) {
         // triggered when user logs out
         mySite.user.twitter.update();
         });
         mySite.user.twitter.update();
         });*/
        twttr.events.bind('click',   clickEventToAnalytics);
        twttr.events.bind('tweet',   tweetIntentToAnalytics);
        twttr.events.bind('retweet', retweetIntentToAnalytics);
        twttr.events.bind('favorite',favIntentToAnalytics);
        twttr.events.bind('follow',  followIntentToAnalytics);
    });
}

if(config.enable.addthis)insertScript(('https:'==document.location.protocol?'https:':'http:')+'//s7.addthis.com/js/250/addthis_widget.js#async=1&pubid='+config.addThisID);

/*if(!Object.prototype.cloneThis)Object.prototype.cloneThis=function(){
    var newObj=(this instanceof Array)?[]:{};
    for(i in this){
        if(i=='cloneThis')continue;
        if(this[i] && typeof this[i]=="object"){
            newObj[i]=this[i].cloneThis();
        }else newObj[i]=this[i];
    }
    return newObj;
}
http://ajaxian.com/archives/cor-blimey-cross-domain-ajax-is-really-here
 function createCORSRequest(method,url){
    var xhr=new XMLHttpRequest();
    if("withCredentials" in xhr){
        xhr.open(method,url,true);
    }else if(typeof XDomainRequest != "undefined"){
        xhr=new XDomainRequest();
        xhr.open(method,url);
    }else{
        xhr=null;
    }
    return xhr;
}

var request=createCORSRequest("get","http://abhishekmunie.com/");
if(request){
    request.onload=function(){
        //do something with request.responseText
    };
    request.send();
}*/
//https://gist.github.com/384583 Cross-browser object.watch and object.unwatch
/*/ object.watch
if(!Object.prototype.watch)
    Object.prototype.watch=function(prop,handler){
        var oldval=this[prop],newval=oldval,
        getter=function(){
            return newval;
        },
        setter=function(val){
            oldval=newval;
            return newval=handler.call(this,prop,oldval,val);
        };
        if(delete this[prop]){//can't watch constants
            if(Object.defineProperty)//ECMAScript 5
                Object.defineProperty(this,prop,{
                    get:getter,
                    set:setter,
                    enumerable:false,
                    configurable:true
                });
            else if(Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__){// legacy
                Object.prototype.__defineGetter__.call(this,prop,getter);
                Object.prototype.__defineSetter__.call(this,prop,setter);
            }
        }
    };
// object.unwatch
if (!Object.prototype.unwatch)
    Object.prototype.unwatch=function(prop){
        var val=this[prop];
        delete this[prop];//remove accessors
        this[prop]=val;
    };
 */

/* Inline Worker - http://www.html5rocks.com/en/tutorials/workers/basics/#toc-inlineworkers*/
// Prefixed in Webkit, Chrome 12, and FF6: window.WebKitBlobBuilder, window.MozBlobBuilder
mySite.BlobWorker={};
mySite.BlobWorker.prototype=function(){
    return{
        create:function(workerBody,onmessage){
            if(BlobBuilder){
                var bb=new (window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder)();
                bb.append(workerBody);
                // Obtain a blob URL reference to our worker 'file'.
                // Note: window.webkitURL.createObjectURL() in Chrome 10+.
                var blobURL=(window.URL||window.webkitURL).createObjectURL(bb.getBlob());
                //Blob URLs are unique and last for the lifetime of your application (e.g. until the document is unloaded).
                //If you're creating many Blob URLs, it's a good idea to release references that are no longer needed.
                //You can explicitly release a Blob URLs by passing it to window.URL.revokeObjectURL():
                return new Worker(blobURL);
            }else{
                console.log('BlobBuilder is not supported in the browser!');
                return;
            }
        },
        release:function(blobURL){
            (window.URL||window.webkitURL).revokeObjectURL(blobURL);
        }
    };
} ();

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
(function() {
    var lastTime=0;
    var vendors=['ms','moz','webkit','o'];
    if(!window.requestAnimationFrame)for(var x=0;x<vendors.length&&!window.requestAnimationFrame;++x){
        window.requestAnimationFrame=window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame=window[vendors[x]+'CancelAnimationFrame']||window[vendors[x]+'CancelRequestAnimationFrame'];
    }
    if(!window.requestAnimationFrame)
        window.requestAnimationFrame=function(callback,element){
            var currTime=new Date().getTime();
            var timeToCall=Math.max(0,16-(currTime-lastTime));
            var id=window.setTimeout(function(){
                callback(currTime+timeToCall);
            },timeToCall);
            lastTime=currTime+timeToCall;
            return id;
        };
    if(!window.cancelAnimationFrame)
        window.cancelAnimationFrame=function(id){
            clearTimeout(id);
        };
}());

(function($){
    try{
        function Tweet(data){
            this.id=data.id_str;
            this.data=data;
            this.oEmbedData=undefined;
            this.worker=undefined;
            var THIS=this;
            this.loadOEmbed=function(){
                if(Modernizr.webworkers){
                    this.worker=new Worker(config.urls.workers.jsonp);
                    this.worker.addEventListener('message',function(event){
                        if(event.data.type=="debug"){
                            console.log(JSON.stringify(event.data.data));
                        }else if(event.data.status==200){
                            THIS.oEmbedData=event.data.json;
                        }
                    },false);
                    this.worker.addEventListener('error', function(event){
                        },false);
                    this.worker.postMessage("https://api.twitter.com/1/statuses/oembed.json?id="+data.id_str+"&omit_script=true&callback=?");
                }else{
                    jQuery.ajax({
                        url:"https://api.twitter.com/1/statuses/oembed.json?id="+data.id_str+"&omit_script=true&callback=?",
                        async: true,
                        dataType: 'json',
                        success: function(oEmbedData) {
                            THIS.oEmbedData=oEmbedData;
                        }
                    });
                }
            }
            this.loadOEmbed();
        }
        function Twitter_Stream(username){
            this.username=username;
            this.count=30;
            this.tweets=[];
            this.updateInterval=180000;
            var THIS=this;
            this.loaders={
                update:new SerializedAjaxLoader(
                    function(current,data){

                    },function(responseText,status,data){
                        responseDOM=null;
                        window.setTimeout(THIS.update,THIS.updateInterval);
                    },function(e){}
                    ),
                load:new SerializedAjaxLoader(
                    function(current,data){

                    },function(responseText,status,data){
                        responseDOM=null;
                    },function(e){}
                    )
            }
            this.update=function(){
                $.getJSON("https://twitter.com/status/user_timeline/"+THIS.username+".json?count=9&since_id="+THIS.tweets[0].id+"&callback=?", function(data){
                    $.each(data, function(index, tweet){
                        if(tweet!=THIS.tweets[i].data)
                            THIS.tweets.unshift(new Tweet(tweet));
                    });
                });
            }
            this.load=function(){
                $.getJSON("https://twitter.com/status/user_timeline/"+THIS.username+".json?count=9"+((THIS.tweets.length>0)?"&max_id="+THIS.tweets[THIS.tweets.length-1].id:"")+"&callback=?", function(data){
                    $.each(data, function(index, tweet){
                        THIS.tweets.push(new Tweet(tweet));
                    });
                });
            //THIS.loader.load.loadTo({url:"https://twitter.com/status/user_timeline/"+THIS.username+".json?count=9"+((THIS.tweets.length>0)?"&max_id="+THIS.tweets[THIS.tweets.length-1].id:"")+"&callback=?"})
            }
            this.load();
            window.setTimeout(this.update,this.updateInterval);
        }
        mySite.createTwitterStream=function(username){
            return new Twitter_Stream(username);
        }
    }catch(e){}

    mySite.flickr_photostreams[config.flickr_photostreams[0]]={
        photos:[]
    };
    $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?ids=40168771@N07&lang=en-us&format=json&jsoncallback=?", function(data){
        $.each(data.items,function(index,item){
            mySite.flickr_photostreams[config.flickr_photostreams[0]].photos.push(item);
        });
    });

    /**
     *Chris Coyier
     *http://css-tricks.com*/
    $.fn.flickrGallery=function(o){
        o=$.extend({},o);
        return this.each(function(i,block){
            $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?ids=40168771@N07&lang=en-us&format=json&jsoncallback=?", function(data){
                $.each(data.items, function(index, item){
                    $("<img/>").attr("src", item.media.m).appendTo(block).wrap("<a href='" + item.link + "'></a>");
                });
            });
        });
    };
    /** End Chris Coyier - http://css-tricks.com */

    $.fn.lavaLamp=function(o){
        o=$.extend({},o);
        return this.each(function(){
            var $leftPad=$('<li id="leftPad" class="lavalampback topbar-inner"></li>').appendTo($(this));
            var $hoverPad=$('<li id="hoverPad" class="lavalampback"></li>').appendTo($(this));
            var $rightPad=$('<li id="rightPad" class="lavalampback topbar-inner"></li>').appendTo($(this));
            var THIS=this;
            this.setCurrent=function(el){
                el=el||$("li.selected",THIS);
                if(!el[0])el=$("li:first",THIS)
                $leftPad.css({
                    "left":el.parent()[0].offsetLeft+"px",
                    "width":(el[0].offsetLeft-el.parent()[0].offsetLeft)+"px"
                });
                $hoverPad.css({
                    "left":el[0].offsetLeft+"px",
                    "width":el[0].offsetWidth+"px"
                });
                $rightPad.css({
                    "width":Math.max(0,el.parent()[0].offsetLeft+el.parent()[0].offsetWidth-el[0].offsetLeft-el[0].offsetWidth)+"px",
                    "left":(el[0].offsetLeft+el[0].offsetWidth)+"px"
                });
            }
            $("li>a",this).not(".lavalampback").hover(function(){
                THIS.setCurrent($(this.parentElement));
            },function(){});
            $(this).hover(function(){},function(){
                THIS.setCurrent($("li.selected",this));
            });
            $("li>a",this).not(".lavalampback").click(function(){
                THIS.setCurrent($(this.parentElement));
            });
            this.setCurrent();
            $(document).on('mySite:ajaxcompleted',function(){
                THIS.setCurrent();
            });
        });
    };
    if(Modernizr.canvas){
        function ParticleWorker(dataHandler){
            this.worker=new Worker('js/modules/particleSystems/particle.worker.transferable.js');
            this.worker.postMessage=this.worker.webkitPostMessage||this.worker.postMessage;
            this.worker.addEventListener('message',function(event){
                dataHandler(event);
            },false);
            this.worker.addEventListener('error',function(event){
                console.log("Particle Worker Error: ");
                console.log(event);
            },false);
        }
        $.fn.paintParticles=function(o){
            o=$.extend({
                speed:300,
                noOfParticles:99,
                batchSize:1000,
                rint:60,
                id:undefined,
                className:"particle_canvas",
                particleScript:undefined,
                mouseMoveHandler:undefined,
                drawParticles:undefined,
                relativeto:undefined,
                autofit:true
            },o);
            return this.each(function(){
                var THIS,$THIS;
                if(this.tagName=='CANVAS'){
                    THIS=this;
                    $THIS=$(THIS);
                    if(!o.relativeto)THIS.relativeto=$THIS.parent();
                }else{
                    THIS=jQuery('<canvas '+(o.id?'id="'+o.id+'" ':'')+'class="'+o.className+'">').insertAfter(this)[0];
                    $THIS=$(THIS);
                    if(!o.relativeto)THIS.relativeto=$(this);
                }
                if(o.relativeto)THIS.relativeto=$(o.relativeto);
                THIS.drawParticles=o.drawParticles;
                THIS.particles=new Array();
                THIS.noOfParticles=o.noOfParticles;
                THIS.particleWorker=new ParticleWorker(function(event){
                    switch(event.data.type){
                        case "status":
                            console.log(event.data.status);
                            break;
                        default:
                            THIS.particles.unshift(event.data.buffer?event.data:new Float32Array(event.data));
                            if(THIS.particles.length>1000)THIS.particleWorker.worker.postMessage({
                                action:"pause"
                            });
                            if(THIS.particles.length>5999)
                                THIS.particles.splice(1000);
                            break;
                    }
                });
                var setWIDTH=function(n){
                    if(n!=width){
                        $THIS.attr('width',n);
                        THIS.particleWorker.worker.postMessage({
                            action:"update",
                            property:"width",
                            value:n
                        });
                        THIS.particles.splice(18);
                        width=n;
                    }
                },
                width=1600,
                setHEIGHT=function(n){
                    if(n!=height){
                        $THIS.attr('height',n);
                        THIS.particleWorker.worker.postMessage({
                            action:"update",
                            property:"height",
                            value:n
                        });
                        THIS.particles.splice(12);
                        height=n;
                    }
                },
                height=900;
                var pxs=new Array();
                THIS.update=function(){
                    setWIDTH(THIS.relativeto.width());
                    setHEIGHT(THIS.relativeto.height());
                }
                var ab = new Uint8Array(1).buffer,transferableSupported;
                try{
                    THIS.particleWorker.worker.postMessage(ab);
                    THIS.particleWorker.worker.postMessage(ab,[ab]);
                }catch(e){}
                transferableSupported=!ab.byteLength;
                THIS.particleWorker.worker.postMessage({
                    action:"importParticleScript",
                    script:o.particleScript
                });
                THIS.particleWorker.worker.postMessage({
                    action:"update",
                    property:"rint",
                    value:o.rint
                });
                THIS.particleWorker.worker.postMessage({
                    action:"update",
                    property:"noOfParticles",
                    value:o.noOfParticles
                });
                THIS.particleWorker.worker.postMessage({
                    action:"update",
                    property:"batchSize",
                    value:o.batchSize
                });
                THIS.particleWorker.worker.postMessage({
                    action:"update",
                    property:"useTransferable",
                    value:transferableSupported
                });
                THIS.update();
                THIS.particleWorker.worker.postMessage({
                    action:"initialize"
                });
                var context=THIS.getContext('2d');
                var fps;//,drawing,countF=9;
                var popped;
                var draw=function(){
                    /*if(drawing){
                        if(!countF--){
                            clearInterval(THIS.draw_interval_id);
                            console.log("Alert: Unable to maintain frame rate!");
                        }
                    }else{
                        countF=9;
                        drawing=true;*/
                    context.clearRect(0,0,width,height);
                    if(popped=THIS.particles.pop())
                        THIS.drawParticles(popped,context);
                    //drawing=false;
                    fps++;
                    if(THIS.particles.length==75||THIS.particles.length==3)
                        THIS.particleWorker.worker.postMessage({
                            action:"resume"
                        });
                    //}
                    THIS.draw_interval_id=window.requestAnimationFrame(draw);
                }
                if(o.mouseMoveHandler)THIS.onmousemove=o.mouseMoveHandler;
                THIS.draw_interval_id=window.requestAnimationFrame(draw);
                window.addEventListener("resize",THIS.update,false);//if(o.autofit)setInterval(THIS.update,3000);
                mySite.applyAcrossBrowser(function(bro){
                    document.addEventListener(bro+"visibilitychange",function(){
                        if(document[(bro)?bro+'Hidden':'hidden'])window.cancelAnimationFrame(THIS.draw_interval_id);
                        else THIS.draw_interval_id=window.requestAnimationFrame(draw);
                    },false);
                });
                setInterval(function(){
                    THIS.fps=fps;
                    fps=0;
                },1000);
                $(document).on('mySite:ajaxcompleted',function(){
                    if(!document.contains(THIS)){
                        window.cancelAnimationFrame(THIS.draw_interval_id);
                        mySite.wipeObject(THIS);
                    }
                });
            });
        };
        $.fn.paintTwinklingStars=function(o){
            var x,y,r,newo,twoπ=Math.PI*2,len,pLen;
            this.paintParticles($.extend({
                particleScript:"twinkler.js",
                drawParticles:function(frame,context){
                    for(len=frame.length/6;len;){
                        pLen=--len*6;
                        x=frame[pLen];
                        y=frame[pLen+1];
                        r=frame[pLen+2];
                        newo=frame[pLen+4];
                        context.beginPath();
                        context.arc(x,y,r,0,twoπ,true);
                        context.closePath();
                        g=context.createRadialGradient(x,y,0,x,y,frame[pLen+5]);
                        g.addColorStop(0.0,'rgba(255,255,255,'+newo+')');
                        g.addColorStop(frame[pLen+3],'rgba(77,101,181,'+(newo*.6)+')');
                        g.addColorStop(1.0,'rgba(77,101,181,0)');
                        context.fillStyle=g;
                        context.fill();
                    }
                }
            },o));
        }
        $.fn.paintMS_SnowFlakes=function(o){
            var len,pLen;
            this.paintParticles($.extend({
                particleScript:"ms.snowflakes.js",
                drawParticles:function(frame,context){
                    for (len=frame.length/6;len;){
                        pLen=--len*6;
                        context.globalAlpha=frame[pLen];
                        context.drawImage(
                            snowflakeSprites[frame[pLen+1]],// image
                            0,// source x
                            0,// source y
                            o.spriteWidth,// source width
                            o.spriteHeight,// source height
                            frame[pLen+2],// target x
                            frame[pLen+3],// target y
                            frame[pLen+4],// target width
                            frame[pLen+5]);// target height
                    }
                }
            },o));
        }
    }

    $.fn.pasteEvents=function(delay){
        if(delay==undefined)delay=20;
        return $(this).each(function(){
            var $el=$(this);
            $el.on("paste", function() {
                $el.trigger("prepaste");
                setTimeout(function() {
                    $el.trigger("postpaste");
                }, delay);
            });
        });
    };

    /**
     * @author Alexander Farkas
     * v. 1.02
     */
    $.extend($.fx.step,{
        backgroundPosition:function(fx){
            if(fx.state===0&&typeof fx.end=='string'){
                var start=$.curCSS(fx.elem,'backgroundPosition');
                start=toArray(start);
                fx.start=[start[0],start[2]];
                var end=toArray(fx.end);
                fx.end=[end[0],end[2]];
                fx.unit=[end[1],end[3]];
            }
            var nowPosX=[];
            nowPosX[0]=((fx.end[0]-fx.start[0])*fx.pos)+fx.start[0]+fx.unit[0];
            nowPosX[1]=((fx.end[1]-fx.start[1])*fx.pos)+fx.start[1]+fx.unit[1];
            fx.elem.style.backgroundPosition=nowPosX[0]+' '+nowPosX[1];
            function toArray(strg){
                strg=strg.replace(/left|top/g,'0px');
                strg=strg.replace(/right|bottom/g,'100%');
                strg=strg.replace(/([0-9\.]+)(\s|\)|$)/g,"$1px$2");
                var res = strg.match(/(-?[0-9\.]+)(px|\%|em|pt)\s(-?[0-9\.]+)(px|\%|em|pt)/);
                return [parseFloat(res[1],10),res[2],parseFloat(res[3],10),res[4]];
            }
        }
    });
    /** End @author Alexander Farkas */

    /**
     * jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/
     * Uses the built in easing capabilities added In jQuery 1.1 to offer multiple easing options
     * Open source under the BSD License.
     * Copyright ¬© 2008 George McGinley Smith
     * All rights reserved.
     */
    //t:current time,b:begInnIng value,c:change In value,d:duration
    jQuery.easing['jswing']=jQuery.easing['swing'];
    jQuery.extend(jQuery.easing,
    {
        def:'easeOutQuad',
        swing:function(x,t,b,c,d){
            return jQuery.easing[jQuery.easing.def](x,t,b,c,d);
        },
        easeInQuad:function(x,t,b,c,d){
            return c*(t/=d)*t+b;
        },
        easeOutQuad:function(x,t,b,c,d){
            return-c*(t/=d)*(t-2)+b;
        },
        easeInOutQuad:function(x,t,b,c,d){
            if((t/=d/2)<1)return c/2*t*t+b;
            return -c/2*((--t)*(t-2)-1)+b;
        },
        easeInCubic:function(x,t,b,c,d){
            return c*(t/=d)*t*t+b;
        },
        easeOutCubic:function(x,t,b,c,d){
            return c*((t=t/d-1)*t*t+1)+b;
        },
        easeInOutCubic:function(x,t,b,c,d){
            if((t/=d/2)<1)return c/2*t*t*t+b;
            return c/2*((t-=2)*t*t+2)+b;
        },
        easeInQuart:function(x,t,b,c,d){
            return c*(t/=d)*t*t*t+b;
        },
        easeOutQuart:function(x,t,b,c,d){
            return-c*((t=t/d-1)*t*t*t-1)+b;
        },
        easeInOutQuart:function(x,t,b,c,d){
            if((t/=d/2)<1)return c/2*t*t*t*t+b;
            return -c/2*((t-=2)*t*t*t-2)+b;
        },
        easeInQuint:function(x,t,b,c,d){
            return c*(t/=d)*t*t*t*t+b;
        },
        easeOutQuint:function(x,t,b,c,d){
            return c*((t=t/d-1)*t*t*t*t+1)+b;
        },
        easeInOutQuint:function(x,t,b,c,d){
            if((t/=d/2)<1)return c/2*t*t*t*t*t+b;
            return c/2*((t-=2)*t*t*t*t+2)+b;
        },
        easeInSine:function(x,t,b,c,d){
            return-c*Math.cos(t/d*(Math.PI/2))+c+b;
        },
        easeOutSine:function(x,t,b,c,d){
            return c*Math.sin(t/d *(Math.PI/2))+b;
        },
        easeInOutSine:function(x,t,b,c,d){
            return-c/2*(Math.cos(Math.PI*t/d)-1)+b;
        },
        easeInExpo:function(x,t,b,c,d){
            return(t==0)?b:c*Math.pow(2,10*(t/d-1))+b;
        },
        easeOutExpo:function(x,t,b,c,d){
            return(t==d)?b+c:c*(-Math.pow(2,-10*t/d)+1)+b;
        },
        easeInOutExpo:function(x,t,b,c,d){
            if(t==0)return b;
            if(t==d)return b+c;
            if((t/=d/2)<1)return c/2*Math.pow(2,10*(t-1))+b;
            return c/2*(-Math.pow(2,-10*--t)+2)+b;
        },
        easeInCirc:function(x,t,b,c,d){
            return-c*(Math.sqrt(1-(t/=d)*t)-1)+b;
        },
        easeOutCirc:function(x,t,b,c,d){
            return c*Math.sqrt(1-(t=t/d-1)*t)+b;
        },
        easeInOutCirc:function(x,t,b,c,d){
            if((t/=d/2)<1)return-c/2*(Math.sqrt(1-t*t)-1)+b;
            return c/2*(Math.sqrt(1-(t-=2)*t)+1)+b;
        },
        easeInElastic:function(x,t,b,c,d){
            var s=1.70158;
            var p=0;
            var a=c;
            if(t==0)return b;
            if((t/=d)==1)return b+c;
            if(!p) p=d*.3;
            if(a<Math.abs(c)){
                a=c;
                var s=p/4;
            }
            else var s=p/(2*Math.PI)*Math.asin(c/a);
            return-(a*Math.pow(2,10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p))+b;
        },
        easeOutElastic:function(x,t,b,c,d){
            var s=1.70158;
            var p=0;
            var a=c;
            if(t==0)return b;
            if((t/=d)==1)return b+c;
            if(!p)p=d*.3;
            if(a<Math.abs(c)){
                a=c;
                var s=p/4;
            }
            else var s=p/(2*Math.PI)*Math.asin(c/a);
            return a*Math.pow(2,-10*t)*Math.sin((t*d-s)*(2*Math.PI)/p)+c+b;
        },
        easeInOutElastic:function(x,t,b,c,d){
            var s=1.70158;
            var p=0;
            var a=c;
            if(t==0)return b;
            if((t/=d/2)==2)return b+c;
            if(!p)p=d*(.3*1.5);
            if(a<Math.abs(c)){
                a=c;
                var s=p/4;
            }
            else var s=p/(2*Math.PI)*Math.asin (c/a);
            if(t<1)return -.5*(a*Math.pow(2,10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p))+ b;
            return a*Math.pow(2,-10*(t-=1))*Math.sin((t*d-s)*(2*Math.PI)/p)*.5+c+b;
        },
        easeInBack:function(x,t,b,c,d,s){
            if(s==undefined)s=1.70158;
            return c*(t/=d)*t*((s+1)*t-s)+b;
        },
        easeOutBack:function(x,t,b,c,d,s){
            if(s==undefined)s=1.70158;
            return c*((t=t/d-1)*t*((s+1)*t+s)+ 1)+b;
        },
        easeInOutBack:function(x,t,b,c,d,s){
            if(s==undefined)s=1.70158;
            if((t/=d/2)<1)return c/2*(t*t*(((s*=(1.525))+1)*t-s))+ b;
            return c/2*((t-=2)*t*(((s*=(1.525))+1)*t+s)+2)+b;
        },
        easeInBounce:function(x,t,b,c,d){
            return c-jQuery.easing.easeOutBounce(x,d-t,0,c,d)+b;
        },
        easeOutBounce:function(x,t,b,c,d){
            if((t/=d)<(1/2.75)){
                return c*(7.5625*t*t)+b;
            }else if(t<(2/2.75)){
                return c*(7.5625*(t-=(1.5/2.75))*t+.75)+b;
            }else if(t<(2.5/2.75)){
                return c*(7.5625*(t-=(2.25/2.75))*t+.9375)+b;
            }else{
                return c*(7.5625*(t-=(2.625/2.75))*t+.984375)+b;
            }
        },
        easeInOutBounce:function(x,t,b,c,d){
            if(t<d/2)return jQuery.easing.easeInBounce(x,t*2,0,c,d)*.5+b;
            return jQuery.easing.easeOutBounce(x,t*2-d,0,c,d)*.5+c*.5+b;
        }
    });
    /** End jQuery Easing v1.3 - http://gsgd.co.uk/sandbox/jquery/easing/ */
    /*!
     * $.preload() function for jQuery
     * Preload images, CSS and JavaScript files without executing them
     * Script by Stoyan Stefanov – http://www.phpied.com/preload-cssjavascript-without-execution/
     * Slightly rewritten by Mathias Bynens – http://mathiasbynens.be/
     * Demo: http://mathiasbynens.be/demo/javascript-preload
     * Note that since this script relies on jQuery, the preloading process will not start until jQuery has finished loading.
     */
    $.extend({
        preload:function(arr){
            var i=arr.length,o;
            while(i--){
                if($.browser.msie){
                    new Image().src=arr[i];
                    continue;
                };
                o=document.createElement('object');
                o.data=arr[i];
                o.width=o.height=0;
                o.style.position='absolute';
                document.getElementById('preloads').appendChild(o);
            };
        }
    });

    mySite.updateLocation=function(){
        mySite.calcLevelChange();
        try{
            _gaq.push(['_trackPageview',mySite.location.url]);
        }catch(e){}
    }
    mySite.pushHistory=function(stateobj,title,url){
        if(Modernizr.history)history.pushState(stateobj,title,url);
        else location.hash="!"+mySite.qualifyURL(url).replace(mySite.domain,"");
        mySite.pre_location=mySite.location;
        mySite.location=new Location();
        mySite.updateLocation();
    }
    mySite.replaceHistory=function(stateobj,title,url){
        if(Modernizr.history)history.replaceState(stateobj,title,url);
        else location.hash="!"+mySite.qualifyURL(url).replace(mySite.domain,"");
        mySite.location=new Location();
        mySite.updateLocation();
    }
    $.fn.updateSocialPlugins=function(o){
        o=$.extend({},o);
        return this.each(function(){
            try{
                gapi.plusone.go(this);
            }catch(e){}
            try{
                FB.XFBML.parse(this);
            }catch(e){}
        });
    }
    $.fn.drawDoc=function(o){
        o=$.extend({},o);
        return this.each(function(){
            var $this=$(this);
            if(Modernizr.history){
                $this.find("a.ajaxedNav").ajaxLinks();
            }
            try{
                $this.find(".alert-message").alert();
            }catch(e){}
            $this.find(".lavaLamp").lavaLamp();
            $this.find("a.scroll").click(function(e){
                $.scrollTo(this.hash||0,1500);
                e.preventDefault();
            });
            try {
                $this.find("a.lightbox").lightBox();
            } catch(e){}
            try{
                if(Modernizr.canvas&&mySite.location.params.serviceMode){
                    $this.find("#TopBanner").paintTwinklingStars({
                        className:"SnowFall"
                    });
                }
            }catch(e){}
            try{
                Cufon.refresh();
            }catch(e){}
        });
    }
    mySite.refreshSocial=function(){
        try {
            mySite.user.facebook.refresh();
        }catch(e){}
        try {
            mySite.user.twitter.refresh();
        }catch(e){}
        try{
        //refreshGoogle(content);
        }catch(e){}
        try{
            addthis.init();
        }catch(e){}
    }
    mySite.refresh=function(){
        mySite.refreshSocial();
    }
    mySite.update=function(){
        //var outOfStructure=true;
        $("nav").each(function(i,el){
            var selected,el;
            $("a",this).each(function(){
                el=$(this);
                if(mySite.qualifyURL(this.href)==mySite.location.url.substr(0,mySite.qualifyURL(this.href).length)){
                    if(!(selected&&(this.href<selected[0].href))){
                        el.parent().addClass('selected');
                        if(selected)selected.parent().removeClass('selected');
                        selected=el;
                    }
                }
                else el.parent().removeClass('selected');
            //if($(el).hasClass("HOME")&&(mySite.location.url.length>(mySite.qualifyURL(this.href).length)))$(this).parent().removeClass('selected');
            });
        });
        $('html').removeClass('loading');
    }
    function SerializedAjaxLoader(preprocess,callback,onError){
        this.preprocess=preprocess;
        this.data={};
        this.queue={
            current:{
                url:location.href,
                callback:null
            },
            waiting:null
        };
        this.ajaxloader=null;
        this.ajaxCritical=false;
        this.useWebWorkers=true;
        var THIS=this;
        function onComplete(responseText,status){
            if (status==200||(mySite.location.is404&&status==404)){
                mySite.location.is404=false;
                callback(responseText,status,THIS.data);
                if(THIS.queue['current'].callback)THIS.queue['current'].callback(responseText,status);
                THIS.queue['current']=null;
                if(THIS.queue['waiting'])THIS.load();
            }else{
                onError(status);//$("#error").html(msg + xhr.status + " " + xhr.statusText);
            }
        }
        this.load=function(){
            if((!this.ajaxCritical)&&(this.queue['current']||this.queue['waiting'])){
                if(this.ajaxloader)this.ajaxloader.terminate();
                if(this.queue['waiting']){
                    this.queue['current']=this.queue['waiting'];
                    this.queue['waiting']=null;
                }
                preprocess(this.queue['current']);
                if(Modernizr.webworkers&&this.useWebWorkers){
                    this.ajaxloader=new Worker(config.urls.workers[this.queue['current'].dataType||'ajax']);
                    this.ajaxloader.addEventListener('message',function(event){
                        try{
                            THIS.ajaxCritical=true;
                            //(jqXHR,status,responseText)
                            // If successful, inject the HTML into all the matched elements
                            onComplete(event.data.responseText,event.data.status);
                            THIS.ajaxCritical=false;
                        }catch(e){
                            onError(e);
                        }
                    },false);
                    this.ajaxloader.addEventListener('error',function(event){
                        console.log(['ERROR: Line ', e.lineno, ' in ', e.filename, ': ', e.message].join(''));
                        onError(event);
                    },false);
                    // Take care of vendor prefixes.
                    //mySite.webworkers.ajaxloader.postMessage = mySite.webworkers.ajaxloader.webkitPostMessage || mySite.webworkers.ajaxloader.postMessage;
                    this.ajaxloader.postMessage(THIS.queue['current'].url);
                }else{
                    jQuery.ajax({
                        url:THIS.queue['current'].url,
                        type:"GET",
                        dataType:THIS.queue['current'].dataType||"html",
                        // Complete callback (responseText is used internally)
                        complete:function(jqXHR,status,responseText) {
                            try{
                                THIS.ajaxCritical=true
                                // Store the response as specified by the jqXHR object
                                responseText=jqXHR.responseText;
                                // If successful, inject the HTML into all the matched elements
                                if (jqXHR.isResolved()){
                                    // #4825: Get the actual response in case a dataFilter is present in ajaxSettings
                                    jqXHR.done(function(r){
                                        responseText=r;
                                        onComplete(responseText,status);
                                    });
                                }else if(status=="error")onError(status);
                                THIS.ajaxCritical=false;
                            }catch(e){
                                onError(e);
                            }
                        },
                        error:function(jqXHR,textStatus,errorThrown){
                            onError(errorThrown);
                        }
                    });
                }
            }
        }
        this.loadTo=function(queueObj){
            THIS.queue['waiting']=queueObj;
            THIS.load();
        }
    }
    if(Modernizr.history){
        mySite.ajaxPageLoader=new SerializedAjaxLoader(
            function(current){
                if(mySite.fireEvent('mySite:ajaxstart',{
                    relatedTarget:$("#PL"+mySite.location.pageChangeLevel)[0]
                }))
                    return;
                $('html').addClass("PL"+mySite.location.pageChangeLevel+"_ajax");
                mySite.ajaxPageLoader.queue['current'].url=mySite.location.url;
            },function(responseText,status){
                if(mySite.fireEvent('mySite:ajaxsuccess',{
                    relatedTarget:$("#PL"+mySite.location.pageChangeLevel)[0]
                },[responseText,status]))
                    return;
                // Create a dummy div to hold the results
                var responseDOM=jQuery("<div>")
                // inject the contents of the document in, removing the scripts to avoid any 'Permission Denied' errors in IE
                .append(responseText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,""));
                $("header#MainHeader").replaceWith(responseDOM.find("header#MainHeader"));
                $("header#MainHeader").updateSocialPlugins();
                $("#PL"+mySite.location.pageChangeLevel).replaceWith(responseDOM.find("#PL"+mySite.location.pageChangeLevel));
                responseDOM.find('title').replaceAll('title');
                responseDOM.find('meta').each(function(){
                    var THIS=$(this);
                    if(THIS.attr('http-equiv'))THIS.replaceAll($('meta[name~="'+THIS.attr('http-equiv')+'"]'));
                    else if(THIS.attr('name'))THIS.replaceAll($('meta[name~="'+THIS.attr('name')+'"]'));
                    else if(THIS.attr('property'))THIS.replaceAll($('meta[name~="'+THIS.attr('property')+'"]'));
                    else if(THIS.attr('itemprop'))THIS.replaceAll($('meta[name~="'+THIS.attr('itemprop')+'"]'));
                });
                responseDOM=null;
                $("#PL"+mySite.location.pageChangeLevel).drawDoc().updateSocialPlugins();
                mySite.update();
                mySite.refresh();
                $('html').removeClass("PL"+mySite.location.pageChangeLevel+"_ajax");
                if(mySite.fireEvent('mySite:ajaxcompleted',{
                    relatedTarget:$("#PL"+mySite.location.pageChangeLevel)[0]
                }))
                    return;
            },function(e){
                if(!mySite.fireEvent('mySite:ajaxerror',{
                    relatedTarget:$("#PL"+mySite.location.pageChangeLevel)[0]
                }))
                    document.location.replace(mySite.location.url);
            });
        mySite.ajaxTo=function(queueObj){
            try{
                mySite.ajaxPageLoader.loadTo(queueObj);
            }catch(e){
                document.location.replace(mySite.location.url);
            }
        }
        $.fn.ajaxLinks=function(o) {
            o=$.extend({},o);
            return this.each(function(){
                $(this).on('click', function(e){
                    var link=event.currentTarget;
                    if (link.tagName.toUpperCase()!=='A')
                        throw "requires an anchor element"
                    if(location.protocol!==link.protocol||location.host!==link.host){
                        return;
                    }
                    if(event.which>1||event.metaKey){
                        return
                    }
                    if(link.hash&&link.href.replace(link.hash,'')===location.href.replace(location.hash,'')){
                    //return;
                    }
                    $('html').removeClass('PoppedBack');
                    mySite.pushHistory(null,'',this.href);
                    mySite.ajaxTo({
                        url:this.href,
                        callback:function(responseText,status){}
                    });
                    e.preventDefault();
                    return false;
                });
            });
        };
    }
})(jQuery);
(function($){
    $(document).ready(function(){
        window.addEventListener('popstate',function(event){
            $('html').addClass('PoppedBack');
            mySite.pre_location=mySite.location;
            mySite.location=new Location();
            mySite.updateLocation();
            if(mySite.location.is404||(mySite.location.href.replace(mySite.location.hash,'')===mySite.pre_location.href.replace(mySite.pre_location.hash,''))){
                mySite.refresh();
                return;
            }
            mySite.ajaxTo({
                url:location.pathname
            });
        });
        window.addEventListener('hashchange',function(event){
            
            });
        document.body.online=function(){
    
        }
        document.body.onoffine=function(){
    
        }
        var enID,enhance=function(){
            mySite.enhanced=true;
            $(document).updateSocialPlugins();
            mySite.refresh();
            if(config.enable.cufon)insertScript('/js/libs/cufon-yui.basicfonts.js',true);
            if(config.enable.google_search)insertScript("https://www.google.com/jsapi?callback=loadGoogleJSApi",true);
            if(config.enable.google_translate)insertScript("//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit",true);
            for(var i=0;i<config.twitter_streams.length;i++)
                mySite.twitter_streams[config.twitter_streams[i]]=mySite.createTwitterStream(config.twitter_streams[i]);
            setTimeout("$.preload(config.preloads)",5000);
        }
        document.onreadystatechange=function(){
            if(document.readyState=="complete"){
                window.clearTimeout(enID);
                enhance();
            }
        }
        // orientation on firefox
        function handleOrientation(orientData){
            mySite.orientation=true;
            mySite.orientX=orientData.x;
            mySite.orientY=orientData.y;
        }
        window.addEventListener("MozOrientation",handleOrientation,true);
        // orientation on mobile safari
        if (window.DeviceMotionEvent!=undefined){
            mySite.orientation=true;
            window.ondevicemotion=function(event){
                mySite.orientX=event.accelerationIncludingGravity.x;
                mySite.orientY=event.accelerationIncludingGravity.y;
            };
        }

        if(location.hash){
            if((/!/g).test(location.hash)){
                if(Modernizr.history){
                    history.replaceState(null,'',location.hash.toString().substring(2));
                    mySite.ajaxTo({
                        url:location.hash.toString().substring(2)
                    });
                } else {
                    document.location.href=location.hash.toString().substring(2);
                }
            }
        }
        $(document).ajaxSuccess(function(){

            });
        $('body').append(mySite.overlayTheater.theater);
        mySite.update();
        $('body').drawDoc();
        $('html').addClass('loaded');
        enID=window.setTimeout(enhance,3000);
        setTimeout("$('html').addClass('startup');",500);
        setTimeout("$('html').removeClass('startup')",5000);
    });
})(jQuery);
function loadGoogleJSApi(){
    google.load('search', '1', {
        language : 'en', 
        style : google.loader.themes.V2_DEFAULT,
        callback:function() {
            var customSearchOptions={};
            var imageSearchOptions={};
            imageSearchOptions['layout']=google.search.ImageSearch.LAYOUT_POPUP;
            customSearchOptions['enableImageSearch']=true;
            customSearchOptions['imageSearchOptions']=imageSearchOptions;
            var customSearchControl=new google.search.CustomSearchControl(config.googleCSEId,customSearchOptions);
            customSearchControl.setResultSetSize(google.search.Search.FILTERED_CSE_RESULTSET);
            var options=new google.search.DrawOptions();
            options.setSearchFormRoot('Google_CS_Box');
            options.setAutoComplete(true);
            customSearchControl.setAutoCompletionId(config.googleCSEAutoCompletionId);
            customSearchControl.draw('cse_result', options);
            //Page Search
            if(document.getElementById('Google_Page_CS_Box')){
                var customSearchOptions={};
                var imageSearchOptions={};
                imageSearchOptions['layout']=google.search.ImageSearch.LAYOUT_POPUP;
                customSearchOptions['enableImageSearch']=true;
                customSearchOptions['imageSearchOptions']=imageSearchOptions;
                var customSearchControl=new google.search.CustomSearchControl(config.googleCSEId,customSearchOptions);
                customSearchControl.setResultSetSize(google.search.Search.FILTERED_CSE_RESULTSET);
                var options=new google.search.DrawOptions();
                options.setSearchFormRoot('Google_Page_CS_Box');
                options.setAutoComplete(true);
                customSearchControl.setAutoCompletionId(config.googleCSEAutoCompletionId);
                customSearchControl.draw('cse_Page_result', options);
                customSearchControl.execute(document.getElementById('goog-wm-qt').value);
            }
        }
    });
}
function googleTranslateElementInit(){
    new google.translate.TranslateElement({
        pageLanguage:'en',
        gaTrack:true,
        gaId:'UA-12345-12'
    });
};