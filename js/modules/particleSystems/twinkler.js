/*Thanks: http://timothypoon.com/blog/2011/01/19/html5-canvas-particle-animation/*/
var noOfProperties=6;
var rint=60;
function Particle(){
    this.s={
        ttl:8000,
        xmax:5,
        ymax:2,
        rmax:10,
        rt:1,
        xdef:960,
        ydef:540,
        xdrift:4,
        ydrift:4,
        random:true,
        blink:true
    };
    this.reset=function(){
        this.x=(this.s.random?width*Math.random():this.s.xdef);
        this.y=(this.s.random?height*Math.random():this.s.ydef);
        this.r=((this.s.rmax-1)*Math.random())+1;
        this.dx=(Math.random()*this.s.xmax)*(Math.random()<.5?-1:1);
        this.dy=(Math.random()*this.s.ymax)*(Math.random()<.5?-1:1);
        this.hl=(this.s.ttl/rint)*(this.r/this.s.rmax);
        this.rt=Math.random()*this.hl;
        this.s.rt=Math.random()+1;
        this.stop=Math.random()*.2+.4;
        this.s.xdrift*=Math.random()*(Math.random()<.5?-1:1);
        this.s.ydrift*=Math.random()*(Math.random()<.5?-1:1);
    }
    this.fade=function(){
        this.rt+=this.s.rt;
    }
    this.move=function(){
        this.x+=(this.rt/this.hl)*this.dx;
        this.y+=(this.rt/this.hl)*this.dy;
        if(this.x>width||this.x<0)this.dx*=-1;
        if(this.y>height||this.y<0)this.dy*=-1;
    }
    this.draw=function(){
        if(this.s.blink&&(this.rt<=0||this.rt>=this.hl))this.s.rt=this.s.rt*-1;
        else if(this.rt>=this.hl)this.reset();
        this.newo=1-(this.rt/this.hl);
        this.cr=this.r*this.newo;
        this.cr=(this.cr<=0?1:this.cr);
    }
    this.update=function(){
        this.fade();
        this.move();
        this.draw();
    }
    this.getData=function(){
        return{
            x:this.x,
            y:this.y,
            r:this.r,
            stop:this.stop,
            newo:this.newo,
            cr:this.cr
        };
    }
    this.getDataArray=function(){
        return[this.x,this.y,this.r,this.stop,this.newo,this.cr];
    }
    this.reset();
}
/*Thanks: http://timothypoon.com/blog/2011/01/19/html5-canvas-particle-animation/ :End*/