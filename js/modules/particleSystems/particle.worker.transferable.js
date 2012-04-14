// Takes care of vendor prefixes.
self.postMessage=self.webkitPostMessage||self.postMessage;

var particles=[],
width=1600,
height=900,
noOfParticles=99,
batchSize=1000,
useTransferable=false,
useTypedArray=true,
running=false,
controller=batchSize;

function run(){
    var frameData,data,dLen,offset;
    while(running&&(controller--)){
        frameData=new Float32Array(particles.length*noOfProperties);
        for(var len=particles.length;len;){
            particles[--len].update();
            data=particles[len].getDataArray();
            dLen=data.length;
            offset=len*dLen;
            for(;dLen;){
                --dLen;
                frameData[offset+dLen]=data[dLen];
            }
        }
        if(useTypedArray){if(useTransferable)self.postMessage(frameData.buffer,[frameData.buffer]);else self.postMessage(frameData.buffer);}
        else self.postMessage(frameData);
    }
    controller=batchSize;
    running=false;
}

addEventListener('message',function(event){
    switch(event.data.action){
        case "importParticleScript":
            importScripts(event.data.script);
            break;
        case "initialize":
            particles=new Array(noOfParticles);
            for(var len=noOfParticles;len;)
                particles[--len]=new Particle();
            controller=batchSize;
            running=true;
            run();
            break;
        case "pause":
            running=false;
            break;
        case "resume":
            if(!running){
                running=true;
                controller=batchSize;
                run();
            }
            break;
        case "stop":
            close();
            break;
        case "update":
            switch(event.data.property){
                case "width":
                    width=event.data.value;
                    break;
                case "height":
                    height=event.data.value;
                    break;
                case "noOfParticles":
                    noOfParticles=event.data.value;
                    break;
                case "batchSize":
                    batchSize=event.data.value;
                    break;
                case "useTransferable":
                    useTransferable=event.data.value;
                    break;
            }
            break;
    }
    if(event.data.byteLength)useTypedArray=!!new Uint8Array(event.data).length;
},false);