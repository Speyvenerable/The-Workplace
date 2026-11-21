(function(){
  var NS='http://www.w3.org/2000/svg';
  var KINDS={web:'Website',app:'App',game:'Game',bot:'Bot',pack:'Add-on',story:'Story',other:'Other'};
  var STATUS={ore:'Raw ore',anvil:'On the anvil',quench:'Quenching',forged:'Forged'};
  var COL={ore:'#9aa7b4',anvil:'#f08a24',quench:'#6fb4d8',forged:'#e8c15a'};
  var ICONS={
    anvil:['cccccc..','aaaaaaac','.cccaab.','..abab..','..abab..','.aaaabb.','aaaaaabb','........'],
    web:['..aaaa..','.acccab.','acccaabb','aaaaaabb','accaaabb','.aaaabb.','..aabb..','...bb...'],
    app:['.aaaaaa.','.acccca.','.acccca.','.acccca.','.acccca.','.acccca.','.aaaaaa.','.aabbaa.'],
    game:['.......c','......ca','.....ca.','c...ca..','ac.ca...','.aca....','..ab....','.bb.b...'],
    bot:['...aa...','...aa...','.aaaaaa.','acbccbca','acccccca','accbbcca','.aaaaaa.','.a.aa.a.'],
    pack:['..aaaa..','.accccb.','aaaaaabb','accccabb','accccabb','accccabb','aaaaaabb','.bbbbbb.'],
    story:['aaaaaaa.','acccbcca','acccbcca','acccbcca','acccbcca','acccbcca','aaaaaaaa','.bbbbbb.'],
    other:['..aaaa..','.acccab.','acccaabb','aaaaaabb','.aaaabb.','..aabb..','...bb...','........'],
    mug:['.aaaaa..','abcccaaa','abcccaba','abcccaba','abcccaaa','.abbba..','..aaaa..','........'],
    quill:['.....aaa','....accb','...accb.','..accb..','.accb...','abcb....','ab......','a.......'],
    note:['..aaaaaa','..accccb','..ab..ab','..ab..ab','.aab.aab','accb.ccb','.bb...bb','........'],
    screen:['aaaaaaaa','acccccca','accbccca','accbbcca','acccccca','aaaaaaaa','...aa...','.aaaaaa.'],
    play:['aaaaaaaa','acbcccca','acbbccca','acbbbcca','acbbccca','acbcccca','aaaaaaaa','.bbbbbb.'],
    crown:['a..aa..a','aa.aa.aa','acaaaaca','accccccb','accbbccb','accccccb','aaaaaaab','........'],
    book:['.aaaaaa.','accabccb','accabccb','accabccb','accabccb','aaaaaaaa','.bbbbbb.','........'],
    eye:['........','..aaaa..','.accccaa','acccbbca','acccbbca','.accccaa','..aaaa..','........']
  };

  var $=function(id){return document.getElementById(id)};
  function h(tag,props){
    var e=document.createElement(tag);
    if(props)for(var k in props){
      var v=props[k];
      if(k==='class')e.className=v;
      else if(k==='text')e.textContent=v;
      else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);
      else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v);
    }
    for(var i=2;i<arguments.length;i++){
      var kids=[].concat(arguments[i]);
      for(var j=0;j<kids.length;j++){
        var c=kids[j];
        if(c==null||c===false)continue;
        e.append(c.nodeType?c:document.createTextNode(String(c)));
      }
    }
    return e;
  }
  function icon(kind){
    var bmp=ICONS[kind]||ICONS.other;
    var s=document.createElementNS(NS,'svg');
    s.setAttribute('viewBox','0 0 8 8');
    s.setAttribute('shape-rendering','crispEdges');
    s.setAttribute('aria-hidden','true');
    bmp.forEach(function(row,y){
      for(var x=0;x<row.length;x++){
        var ch=row.charAt(x);
        if(ch==='.')continue;
        var r=document.createElementNS(NS,'rect');
        r.setAttribute('x',x);r.setAttribute('y',y);r.setAttribute('width',1);r.setAttribute('height',1);
        r.setAttribute('class','p'+ch);
        s.appendChild(r);
      }
    });
    return s;
  }
  function hex(c){return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
  function mix(c,t,p){var a=hex(c),b=hex(t);return 'rgb('+a.map(function(v,i){return Math.round(v+(b[i]-v)*p)}).join(',')+')'}

  var items=[];
  var F={status:'all',kind:'all',smith:'all',q:''};
  var loaded=false;
  var realm='forge';
  var reduce=false;
  reduce=false;/* animations always play */

  function norm(o){
    o=o||{};
    return {
      id:o.id,
      name:String(o.name||'Untitled'),
      smith:String(o.smith||'Unknown'),
      kind:KINDS[o.kind]?o.kind:'other',
      status:STATUS[o.status]?o.status:'anvil',
      blurb:String(o.blurb||''),
      category:String(o.category||'').trim().slice(0,60),
      link:String(o.link||''),
      icon:ICONS[o.icon]?o.icon:'',
      color:/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:'',
      lang:String(o.lang||'').slice(0,24),
      stars:o.stars==null?null:Number(o.stars)||0,
      forks:o.forks==null?null:Number(o.forks)||0,
      repoUpdated:String(o.repoUpdated||'').slice(0,24),
      realm:o.realm==='dejavu'?'dejavu':'forge',
      createdAt:Number(o.createdAt)||0,
      updatedAt:Number(o.updatedAt)||0
    };
  }
  function safeLink(u){return /^https?:\/\//i.test(u)?u:''}
  function note(t){$('note').textContent=t||''}

  $('sigil').appendChild(icon('anvil'));

  /* ======================= AUDIO ======================= */
  var A={ctx:null,music:null,sfx:null,nb:null,on:false,timer:null,next:0,step:0};
  var EIGHTH=60/88/2;
  var MEL=[74,0,77,0,81,0,79,77, 76,0,74,0,72,0,74,0, 74,0,77,0,81,0,84,81, 79,0,77,76,74,0,0,0];
  var BAS=[50,0,45,0,50,0,45,0, 48,0,43,0,48,0,43,0, 50,0,45,0,50,0,45,0, 45,0,45,0,50,0,0,0];
  function fq(n){return 440*Math.pow(2,(n-69)/12)}

  function audioInit(){
    if(A.ctx)return true;
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    try{A.ctx=new AC({latencyHint:'interactive'})}catch(e){try{A.ctx=new AC()}catch(e2){return false}}
    var m=A.ctx.createGain();m.gain.value=.9;m.connect(A.ctx.destination);
    A.music=A.ctx.createGain();A.music.gain.value=.5;A.music.connect(m);
    A.sfx=A.ctx.createGain();A.sfx.gain.value=.8;A.sfx.connect(m);
    var len=A.ctx.sampleRate,buf=A.ctx.createBuffer(1,len,A.ctx.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    A.nb=buf;
    return true;
  }
  function pluck(freq,t,dur,vol,type,bus){
    var o=A.ctx.createOscillator(),g=A.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(vol,t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.05);
  }
  function thump(t,vol){
    var o=A.ctx.createOscillator(),g=A.ctx.createGain();
    o.type='sine';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(52,t+.16);
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+.22);
    o.connect(g);g.connect(A.music);o.start(t);o.stop(t+.25);
  }
  function noise(t,dur,vol,ftype,ff,bus){
    var s=A.ctx.createBufferSource(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
    s.buffer=A.nb;f.type=ftype;f.frequency.value=ff;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(bus);s.start(t,Math.random()*.8);s.stop(t+dur+.02);
  }
  var MEL2=[74,0,0,77,0,76,0,0, 71,0,0,74,0,77,0,0, 76,0,0,72,0,79,76,0, 73,0,76,0,0,81,0,0];
  var BAS2=[38,0,41,0,45,0,44,0, 43,0,47,0,50,0,49,0, 36,0,40,0,43,0,45,0, 45,0,49,0,52,0,51,0];
  var CH2=[[62,65,69,72],[59,62,65,67],[64,67,71,72],[61,64,67,69]];
  function playStep(i,t){
    if(realm==='dejavu'){
      var sw=(i&1)?EIGHTH*.3:0,t2=t+sw,n=MEL2[i];
      if(n){pluck(fq(n),t2,EIGHTH*2.4,.075,'triangle',A.music);pluck(fq(n+12),t2,EIGHTH*1.2,.012,'sine',A.music)}
      if(BAS2[i]){pluck(fq(BAS2[i]),t,EIGHTH*1.9,.19,'sine',A.music);pluck(fq(BAS2[i]+12),t,EIGHTH*.5,.02,'triangle',A.music)}
      if(i%8===0||i%8===5)CH2[i>>3].forEach(function(m){pluck(fq(m),t2,EIGHTH*(i%8===0?2.6:1.6),.026,'triangle',A.music)});
      if(i%8===2||i%8===6)noise(t,.09,.018,'bandpass',3200,A.music);
      if(i&1)noise(t2,.03,.008,'highpass',8000,A.music);
      return;
    }
    if(MEL[i])pluck(fq(MEL[i]),t,EIGHTH*3.2,.085,'triangle',A.music);
    if(MEL[i])pluck(fq(MEL[i]+12),t,EIGHTH*1.2,.018,'square',A.music);
    if(BAS[i])pluck(fq(BAS[i]),t,EIGHTH*3.6,.15,'triangle',A.music);
    if(i%16===0){pluck(fq(62),t,EIGHTH*15,.03,'sine',A.music);pluck(fq(69),t,EIGHTH*15,.025,'sine',A.music)}
    if(i%8===0)thump(t,.2);
    else if(i%8===4)thump(t,.1);
    if(i%2===1)noise(t,.04,.012,'highpass',6000,A.music);
  }
  function sched(){
    var ctx=A.ctx;if(!ctx)return;
    if(A.next<ctx.currentTime-.5)A.next=ctx.currentTime+.05;
    while(A.next<ctx.currentTime+.35){
      playStep(A.step,A.next);
      A.next+=EIGHTH;A.step=(A.step+1)%32;
    }
  }
  function setSound(on){
    var b=$('sndBtn');
    if(on){
      if(!audioInit()){b.textContent='Sound unavailable';b.disabled=true;A.on=false;return}
      A.on=true;
      try{A.ctx.resume()}catch(e){}
      if(!A.timer){A.next=A.ctx.currentTime+.1;A.timer=setInterval(sched,90)}
    }else{
      A.on=false;
      if(A.timer){clearInterval(A.timer);A.timer=null}
      if(A.ctx){try{A.ctx.suspend()}catch(e){}}
    }
    A.touched=true;b.textContent=A.on?'Music on':'Music off';
    fireSoundSync();
    b.setAttribute('aria-pressed',String(A.on));
  }
  document.addEventListener('visibilitychange',function(){
    if(!A.ctx||!A.on)return;
    try{document.hidden?A.ctx.suspend():A.ctx.resume()}catch(e){}
  });
  var KF=1; /* slow-down factor for the forge warp */
  var HAMMER=[.5,.95,1.35,1.7]; /* anvil hammer strikes (seconds), shared by the forge warp visuals and sound */
  var sfx={
    step:function(){if(!A.on)return;noise(A.ctx.currentTime,.06,.07,'lowpass',420,A.sfx)},
    tick:function(){if(!A.on)return;var t=A.ctx.currentTime;pluck(1568,t,.07,.035,'triangle',A.sfx);pluck(2349,t+.03,.08,.02,'sine',A.sfx)},
    blip:function(){if(!A.on)return;var t=A.ctx.currentTime;pluck(784,t,.14,.09,'triangle',A.sfx);pluck(1175,t+.06,.2,.07,'triangle',A.sfx)},
    type:function(){if(!A.on)return;pluck(520+Math.random()*80,A.ctx.currentTime,.06,.03,'triangle',A.sfx)},
    clink:function(v){if(!A.on)return;v=v||1;var t=A.ctx.currentTime;pluck(1760,t,.4,.12*v,'sine',A.sfx);pluck(2637,t,.3,.08*v,'sine',A.sfx);noise(t,.04,.12*v,'highpass',3000,A.sfx)},
    clang:function(){
      if(!A.on)return;var t=A.ctx.currentTime;
      pluck(1210,t,.9,.2,'sine',A.sfx);pluck(1830,t,.7,.14,'sine',A.sfx);
      pluck(2640,t,.5,.1,'sine',A.sfx);pluck(3510,t,.35,.06,'sine',A.sfx);
      pluck(1215,t+.11,.5,.07,'sine',A.sfx);
      noise(t,.06,.28,'highpass',2500,A.sfx);
      var o=A.ctx.createOscillator(),g=A.ctx.createGain();
      o.type='sine';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(70,t+.14);
      g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.0001,t+.2);
      o.connect(g);g.connect(A.sfx);o.start(t);o.stop(t+.22);
    },
    warp:function(to){
      if(!A.on)return;var t=A.ctx.currentTime;
      var c=A.ctx,i;
      if(to==='dejavu'){
        noise(t,.9,.09,'bandpass',1500,A.sfx);
        for(i=0;i<9;i++)pluck(250-i*12+Math.random()*30,t+.1+i*.09,.12,.09,'sine',A.sfx);
        noise(t+.1,.8,.05,'bandpass',900,A.sfx);
        pluck(2093,t+1.0,1.3,.06,'sine',A.sfx);pluck(3136,t+1.02,1,.035,'sine',A.sfx);pluck(4186,t+1.05,.7,.02,'sine',A.sfx);
        thump(t+.95,.25);
        for(i=0;i<8;i++)pluck(120+i*18+Math.random()*20,t+2.15+i*.12,.14,.08,'sine',A.sfx);
        noise(t+2.1,1.1,.06,'bandpass',700,A.sfx);
        pluck(2637,t+2.9,.5,.03,'sine',A.sfx);
        return;
      }
      if(to==='forge'){
        var rum=function(t0,dur,v){var nb2=c.createBufferSource(),f3=c.createBiquadFilter(),g3=c.createGain();nb2.buffer=A.nb;nb2.loop=true;f3.type='lowpass';f3.frequency.setValueAtTime(140,t0);f3.frequency.exponentialRampToValueAtTime(520,t0+dur*.6);f3.frequency.exponentialRampToValueAtTime(200,t0+dur);g3.gain.setValueAtTime(.0001,t0);g3.gain.exponentialRampToValueAtTime(v,t0+dur*.4);g3.gain.exponentialRampToValueAtTime(.0001,t0+dur);nb2.connect(f3);f3.connect(g3);g3.connect(A.sfx);nb2.start(t0);nb2.stop(t0+dur+.05)};
        var creak=function(t0,dur,f0,f1,v){var o2=c.createOscillator(),bf=c.createBiquadFilter(),g4=c.createGain();o2.type='sawtooth';o2.frequency.setValueAtTime(f0,t0);o2.frequency.linearRampToValueAtTime(f1,t0+dur);bf.type='bandpass';bf.frequency.value=420;bf.Q.value=5;g4.gain.setValueAtTime(.0001,t0);g4.gain.linearRampToValueAtTime(v,t0+dur*.3);g4.gain.linearRampToValueAtTime(.0001,t0+dur);o2.connect(bf);bf.connect(g4);g4.connect(A.sfx);o2.start(t0);o2.stop(t0+dur+.05)};
        /* doors grinding shut */
        rum(t,.9,.2);creak(t+.05,.8,150,92,.05);creak(t+.2,.6,210,130,.03);
        /* the slam: boom, wood crack, iron clank, then the chains rattle */
        thump(t+.85,.7);noise(t+.85,.18,.3,'lowpass',900,A.sfx);noise(t+.85,.05,.25,'highpass',2500,A.sfx);
        var bo=c.createOscillator(),bg=c.createGain();bo.type='sine';bo.frequency.setValueAtTime(95,t+.85);bo.frequency.exponentialRampToValueAtTime(30,t+1.4);bg.gain.setValueAtTime(.5,t+.85);bg.gain.exponentialRampToValueAtTime(.0001,t+1.5);bo.connect(bg);bg.connect(A.sfx);bo.start(t+.85);bo.stop(t+1.55);
        pluck(330,t+.86,.7,.1,'triangle',A.sfx);pluck(494,t+.86,.5,.07,'triangle',A.sfx);pluck(1480,t+.86,.5,.05,'sine',A.sfx);
        for(i=0;i<9;i++)noise(t+.95+i*.045+Math.random()*.03,.03,.07,'highpass',3500+Math.random()*3000,A.sfx);
        for(i=0;i<5;i++)pluck(2200+Math.random()*1800,t+1.0+i*.07,.12,.03,'sine',A.sfx);
        /* the great bar drops across */
        thump(t+1.55,.35);pluck(196,t+1.55,.6,.12,'triangle',A.sfx);noise(t+1.55,.04,.2,'highpass',1800,A.sfx);
        /* lifted again, doors drag open, warm glow */
        pluck(165,t+2.0,.5,.1,'triangle',A.sfx);noise(t+2.0,.05,.15,'highpass',1500,A.sfx);
        rum(t+2.1,1.1,.22);creak(t+2.15,.95,95,175,.05);creak(t+2.3,.7,130,230,.03);
        [659,988,1319].forEach(function(f,k){pluck(f,t+2.95+k*.09,1.3,.06,'sine',A.sfx)});
        return;
      }
      var o=A.ctx.createOscillator(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(1500,t+.55);
      f.type='lowpass';f.frequency.setValueAtTime(400,t);f.frequency.exponentialRampToValueAtTime(5000,t+.55);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.3);g.gain.exponentialRampToValueAtTime(.0001,t+.85);
      o.connect(f);f.connect(g);g.connect(A.sfx);o.start(t);o.stop(t+.9);
      noise(t,.8,.1,'bandpass',900,A.sfx);
      pluck(1320,t+.5,.8,.08,'sine',A.sfx);pluck(1980,t+.55,.7,.05,'sine',A.sfx);
    },
    portal:function(){
      if(!A.on)return;var c=A.ctx,t=c.currentTime,i;
      [220,330,495].forEach(function(f,k){
        var o=c.createOscillator(),g=c.createGain();
        o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.5,t+.7);
        g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+.2+k*.05);g.gain.exponentialRampToValueAtTime(.0001,t+.9);
        o.connect(g);g.connect(A.sfx);o.start(t);o.stop(t+1);
      });
      noise(t,.7,.05,'bandpass',2600,A.sfx);
      for(i=0;i<5;i++)pluck(1320+i*330,t+.05+i*.07,.5,.035,'sine',A.sfx);
    },
    arrive:function(to){
      if(!A.on)return;var c=A.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
      o.type='sine';o.frequency.setValueAtTime(to==='dejavu'?70:110,t);o.frequency.exponentialRampToValueAtTime(30,t+.9);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);
      o.connect(g);g.connect(A.sfx);o.start(t);o.stop(t+1.2);
      noise(t,.5,.2,'lowpass',700,A.sfx);
      if(to==='dejavu'){
        noise(t+.05,.5,.06,'bandpass',500,A.sfx);
        [62,65,69,72].forEach(function(m,q){pluck(fq(m),t+.08+q*.04,1.4,.05,'triangle',A.sfx)});
        pluck(2093,t,1.4,.05,'sine',A.sfx);pluck(3136,t,1,.03,'sine',A.sfx);
        pluck(2637,t+.9,.3,.03,'sine',A.sfx);
      }else{
        pluck(523,t+.05,1.2,.08,'triangle',A.sfx);pluck(784,t+.15,1.2,.07,'triangle',A.sfx);pluck(1047,t+.25,1.4,.06,'triangle',A.sfx);
        pluck(2093,t+.3,.9,.03,'sine',A.sfx);
      }
    },
    whoosh:function(){
      if(!A.on)return;var t=A.ctx.currentTime;
      var s=A.ctx.createBufferSource(),f=A.ctx.createBiquadFilter(),g=A.ctx.createGain();
      s.buffer=A.nb;f.type='bandpass';f.Q.value=1.2;
      f.frequency.setValueAtTime(500,t);f.frequency.exponentialRampToValueAtTime(2200,t+.12);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09,t+.07);g.gain.exponentialRampToValueAtTime(.0001,t+.14);
      s.connect(f);f.connect(g);g.connect(A.sfx);s.start(t,Math.random()*.8);s.stop(t+.16);
    },
    pour:function(){
      if(!A.on||realm!=='dejavu')return;var t=A.ctx.currentTime,i;
      for(i=0;i<16;i++)noise(t+i*.1,.1,.05,'bandpass',700+i*70+Math.random()*200,A.sfx);
      noise(t,1.6,.04,'lowpass',1200,A.sfx);
    },
    glass:function(){
      if(!A.on||realm!=='dejavu')return;var t=A.ctx.currentTime;
      pluck(2637,t,.45,.05,'sine',A.sfx);pluck(3951,t,.3,.03,'sine',A.sfx);noise(t,.03,.06,'highpass',4000,A.sfx);
    },
    slide:function(){if(!A.on||realm!=='dejavu')return;var t=A.ctx.currentTime;noise(t,.9,.07,'lowpass',700,A.sfx)},
    thunder:function(){
      if(!A.on||realm!=='dejavu')return;var t=A.ctx.currentTime;
      noise(t,2.2,.3,'lowpass',160,A.sfx);noise(t+.1,1.4,.2,'lowpass',320,A.sfx);
    },
    glitch:function(){if(!A.on)return;var t=A.ctx.currentTime;noise(t,.12,.08,'bandpass',2400,A.sfx);pluck(220,t,.1,.05,'square',A.sfx)},
    enter:function(){if(!A.on)return;var t=A.ctx.currentTime;pluck(294,t,.5,.1,'triangle',A.sfx);pluck(440,t+.12,.5,.1,'triangle',A.sfx);pluck(587,t+.24,.7,.1,'triangle',A.sfx)}
  };

  /* ======================= FIRE SOUND ======================= */
  var FS={src:null,g:null,f:null,timer:null,n:0};
  function fireSoundStart(){
    if(!A.ctx||!A.on||FS.timer)return;
    var c=A.ctx;
    FS.src=c.createBufferSource();FS.src.buffer=A.nb;FS.src.loop=true;
    FS.f=c.createBiquadFilter();FS.f.type='lowpass';FS.f.frequency.value=520;FS.f.Q.value=.6;
    FS.g=c.createGain();FS.g.gain.value=.0001;
    FS.src.connect(FS.f);FS.f.connect(FS.g);FS.g.connect(A.sfx);
    FS.src.start();
    FS.g.gain.setTargetAtTime(.13,c.currentTime,.6);
    FS.timer=setInterval(function(){
      if(!A.ctx||!A.on)return;
      var t=A.ctx.currentTime,r=Math.random();
      FS.n+=.11;
      var swell=.5+.5*Math.sin(FS.n*1.7)*Math.sin(FS.n*.63+1);
      var dj=realm==='dejavu';
      FS.f.frequency.setTargetAtTime((dj?260:380)+swell*(dj?320:420),t,.12);
      FS.g.gain.setTargetAtTime((dj?.15:.1)+swell*.07,t,.15);
      if(r<(dj?.62:.5))noise(t,.008+Math.random()*.03,.04+Math.random()*.09,'bandpass',1400+Math.random()*3600,A.sfx);
      if(r<.12){noise(t,.012,.12+Math.random()*.1,'highpass',3200,A.sfx);noise(t+.03,.01,.07,'highpass',4200,A.sfx)}
      if(r>.97)noise(t,.06,.14,'bandpass',900,A.sfx);
    },110);
  }
  function fireSoundStop(){
    if(FS.timer){clearInterval(FS.timer);FS.timer=null}
    if(FS.src&&A.ctx){
      var s=FS.src,g=FS.g;
      try{g.gain.setTargetAtTime(.0001,A.ctx.currentTime,.12);s.stop(A.ctx.currentTime+.6)}catch(e){}
      FS.src=null;
    }
  }
  var DS={timer:null,n:0,nodes:[]};
  function dimSoundStart(){
    if(!A.ctx||!A.on||DS.timer)return;
    var c=A.ctx;
    DS.cn=c.createBufferSource();DS.cn.buffer=A.nb;DS.cn.loop=true;
    DS.cf=c.createBiquadFilter();DS.cf.type='bandpass';DS.cf.frequency.value=480;DS.cf.Q.value=.8;
    DS.cg=c.createGain();DS.cg.gain.value=.0001;
    DS.cn.connect(DS.cf);DS.cf.connect(DS.cg);DS.cg.connect(A.sfx);
    DS.rn=c.createBufferSource();DS.rn.buffer=A.nb;DS.rn.loop=true;
    var rf=c.createBiquadFilter();rf.type='highpass';rf.frequency.value=4200;
    DS.rg=c.createGain();DS.rg.gain.value=.0001;
    DS.rn.connect(rf);rf.connect(DS.rg);DS.rg.connect(A.sfx);
    DS.cn.start();DS.rn.start();DS.nodes=[DS.cn,DS.rn];
    DS.cg.gain.setTargetAtTime(.05,c.currentTime,1);DS.rg.gain.setTargetAtTime(.02,c.currentTime,1.2);
    DS.timer=setInterval(function(){
      if(!A.ctx||!A.on)return;
      var t=A.ctx.currentTime;DS.n+=.1;
      var s=.5+.5*Math.sin(DS.n*2.3)*Math.sin(DS.n*.9+1);
      DS.cf.frequency.setTargetAtTime(380+s*340,t,.1);
      DS.cg.gain.setTargetAtTime(.035+s*.045,t,.12);
      DS.rg.gain.setTargetAtTime(.016+.008*Math.sin(DS.n*.4),t,.3);
      if(Math.random()<.025)sfx.glass();
      if(Math.random()<.012)noise(t,.18,.05,'lowpass',260,A.sfx);
    },100);
  }
  function dimSoundStop(){
    if(DS.timer){clearInterval(DS.timer);DS.timer=null}
    if(A.ctx&&DS.nodes.length){
      var t=A.ctx.currentTime,ns=DS.nodes;DS.nodes=[];
      try{DS.cg.gain.setTargetAtTime(.0001,t,.15);DS.rg.gain.setTargetAtTime(.0001,t,.15)}catch(e){}
      ns.forEach(function(n){try{n.stop(t+.8)}catch(e){}});
    }
  }
  function fireSoundSync(){
    if(A.on){if(realm==='dejavu'){fireSoundStop();dimSoundStart()}else{dimSoundStop();fireSoundStart()}}
    else{fireSoundStop();dimSoundStop()}
  }

/* ======================= REALMS: portal + Deja Vu scene ======================= */
  var ptr={x:0,y:0,t:-99};
  ['pointermove','pointerdown'].forEach(function(n){window.addEventListener(n,function(e){ptr.x=e.clientX;ptr.y=e.clientY;ptr.t=performance.now()/1000},{passive:true})});
  var portalHover=false;
  function drawPortal(t,tint){
    /* the old portal spot now holds a wall item: a tool rack in the smithy, a wall clock in the bar */
    var cx0=148,ii,jj;
    if(tint==='fire'){
      /* Familiar Bar: brass wall clock with a swinging pendulum */
      var cy0=15,Rr=8;
      for(jj=-Rr;jj<=Rr;jj++)for(ii=-Rr;ii<=Rr;ii++){
        var dd=Math.sqrt(ii*ii+jj*jj);
        if(dd<=Rr){R(hg,cx0+ii,cy0+jj,1,1,dd>Rr-1.4?'#a8812e':dd>Rr-2.2?'#6a4c18':'#efe0b8')}
      }
      R(hg,cx0-Rr+2,cy0-Rr+2,2,1,'rgba(255,255,255,.5)');
      for(ii=0;ii<12;ii++){var an=ii/12*6.2832;R(hg,cx0+Math.round(Math.sin(an)*5.2),cy0-Math.round(Math.cos(an)*5.2),1,1,ii%3?'#7a5a28':'#3a2810')}
      var ma=(t*.2)%6.2832,ha=(t*.017)%6.2832,sa=(t*3)%6.2832;
      for(ii=1;ii<=4;ii++)R(hg,cx0+Math.round(Math.sin(ha)*ii*.8),cy0-Math.round(Math.cos(ha)*ii*.8),1,1,'#2a1a0c');
      for(ii=1;ii<=5;ii++)R(hg,cx0+Math.round(Math.sin(ma)*ii),cy0-Math.round(Math.cos(ma)*ii),1,1,'#3a2810');
      R(hg,cx0+Math.round(Math.sin(sa)*5),cy0-Math.round(Math.cos(sa)*5),1,1,'#c0392b');
      R(hg,cx0,cy0,1,1,'#c9953a');
      var pw=Math.round(Math.sin(t*2.4)*3);
      R(hg,cx0,cy0+Rr+1,1,6,'#8a6a2a');R(hg,cx0+pw-1,cy0+Rr+7,3,3,'#c9953a');R(hg,cx0+pw-1,cy0+Rr+7,3,1,'#f0d078');
      hg.globalCompositeOperation='lighter';glow(hg,cx0,cy0,16,'255,200,110',.1);hg.globalCompositeOperation='source-over';
    }else{
      /* Smithing House: wooden tool rack with hammer, tongs and a chisel, lit by the forge glow */
      R(hg,cx0-11,6,22,20,'#2a1a10');R(hg,cx0-10,7,20,18,'#4a3220');
      for(ii=0;ii<20;ii+=5)R(hg,cx0-10+ii,7,1,18,'#3a2616');
      R(hg,cx0-10,7,20,1,'#6a4a30');R(hg,cx0-10,24,20,1,'#2e1c10');
      for(jj=0;jj<3;jj++){R(hg,cx0-9+jj*7,9,2,2,'#1a1a20');R(hg,cx0-9+jj*7,9,1,1,'#a0a0b0')}
      /* hammer */
      R(hg,cx0-8,11,1,11,'#8a5a2a');R(hg,cx0-8,11,1,11,'#7a4c22');R(hg,cx0-10,11,5,3,'#5a5a68');R(hg,cx0-10,11,5,1,'#a8a8b8');R(hg,cx0-5,12,1,1,'#3a3a44');
      /* tongs */
      R(hg,cx0-1,11,1,9,'#6a6a78');R(hg,cx0+1,11,1,9,'#5a5a68');R(hg,cx0-2,19,1,3,'#6a6a78');R(hg,cx0+2,19,1,3,'#5a5a68');R(hg,cx0,10,1,1,'#3a3a44');
      /* chisel */
      R(hg,cx0+6,10,2,7,'#b0b0c0');R(hg,cx0+6,10,1,7,'#e0e0f0');R(hg,cx0+6,17,2,5,'#8a5a2a');
      /* glints that follow the forge glow */
      hg.globalAlpha=.4+.3*Math.sin(t*3);R(hg,cx0-9,12,1,1,'#ffd890');R(hg,cx0+6,11,1,1,'#ffd890');hg.globalAlpha=1;
      hg.globalCompositeOperation='lighter';glow(hg,cx0,16,18,'255,150,60',.07);hg.globalCompositeOperation='source-over';
    }
    return;
    var fire=tint==='fire',cx=148,r=6,ri=4,top=7,bot=22,cyc=15;
    if(fire){var off=Math.round(Math.sin(t*1.3)*1.5);top+=off;bot+=off;cyc+=off}
    var pal=fire?['#04201f','#0f6b64','#3fd0c0','#e0fff8']:['#14082a','#5b2a9a','#a45cff','#f0dcff'];
    var frame=fire?'#6a4a30':'#54443a',rgb=fire?'80,230,210':'170,100,255';
    var y,x,k;
    if(fire){
      R(hg,cx-10,bot,20,2,'#5a3a22');R(hg,cx-10,bot,20,1,'#7a5232');
      R(hg,cx-8,bot+2,16,1,'#3a2418');R(hg,cx-5,bot+3,10,1,'#2a180f');R(hg,cx-2,bot+4,4,1,'#1a0d07');
    }
    arch(hg,cx,top,bot,r,frame);
    R(hg,cx-r,top+r,1,bot-top-r,'rgba(255,255,255,.14)');
    R(hg,cx+r-1,top+r,1,bot-top-r,'rgba(0,0,0,.3)');
    var topI=top+2;
    for(y=topI;y<bot;y++){
      var half=y<topI+ri?Math.floor(Math.sqrt(Math.max(0,ri*ri-Math.pow(topI+ri-y-.5,2)))):ri;
      for(x=-half;x<half;x++){
        var dx=x+.5,dy=y-cyc;
        var ang=Math.atan2(dy*1.2,dx),rad=Math.sqrt(dx*dx+dy*dy*1.3);
        var v=Math.sin(ang*2+rad*1.1-t*3.2)+Math.sin(rad*1.5+t*2)*.5;
        var idx=v>.9?3:v>.2?2:v>-.5?1:0;
        if(portalHover&&idx<3)idx++;
        R(hg,cx+x,y,1,1,pal[idx]);
      }
    }
    R(hg,cx-1,top-1,2,2,'#7a6552');
    for(k=0;k<3;k++){
      var a2=Math.PI+(k+.5)/3*Math.PI;
      hg.globalAlpha=.45+.55*Math.abs(Math.sin(t*2+k*.8));
      R(hg,cx+Math.cos(a2)*(r-1),top+r+Math.sin(a2)*(r-1),1,1,pal[3]);
    }
    hg.globalAlpha=1;
    hg.globalCompositeOperation='lighter';
    glow(hg,cx,cyc,11+(portalHover?5:0),rgb,.34+.08*Math.sin(t*3)+(portalHover?.14:0));
    glow(hg,cx,cyc+2,24,rgb,.08);
    hg.globalCompositeOperation='source-over';
  }

  /* ======================= FAMILIAR BAR scene ======================= */
  var GLY={
    A:['.###.','#...#','#...#','#####','#...#','#...#','#...#'],
    B:['####.','#...#','#...#','####.','#...#','#...#','####.'],
    F:['#####','#....','#....','####.','#....','#....','#....'],
    I:['#####','..#..','..#..','..#..','..#..','..#..','#####'],
    L:['#....','#....','#....','#....','#....','#....','#####'],
    M:['#...#','##.##','#.#.#','#...#','#...#','#...#','#...#'],
    R:['####.','#...#','#...#','####.','#.#..','#..#.','#...#'],
    S:['.####','#....','#....','.###.','....#','....#','####.'],
    T:['#####','..#..','..#..','..#..','..#..','..#..','..#..'],
    N:['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#'],
    G:['.####','#....','#....','#.###','#...#','#...#','.###.'],
    H:['#...#','#...#','#...#','#####','#...#','#...#','#...#'],
    O:['.###.','#...#','#...#','#...#','#...#','#...#','.###.'],
    U:['#...#','#...#','#...#','#...#','#...#','#...#','.###.'],
    E:['#####','#....','#....','####.','#....','#....','#####']
  };
  function glyphs(str,fn){
    var ox=0,c,r,q,g;
    for(c=0;c<str.length;c++){
      g=GLY[str.charAt(c)];
      if(g)for(r=0;r<7;r++)for(q=0;q<5;q++)if(g[r].charAt(q)==='#')fn(ox+q,r);
      ox+=6;
    }
  }
  var dvbg=document.createElement('canvas');dvbg.width=160;dvbg.height=88;
  var dvfg=document.createElement('canvas');dvfg.width=160;dvfg.height=88;
  (function(){
    var b=dvbg.getContext('2d'),f=dvfg.getContext('2d'),x,y,i;
    /* back wall */
    R(b,0,0,160,64,'#1c1014');
    var bk=['#2a1a1e','#311e22','#26171b'];
    for(y=4;y<50;y+=4)for(x=-4+((y/4)%2)*4;x<160;x+=8){R(b,x+1,y+1,7,3,bk[Math.floor(sr(x*3+y*11)*3)]);R(b,x+1,y+1,7,1,'rgba(255,255,255,.04)')}
    R(b,0,0,160,3,'#3a2217');R(b,0,3,160,1,'#5a3a22');R(b,0,4,160,1,'#0e0709');
    R(b,0,50,160,13,'#26160f');for(x=0;x<160;x+=8)R(b,x,50,1,13,'#170c08');
    R(b,0,49,160,1,'#6a4426');R(b,0,50,160,1,'#3a2418');
    /* rainy window with a night skyline */
    R(b,7,11,28,33,'#4a2d1c');R(b,9,13,24,29,'#0a1322');
    [[9,34,5,8],[14,31,4,11],[18,35,6,7],[24,29,4,13],[28,33,5,9]].forEach(function(s){R(b,s[0],s[1],s[2],s[3],'#05080f')});
    for(i=0;i<16;i++){R(b,10+Math.floor(sr(i+40)*21),31+Math.floor(sr(i+60)*10),1,1,i%3?'#ffd98a':'#7fd0ff')}
    R(b,20,13,2,29,'#4a2d1c');R(b,9,26,24,2,'#4a2d1c');
    R(b,6,44,30,2,'#6a4426');R(b,6,44,30,1,'#8a5a32');
    R(b,9,13,3,29,'#6a1e2a');R(b,30,13,3,29,'#6a1e2a');R(b,10,13,1,29,'#8a2e3c');R(b,31,13,1,29,'#8a2e3c');
    /* mirror */
    R(b,47,8,80,21,'#8a5a22');R(b,47,8,80,1,'#c9953a');R(b,49,10,76,17,'#26353d');
    for(i=0;i<3;i++)for(y=0;y<17;y++)R(b,53+i*26+Math.floor(y*.8),10+y,3,1,'#33454e');
    /* back bar: bottles and glasses */
    R(b,44,32,86,2,'#6a4426');R(b,44,32,86,1,'#8a5a32');R(b,44,34,86,1,'#1a0d07');
    var bc=['#2f6b3a','#7a3a1a','#1f4f8a','#8a2a2a','#a8742a','#3a2f5a'];
    for(x=47,i=0;x<126;x+=6,i++){
      var h2=7+Math.floor(sr(i+7)*5),col=bc[i%6];
      R(b,x,32-h2,4,h2,col);R(b,x+1,32-h2-3,2,3,col);R(b,x+1,32-h2-4,2,1,'#d9a441');R(b,x,32-h2+1,1,h2-2,'rgba(255,255,255,.25)');
    }
    R(b,44,45,86,2,'#6a4426');R(b,44,45,86,1,'#8a5a32');R(b,44,47,86,1,'#1a0d07');
    for(x=47,i=0;x<126;x+=7,i++){
      if(i%3===1){R(b,x,40,5,5,'#7a4a24');R(b,x,41,5,1,'#4a2a10');R(b,x,43,5,1,'#4a2a10')}
      else{R(b,x,40,4,5,'rgba(170,210,225,.5)');R(b,x,40,4,1,'rgba(235,248,252,.85)')}
    }
    /* portal plank and menu board on the right wall */
    R(b,139,22,19,2,'#4a3020');R(b,139,22,19,1,'#6a4630');R(b,141,24,2,3,'#3a2418');R(b,154,24,2,3,'#3a2418');
    R(b,133,44,26,16,'#5a3a22');R(b,134,45,24,14,'#18241f');
    [[136,48,12],[136,51,16],[136,54,10]].forEach(function(l){R(b,l[0],l[1],l[2],1,'#cfd8c8')});
    R(b,150,48,3,1,'#e8c070');R(b,152,54,3,1,'#e8c070');
    /* foreground: counter, taps, stools */
    R(f,0,62,160,4,'#7a4a28');R(f,0,62,160,1,'#b07a46');R(f,0,66,160,1,'#3a2012');
    R(f,0,67,160,21,'#2e190f');
    for(x=4;x<160;x+=20){R(f,x,70,16,13,'#3a2113');R(f,x,70,16,1,'#4a2c1a');R(f,x,82,16,1,'#1b0e08')}
    R(f,0,84,160,2,'#c9953a');R(f,0,84,160,1,'#f0c566');R(f,0,86,160,2,'#150a06');
    [98,110].forEach(function(kx){
      R(f,kx,50,11,12,'#7a4a24');R(f,kx,50,11,1,'#a8703c');R(f,kx+1,52,9,1,'#2a1a14');R(f,kx+1,58,9,1,'#2a1a14');
      R(f,kx+10,50,1,12,'#4a2a14');R(f,kx+2,51,2,10,'#9a6430');R(f,kx+4,60,3,2,'#e8b040');R(f,kx+5,56,1,1,'#2a1a14');
    });
    R(f,141,58,4,4,'#d8cba8');R(f,141,58,4,1,'#fff6dc');
    [22,60,100,132].forEach(function(sx){
      R(f,sx-6,77,12,3,'#7a2430');R(f,sx-6,77,12,1,'#a43a48');R(f,sx-1,80,2,8,'#150a06');R(f,sx-4,86,8,1,'#150a06');
    });
  })();
  var bar={rain:[],smoke:[],motes:[],drips:[],splash:[],notes:[],noteAt:1,flash:-1,flashAt:8,pt:0};
  (function(){
    var i;
    for(i=0;i<26;i++)bar.rain.push({x:11+Math.random()*20,y:14+Math.random()*26,v:35+Math.random()*40});
    for(i=0;i<5;i++)bar.drips.push({x:11+Math.random()*20,y:14+Math.random()*26,v:5+Math.random()*7});
    for(i=0;i<24;i++)bar.motes.push({x:20+Math.random()*120,y:12+Math.random()*50,p:Math.random()*6,v:1+Math.random()*3});
  })();
  var BC=13;
  function bl(a,b,k){return a+(b-a)*k}
  function barState(t){
    var u=t%BC,k,s={gx:75,gy:50,fill:0,vis:true,ax:72,ay:51,bx:77,by:51,bth:0,bhx:88,bhy:57,pour:0,look:0,cloth:true};
    if(u<5){var w=u*7;s.bx=77+Math.cos(w)*1.2;s.by=51+Math.sin(w)*2}
    else if(u<6.2){
      k=wEase((u-5)/.6);s.gy=bl(50,40,k);s.gx=bl(75,74,k);s.look=k;
      s.ax=s.gx-3;s.ay=s.gy+1;s.bx=s.gx+2;s.by=s.gy+1;
    }else if(u<7.2){
      k=wEase((u-6.2)/.8);s.gx=bl(74,76,k);s.gy=bl(40,59,k);s.look=1-k;
      s.ax=s.gx-3;s.ay=s.gy;s.bx=s.gx+3;s.by=s.gy;
    }else if(u<8){
      k=wEase((u-7.2)/.8);s.gx=76;s.gy=59;
      s.ax=bl(73,70,k);s.ay=bl(59,55,k);s.bx=bl(79,88,k);s.by=bl(59,57,k);s.cloth=false;
    }else if(u<8.6){
      k=wEase((u-8)/.6);s.gx=76;s.gy=59;s.ax=70;s.ay=55;
      s.bx=bl(88,80,k);s.by=bl(57,49.4,k);s.bth=130*k;s.bhx=s.bx;s.bhy=s.by;s.cloth=false;s.bholdb=1;
    }else if(u<10.2){
      s.gx=76;s.gy=59;s.ax=70;s.ay=55;s.bx=80;s.by=49.4;s.bth=130;s.bhx=80;s.bhy=49.4;
      s.fill=(u-8.6)/1.6;s.pour=1;s.cloth=false;s.bholdb=1;s.look=1;
    }else if(u<10.9){
      k=wEase((u-10.2)/.7);s.gx=76;s.gy=59;s.fill=1;
      s.bx=bl(80,88,k);s.by=bl(49.4,57,k);s.bth=130*(1-k);s.bhx=s.bx;s.bhy=s.by;s.bholdb=1;
      s.ax=bl(70,73,k);s.ay=bl(55,58,k);s.cloth=false;
    }else if(u<12){
      k=wEase((u-10.9)/1.1);s.fill=1;s.gx=bl(76,112,k);s.gy=59;
      s.ax=Math.min(s.gx-3,82);s.ay=58;s.bx=87;s.by=56;s.cloth=false;
    }else{
      s.fill=1;s.gx=112;s.gy=59;s.vis=u<12.35;s.ax=70;s.ay=55;s.bx=87;s.by=56;s.cloth=false;
    }
    return s;
  }
  function barLimb(x0,y0,x1,y1,col,sh){
    var n=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))),i,k;
    for(i=0;i<=n;i++){k=n?i/n:0;
      var px=Math.round(x0+(x1-x0)*k-1),py=Math.round(y0+(y1-y0)*k-1);
      if(sh)R(hg,px,py+1,3,2,sh);
      R(hg,px,py,3,2,col);
    }
  }
  function barArm(sx,sy,hx,hy){
    var Lm=8,dx=hx-sx,dy=hy-sy,d=Math.sqrt(dx*dx+dy*dy);
    if(d>2*Lm-.5){var sc=(2*Lm-.5)/d;dx*=sc;dy*=sc;d=2*Lm-.5;hx=sx+dx;hy=sy+dy}
    if(d<1)d=1;
    var hh=Math.sqrt(Math.max(0,Lm*Lm-d*d/4)),mx=sx+dx/2,my=sy+dy/2,px=-dy/d,py=dx/d;
    var e1y=my+py*hh,e2y=my-py*hh,ex=e1y>e2y?mx+px*hh:mx-px*hh,ey=e1y>e2y?e1y:e2y;
    barLimb(sx,sy,ex,ey,'#f2e6c8','#c0aa90');barLimb(ex,ey,hx,hy,'#f2c298','#d89066');
    R(hg,Math.round(hx-1),Math.round(hy-1),3,3,'#f2c298');R(hg,Math.round(hx-1),Math.round(hy+1),3,1,'#d89066');
  }
  function barGlass(gx,gy,fill){
    gx=Math.round(gx);gy=Math.round(gy);
    R(hg,gx-2,gy-3,5,6,'#b8d8e8');R(hg,gx-1,gy-3,3,5,'#6a98b8');R(hg,gx-2,gy-3,5,1,'#e8f6ff');
    var fh=Math.round(fill*4);
    if(fh>0){R(hg,gx-1,gy+2-fh,3,fh,'#e0902a');R(hg,gx-1,gy+2-fh,1,fh,'#f0b848');if(fill>.92)R(hg,gx-1,gy+2-fh,3,1,'#fff0c0')}
    R(hg,gx-2,gy+3,5,1,'#e8f6ff');
  }
  function barMage(px,sip){
    /* hooded wizard seen from behind, long grey hair, pointed hat */
    R(hg,px-8,62,16,16,'#5a4a9a');R(hg,px+3,62,5,16,'#3a2f70');R(hg,px-8,62,2,16,'#7a6ac0');R(hg,px-2,66,1,12,'#3a2f70');
    R(hg,px-10,63,3,5,'#5a4a9a');R(hg,px+7,63,3,5,'#3a2f70');
    R(hg,px-4,55-sip,8,9,'#c8ccd8');R(hg,px+1,55-sip,3,9,'#8a90a8');R(hg,px-4,55-sip,2,8,'#e8ecf4');
    R(hg,px-7,53-sip,14,2,'#3a2460');R(hg,px-7,53-sip,14,1,'#6a46a8');
    var cone=[[-5,52,10],[-4,51,8],[-4,50,8],[-3,49,6],[-3,48,6],[-2,47,4],[-2,46,4],[-1,45,3],[0,44,2],[1,43,2]];
    cone.forEach(function(c){R(hg,px+c[0],c[1]-sip,c[2],1,'#6a46a8');R(hg,px+c[0]+c[2]-2,c[1]-sip,2,1,'#4a3080')});
    R(hg,px-1,49-sip,1,1,'#ffd870');R(hg,px+1,47-sip,1,1,'#ffd870');
    R(hg,26,58,4,1,'#5a3a22');R(hg,25,57,2,2,'#5a3a22');
  }
  function barKnight(px,sip){
    /* a horned knight in a red cape, seen from behind */
    R(hg,px-7,63,14,15,'#a82a3a');R(hg,px+2,63,5,15,'#701c30');R(hg,px-7,63,2,15,'#c83c4a');
    R(hg,px-6,75,2,3,'#701c30');R(hg,px,76,3,2,'#701c30');
    R(hg,px-9,61,6,5,'#8aa0b0');R(hg,px+3,61,6,5,'#6a7a8a');R(hg,px-8,62,2,1,'#c8d8e4');R(hg,px+5,63,1,1,'#2a3644');
    R(hg,px-6,60,12,3,'#c83c4a');R(hg,px-6,60,12,1,'#e8606a');
    R(hg,px-3,59-sip,6,2,'#3a4654');
    R(hg,px-5,52-sip,10,8,'#6a7a8a');R(hg,px+2,52-sip,3,8,'#4a5a6a');R(hg,px-5,52-sip,10,2,'#8aa0b0');R(hg,px-1,52-sip,2,8,'#aab8c4');R(hg,px-5,59-sip,10,1,'#2a3644');
    R(hg,px-7,49-sip,2,6,'#4aa0e8');R(hg,px-8,48-sip,1,3,'#7ac8f8');R(hg,px+5,49-sip,2,6,'#2a78c0');R(hg,px+7,48-sip,1,3,'#4aa0e8');
  }
  function barRanger(px,sip,t){
    /* an elf ranger in a green hood, seen from behind */
    var sw=Math.round(Math.sin(t*1.5)*1),tw=(t%6)<.25?1:0;
    R(hg,px-8,62,16,16,'#3a7a5a');R(hg,px-8,62,2,16,'#5aa87a');R(hg,px+3,62,5,16,'#285a46');R(hg,px-1,66,1,12,'#285a46');
    R(hg,px-6,77,2,2,'#285a46');R(hg,px+1,78,3,1,'#1a3a34');
    R(hg,px-10,63,3,5,'#3a7a5a');R(hg,px+7,63,3,5,'#285a46');
    var i;for(i=0;i<9;i++)R(hg,px-6+i,61+i,2,1,'#5a3a22');
    R(hg,px+4,57,4,13,'#7a4a28');R(hg,px+7,57,1,13,'#4a2a18');R(hg,px+4,57,1,13,'#a8703c');
    R(hg,px+4,54,1,3,'#c83c4a');R(hg,px+6,55,1,2,'#f2e6c8');R(hg,px+5,53,1,2,'#c83c4a');
    R(hg,px-1+sw,60,3,8,'#f0d8a0');R(hg,px+1+sw,60,1,8,'#c8a868');
    R(hg,px-5,52-sip,10,10,'#3a7a5a');R(hg,px+2,52-sip,3,10,'#285a46');R(hg,px-4,52-sip,6,1,'#5aa87a');
    R(hg,px-2,50-sip,5,2,'#3a7a5a');R(hg,px-1,49-sip,3,1,'#285a46');
    R(hg,px-8,56-sip-tw,3,1,'#f2c298');R(hg,px+5,56-sip-tw,3,1,'#f2c298');R(hg,px-9,55-sip-tw,1,1,'#f2c298');R(hg,px+8,55-sip-tw,1,1,'#d89066');
  }
  var npc={open:false,typing:false};
  function barDwarf(px,sip,tk,t){
    /* a stocky dwarf patron seen from behind: iron helm, braided ginger beard, brown cloak */
    var hb=sip+tk;
    R(hg,px-8,62,16,16,'#8a5230');R(hg,px-8,62,2,16,'#a8683c');R(hg,px+3,62,5,16,'#5a3320');R(hg,px-1,66,1,12,'#5a3320');
    R(hg,px-6,77,2,2,'#5a3320');R(hg,px+1,78,3,1,'#3a2014');
    R(hg,px-10,63,3,5,'#8a5230');R(hg,px+7,63,3,5,'#5a3320');
    R(hg,px-9,60,5,4,'#8d95a3');R(hg,px+4,60,5,4,'#6b7280');R(hg,px-8,60,3,1,'#c9d0dc');
    R(hg,px-6,57-hb,12,3,'#c8642a');R(hg,px+3,57-hb,3,3,'#8a3e1a');
    R(hg,px-7,57,2,9,'#c8642a');R(hg,px-7,58,1,7,'#f0983c');R(hg,px+5,57,2,9,'#a04e1e');
    R(hg,px-6,63,1,1,'#3a2014');R(hg,px-7,66,1,1,'#3a2014');R(hg,px+6,64,1,1,'#3a2014');
    R(hg,px-5,50-hb,10,8,'#7a8494');R(hg,px+2,50-hb,3,8,'#4e5666');R(hg,px-5,50-hb,10,2,'#aab4c4');R(hg,px-1,50-hb,2,8,'#9aa4b4');
    R(hg,px-6,57-hb,12,1,'#3a4252');
    R(hg,px-1,47-hb,2,3,'#6b7280');R(hg,px-1,46-hb,2,1,'#c9d0dc');
    R(hg,px-8,52-hb,3,2,'#e8e0d0');R(hg,px+5,52-hb,3,2,'#c8c0b0');
  }
  function barLute(){
    R(hg,151,55,6,7,'#9a5a30');R(hg,150,57,8,4,'#9a5a30');R(hg,151,55,1,6,'#c88a50');R(hg,156,56,1,5,'#6a3a20');R(hg,153,58,2,2,'#2a1620');
    for(var r=0;r<11;r++)R(hg,154-Math.round(r*.2),55-r,2,1,'#6a3a20');
    R(hg,150,42,4,3,'#4a2a18');R(hg,150,42,1,1,'#e8b040');R(hg,153,44,1,1,'#e8b040');R(hg,152,60,4,1,'#2a1620');
  }
  function barBottle(hx,hy,th){
    var rad=th*Math.PI/180,dx=-Math.sin(rad),dy=-Math.cos(rad),s2;
    for(s2=-5;s2<=5;s2+=.5){
      var w=s2>3?2:3;
      R(hg,Math.round(hx+dx*s2-(w>2?1:0)),Math.round(hy+dy*s2-(w>2?1:0)),w,w,s2>3?'#9a5a30':'#5a2a20');
    }
    R(hg,Math.round(hx-1),Math.round(hy-1),2,2,'#f2e6c8');
    R(hg,Math.round(hx+dx*5.5),Math.round(hy+dy*5.5),2,2,'#e8b040');
  }
  var BNEON='BAR';
  /* ---- chibi sprite art: chunky pixels, hue-shifted shading, thick dark outline ---- */
  var SPAL={o:'#120c1c',b:'#3a8aa8',B:'#2a5a78',L:'#7ac8e8',d:'#6a2a1e',h:'#c8642a',H:'#f0983c',k:'#f2c298',K:'#d89066',j:'#a85e58',w:'#fff4e0',e:'#1c1020',m:'#7a1e3a',c:'#f2e6c8',C:'#c0aa90',S:'#7a6478',a:'#8a5a38',A:'#5a3428',g:'#e8b040',z:'#32202c'};
  var SHEAD=[
    '.....oooooooooo.....',
    '...ooobbbbbbbbooo...',
    '..obLLbbbbbbbbbBBo..',
    '..oBBBBBBBBBBBBBBo..',
    '..odkKhhkkkkkhhKdo..',
    '..odkkiikkkkiikkdo..',
    '..odkkeekkkkeekkdo..',
    '..odkjkkKKKKkkjkdo..',
    '..odHhhhhhhhhhhhdo..',
    '.ohHhhhhmmmmhhhhddo.',
    '.ohHhhhhhhhhhhhhddo.',
    '..ohhHhhhhhhhhhddo..',
    '...ohhhhhhhhhhddo...',
    '.....oooooooooo.....'
  ];
  var STORSO=[
    '..oooooooooooooooo..',
    '.occcAAaaaaaaAAcCSo.',
    '.occcAaaaaaaaaAcCSo.',
    '.occCaaagaaagaaCCSo.',
    '.occCaaaaaaaaaaCCSo.',
    '.ocCCAaaaaaaaaACSSo.',
    '.oCCCAAaaaaaaAACSSo.',
    '.oSSzzzzgggzzzzSSSo.',
    '.oSSAaaaaaaaaaaASSo.'
  ];
  function sprite(rows,x,y){
    var r,c,ch,s,run;
    for(r=0;r<rows.length;r++){
      c=0;
      while(c<rows[r].length){
        ch=rows[r].charAt(c);
        if(ch==='.'){c++;continue}
        s=c;while(c<rows[r].length&&rows[r].charAt(c)===ch)c++;
        R(hg,x+s,y+r,c-s,1,SPAL[ch]);
      }
    }
  }
  var olC=document.createElement('canvas');olC.width=160;olC.height=88;
  var olX=olC.getContext('2d'),siC=document.createElement('canvas');siC.width=160;siC.height=88;
  var siX=siC.getContext('2d');
  /* draw a figure on its own layer, then ink a dark outline around it, like a hand-made sprite */
  function outlined(fn){
    var real=hg;
    olX.clearRect(0,0,160,88);hg=olX;
    try{fn()}finally{hg=real}
    siX.globalCompositeOperation='source-over';siX.clearRect(0,0,160,88);siX.drawImage(olC,0,0);
    siX.globalCompositeOperation='source-in';siX.fillStyle='#120c1c';siX.fillRect(0,0,160,88);
    hg.drawImage(siC,-1,0);hg.drawImage(siC,1,0);hg.drawImage(siC,0,-1);hg.drawImage(siC,0,1);
    hg.drawImage(olC,0,0);
  }
  var lmC=document.createElement('canvas');lmC.width=160;lmC.height=88;
  var lmX=lmC.getContext('2d'),lmI=lmX.createImageData(160,88);
  var BLX=[38,80,122];
  /* dithered light map: darkness everywhere except pools of light */
  function barLight(t,fl,neonOn){
    var d=lmI.data,x,y,k,I,dx,dy,v,a,q,th,j=0,fk=1+.025*Math.sin(t*37)+.02*Math.sin(t*23),
        lf=[1+.05*Math.sin(t*5.1),1+.05*Math.sin(t*4.3+1),1+.05*Math.sin(t*6.2+2)];
    for(y=0;y<88;y++)for(x=0;x<160;x++,j+=4){
      I=.17;
      for(k=0;k<3;k++){
        dx=(x-BLX[k])/27;dy=(y-42)/40;v=1-Math.sqrt(dx*dx+dy*dy);
        if(v>0)I+=v*1.05*lf[k];
      }
      dx=(x-147)/24;dy=(y-35)/20;v=1-Math.sqrt(dx*dx+dy*dy);if(v>0)I+=v*(neonOn?.55:.2);
      dx=(x-21)/17;dy=(y-28)/20;v=1-Math.sqrt(dx*dx+dy*dy);if(v>0)I+=v*(.28+fl*1.6);
      dx=(x-143)/12;dy=(y-57)/10;v=1-Math.sqrt(dx*dx+dy*dy);if(v>0)I+=v*.5;
      dx=(x-148)/18;dy=(y-15)/16;v=1-Math.sqrt(dx*dx+dy*dy);if(v>0)I+=v*.55;
      if(y>29&&y<48&&x>44&&x<130)I+=.2*(1-Math.abs(y-38)/10>0?1-Math.abs(y-38)/10:0);
      if(y>59&&y<66)I+=.1;
      I*=fk;if(I>1)I=1;
      a=(1-I)*.84;
      th=(BY[(y&3)*4+(x&3)]+.5)/16;
      q=Math.floor(a*7+th)/7;
      d[j]=7;d[j+1]=3;d[j+2]=14;d[j+3]=q*255;
    }
    lmX.putImageData(lmI,0,0);
    hg.drawImage(lmC,0,0);
  }
  function drawDV(t){
    var i,k,x,y,st=barState(t),u=t%BC;
    hg.globalCompositeOperation='source-over';
    hg.clearRect(0,0,160,88);
    hg.drawImage(dvbg,0,0);
    /* window: fogged glass, rain, running drops, lightning */
    var fl=bar.flash>=0?Math.max(0,1-(t-bar.flash)/.5):0;
    if(fl>0){hg.globalAlpha=fl*.85;R(hg,9,13,24,29,'#cfe2ff');hg.globalAlpha=1}
    hg.globalAlpha=.1;R(hg,9,30,24,12,'#aac4d8');hg.globalAlpha=1;
    for(i=0;i<bar.rain.length;i++){
      var rd=bar.rain[i];
      hg.globalAlpha=.8;R(hg,Math.round(rd.x),Math.round(rd.y),1,2,'#6fa0c8');
      hg.globalAlpha=.3;R(hg,Math.round(rd.x),Math.round(rd.y)-2,1,2,'#6fa0c8');
    }
    for(i=0;i<bar.drips.length;i++){
      var dr=bar.drips[i];
      hg.globalAlpha=.25;R(hg,Math.round(dr.x),Math.round(dr.y)-5,1,5,'#cfe2ff');
      hg.globalAlpha=.85;R(hg,Math.round(dr.x),Math.round(dr.y),1,1,'#e6f1ff');
    }
    hg.globalAlpha=1;
    R(hg,20,13,2,29,'#4a2d1c');R(hg,9,26,24,2,'#4a2d1c');
    for(i=0;i<bar.splash.length;i++){var sp=bar.splash[i];hg.globalAlpha=1-sp.l/.18;R(hg,sp.x,43,1,1,'#9fc4e0');R(hg,sp.x-1,42,1,1,'#9fc4e0');R(hg,sp.x+1,42,1,1,'#9fc4e0')}
    hg.globalAlpha=1;
    /* mirror glare + wall clock */
    var gxm=52+((t*9)%100);
    if(gxm<121){hg.globalAlpha=.1;R(hg,gxm,10,3,17,'#ffffff');R(hg,gxm+4,10,1,17,'#ffffff');hg.globalAlpha=1}
    /* a heraldic shield on the wall */
    R(hg,37,22,9,1,'#8a5a22');R(hg,37,23,9,6,'#a82a3a');R(hg,44,23,2,6,'#701c30');R(hg,38,29,7,2,'#a82a3a');R(hg,39,31,5,1,'#701c30');R(hg,40,32,3,1,'#701c30');
    R(hg,41,23,1,9,'#e8b040');R(hg,38,26,7,1,'#e8b040');R(hg,37,23,1,6,'#c83c4a');
    /* hanging herbs */
    [59,101].forEach(function(fx){
      var sw=Math.round(Math.sin(t*1.1+fx)*1);
      R(hg,fx,4,1,3,'#3a2418');R(hg,fx-2+sw,7,5,4,'#4a6a3a');R(hg,fx-1+sw,11,3,2,'#3a5a2a');R(hg,fx-2+sw,7,2,1,'#7aaa52');R(hg,fx-1+sw,7,3,1,'#c9953a');R(hg,fx+1+sw,9,1,1,'#c83c4a');R(hg,fx-1+sw,9,1,1,'#e8b040');
    });
    hg.drawImage(dvfg,0,0);
    /* the cat on the counter */
    outlined(function(){
      hg.save();hg.translate(-6,0);
      var cb2=Math.round(Math.sin(t*1.9)*.5),tail=Math.round(Math.sin(t*1.7)*2);
      R(hg,46,57+cb2,9,5-cb2,'#4a4452');R(hg,47,57+cb2,7,1,'#6a6474');R(hg,52,59,3,3,'#3a3440');
      R(hg,53,54+cb2,5,5,'#4a4452');R(hg,53,52+cb2,1,3,'#4a4452');R(hg,57,52+cb2,1,3,'#4a4452');
      R(hg,54,53+cb2,1,1,'#e0a0a0');R(hg,53,54+cb2,5,1,'#6a6474');
      if((t%5.2)>.15){R(hg,54,56+cb2,1,1,'#e8d060');R(hg,56,56+cb2,1,1,'#e8d060')}
      R(hg,44,57+tail,2,1,'#4a4452');R(hg,43,58+tail,2,3,'#3a3440');R(hg,45,60,2,2,'#3a3440');
      hg.restore();
    });
    /* an enchanted lute leaning on the counter */
    outlined(function(){barLute()});
    var tk=npc.open&&npc.typing&&!npc.pause?Math.round(Math.sin(t*16)*.5+.5):0;
    if(!npc.open){
      var qb=Math.round(Math.sin(t*3));
      R(hg,70,40+qb,6,7,'#f4ecd8');R(hg,71,39+qb,4,1,'#f4ecd8');R(hg,71,47+qb,2,1,'#f4ecd8');R(hg,69,48+qb,1,1,'#f4ecd8');
      R(hg,72,41+qb,2,1,'#3a2418');R(hg,73,42+qb,1,1,'#3a2418');R(hg,72,43+qb,1,1,'#3a2418');R(hg,72,45+qb,1,1,'#3a2418');
    }
    /* patrons */
    /* patrons: the mage drinks, gets drunk and sleeps; Brokk gulps and burps; the ranger and the knight chat */
    function mug(x,lift){R(hg,x,58-lift,5,4,'#c8902c');R(hg,x,57-lift,5,1,'#f3e2b0');R(hg,x+5,59-lift,1,2,'#c8902c');R(hg,x,58-lift,1,4,'#e0b050')}
    function bub(x,y,k){
      outlined(function(){bubB(x,y,k)});
    }
    function bubB(x,y,k){
      R(hg,x,y,11,8,'#f4ecd8');R(hg,x+1,y-1,9,1,'#f4ecd8');R(hg,x+1,y+8,9,1,'#f4ecd8');R(hg,x+3,y+9,2,2,'#f4ecd8');R(hg,x+4,y+11,1,1,'#f4ecd8');
      var ink='#3a2418',q=Math.floor(t*4)%3,i3;
      if(k==='dots'){for(i3=0;i3<3;i3++)R(hg,x+2+i3*3,y+4-(q===i3?2:0),2,2,ink)}
      else if(k==='!'){R(hg,x+5,y+1,2,4,'#a82a3a');R(hg,x+5,y+6,2,1,'#a82a3a')}
      else if(k==='mug'){R(hg,x+3,y+2,4,4,'#c8902c');R(hg,x+3,y+2,4,1,'#f3e2b0');R(hg,x+7,y+3,1,2,'#c8902c')}
      else if(k==='heart'){R(hg,x+3,y+2,2,2,'#c83c4a');R(hg,x+6,y+2,2,2,'#c83c4a');R(hg,x+3,y+3,5,2,'#c83c4a');R(hg,x+4,y+5,3,1,'#c83c4a');R(hg,x+5,y+6,1,1,'#c83c4a')}
      else if(k==='hic'){R(hg,x+2,y+2,1,4,ink);R(hg,x+3,y+4,2,1,ink);R(hg,x+5,y+2,1,4,ink);R(hg,x+7,y+2,2,1,ink);R(hg,x+8,y+3,1,1,ink);R(hg,x+7,y+5,2,1,ink);R(hg,x+7,y+3,1,2,ink)}
    }
    /* mage: 26s loop. drinks, hiccups, slumps asleep, jolts awake */
    var mu=t%26,mHead=0,mLift=0,mBub=null;
    if(mu<7){mHead=(mu%7)<1.1?1:0;mLift=mHead*2}
    else if(mu<9){var mk=(mu-7)/2;mHead=mu<8?1:0;mLift=mHead*3;if(mu>=8.2&&mu<8.9)mBub='hic'}
    else if(mu<10.5){mHead=-Math.round((mu-9)/1.5*3)}
    else if(mu<22){mHead=-3+(Math.sin(t*1.3)>.7?1:0)}
    else if(mu<22.8){mHead=2;mBub='!'}
    else{mHead=(mu%3)<1?1:0;mLift=mHead*2}
    var sw1=mu>10&&mu<22?0:Math.round(Math.sin(t*.9)*.5+.3);
    outlined(function(){barMage(22,mHead+sw1);mug(30,mLift)});
    if(mBub)bub(18,36,mBub);
    if(mu>10.5&&mu<22){
      for(i=0;i<3;i++){
        var zp=((t*.5+i/3)%1);hg.globalAlpha=Math.sin(zp*Math.PI)*.9;
        var zx=28+Math.round(zp*8)+i*2,zy=Math.round(44-zp*16),zs=1+(i%2);
        R(hg,zx,zy,2+zs,1,'#cdd8ff');R(hg,zx+1+zs,zy+1,1,zs,'#cdd8ff');R(hg,zx,zy+1+zs,2+zs,1,'#cdd8ff');
      }
      hg.globalAlpha=1;
    }
    /* Brokk: 9s loop. a long gulp, then a burp */
    var du=(t+3)%9,dg=0,dl=0;
    if(du>=2&&du<4){dg=1;dl=du<3.5?3:2}
    outlined(function(){barDwarf(62,dg,tk,t);mug(70,dl)});
    if(du>=4&&du<5.2){
      var bp=(du-4)/1.2;hg.globalAlpha=1-bp;
      R(hg,66+Math.round(bp*5),48-Math.round(bp*6),3,2,'#e8e0d0');R(hg,68+Math.round(bp*5),47-Math.round(bp*6),2,1,'#e8e0d0');
      R(hg,72+Math.round(bp*5),44-Math.round(bp*7),4,2,'#c9d0dc');
      hg.globalAlpha=1;
    }
    /* the ranger and the knight talk to each other */
    var cu=t%14,rTalk=cu<5,kTalk=cu>=6&&cu<10.5,kLaugh=cu>=10.5&&cu<12.5,kDrink=cu>=12.5&&cu<13.6;
    var rBob=rTalk?Math.round(Math.sin(t*14)*.5+.5):0,kBob=kTalk?Math.round(Math.sin(t*15)*.5+.5):0;
    var rLift=(cu>=5&&cu<5.9)?2:0,kShake=kLaugh?Math.round(Math.sin(t*22)):0;
    var sip3=rBob+(rLift?1:0);
    outlined(function(){
      barRanger(100+(kTalk?1:0),sip3,t);mug(109,rLift);
    });
    outlined(function(){
      hg.save();hg.translate(kShake,0);
      barKnight(124,kBob+(kDrink?1:0)+(kLaugh?(kShake>0?1:0):0));
      hg.restore();mug(133,kDrink?3:0);
    });
    if(rTalk)bub(96,38,cu<2.5?'dots':'mug');
    if(kTalk)bub(120,38,cu<8.2?'dots':'!');
    if(kLaugh)bub(120,38,'heart');
    /* drifting smoke and haze (lit by the lights below) */
    for(i=0;i<bar.smoke.length;i++){
      var sm=bar.smoke[i],lf=sm.l/sm.m,sz=1+Math.floor(lf*4);
      hg.globalAlpha=.3*(1-lf);R(hg,sm.x,sm.y,sz,sz,'#b7a99a');
    }
    for(i=0;i<3;i++){
      hg.globalAlpha=.05+.02*Math.sin(t*.4+i);
      R(hg,((t*(2+i)+i*60)%230)-60,18+i*17,90,5+i,'#c9a58a');
    }
    hg.globalAlpha=1;
    /* the light map: pools of lamplight in a dark room */
    var neonOn=wR(Math.floor(t*9))<.93;
    barLight(t,fl,neonOn);
    /* emissive things drawn above the darkness */
    /* wooden tavern sign on chains */
    R(hg,139,24,1,6,'#3a3040');R(hg,155,24,1,6,'#3a3040');
    R(hg,136,30,24,13,'#3a2214');R(hg,137,31,22,11,'#6a4426');R(hg,137,31,22,1,'#8a5a32');R(hg,137,41,22,1,'#4a2c18');
    R(hg,143,33,6,6,'#e8b040');R(hg,143,32,6,1,'#fff4d0');R(hg,149,34,2,3,'#e8b040');R(hg,150,35,1,1,'#6a4426');R(hg,143,33,1,6,'#fff0a0');R(hg,148,33,1,6,'#b07a20');
    /* iron lanterns */
    for(k=0;k<3;k++){
      var sx=BLX[k]+Math.round(Math.sin(t*.7+k*1.3)*1.2);
      line(hg,BLX[k],4,sx,9,'#3a3040');
      R(hg,sx-1,9,3,1,'#2a2030');R(hg,sx-3,10,7,1,'#2a2030');R(hg,sx-4,11,9,1,'#4a4058');
      R(hg,sx-3,12,7,7,'#2a2030');R(hg,sx-2,13,5,5,'#ffcf6a');R(hg,sx-1,14,3,3,'#fff4c0');R(hg,sx,12,1,7,'#2a2030');
      R(hg,sx-4,19,9,1,'#4a4058');R(hg,sx-1,20,3,1,'#2a2030');
    }
    /* string lights along the beam */
    for(x=0;x<160;x+=2){
      var fr=(x%40)/40,wy=Math.round(5+3.2*Math.sin(fr*Math.PI));
      R(hg,x,wy,2,1,'#3a2418');
    }
    var SL=['#ffd98a','#ff8fb8','#7ff0e0','#ffb050'];
    for(i=0;i<18;i++){
      var bx2=4+i*9,fr2=(bx2%40)/40,by2=Math.round(5+3.2*Math.sin(fr2*Math.PI))+1;
      hg.globalAlpha=.55+.45*Math.abs(Math.sin(t*1.6+i*.9));
      R(hg,bx2,by2,1,2,SL[i%4]);
    }
    hg.globalAlpha=1;
    drawPortal(t,'fire');
    hg.globalAlpha=.6+.4*Math.abs(Math.sin(t*9+Math.sin(t*5)));
    R(hg,142,56,1,2,'#ffe2a0');R(hg,142,55,1,1,'#ff9a3c');
    hg.globalAlpha=1;
    /* floating notes from the gramophone */
    for(i=0;i<bar.notes.length;i++){
      var nt=bar.notes[i],nl=nt.l/nt.m;
      hg.globalAlpha=.9*(1-nl);
      var nx=Math.round(nt.x+Math.sin(t*2+nt.p)*2),ny=Math.round(nt.y);
      R(hg,nx,ny+2,2,2,nt.c);R(hg,nx+1,ny,1,3,nt.c);R(hg,nx+2,ny,1,1,nt.c);
    }
    hg.globalAlpha=1;
    /* glints on the bottles */
    for(i=0;i<4;i++){
      var gt=(t*.6+i*.37)%1.6;
      if(gt<.18){hg.globalAlpha=1-gt/.18;R(hg,47+Math.floor(sr(i*7+Math.floor(t*.6+i*.37)/1.6)*78),22+Math.floor(sr(i*3+Math.floor(t))*10),1,1,'#ffffff')}
    }
    hg.globalAlpha=1;
    /* dust in the light */
    for(i=0;i<bar.motes.length;i++){
      var mo=bar.motes[i];
      hg.globalAlpha=.25+.5*Math.abs(Math.sin(t*1.3+mo.p));R(hg,mo.x+Math.sin(t*.5+mo.p)*2,mo.y,1,1,'#ffe2a8');
    }
    hg.globalAlpha=1;
    /* warm and coloured light on top */
    hg.globalCompositeOperation='lighter';
    for(k=0;k<3;k++){
      var lx=BLX[k]+Math.round(Math.sin(t*.7+k*1.3)*1.2);
      var gr=hg.createLinearGradient(0,17,0,62);gr.addColorStop(0,'rgba(255,190,100,.2)');gr.addColorStop(1,'rgba(255,190,100,.03)');
      hg.fillStyle=gr;hg.beginPath();hg.moveTo(lx-2,17);hg.lineTo(lx-18,62);hg.lineTo(lx+18,62);hg.lineTo(lx+2,17);hg.closePath();hg.fill();
      glow(hg,lx,17,13,'255,200,120',.45+.04*Math.sin(t*5+k));
      R(hg,lx-9,62,18,1,'rgba(255,210,140,.28)');R(hg,lx-5,63,10,1,'rgba(255,230,170,.35)');
    }
    for(i=0;i<18;i+=2)glow(hg,4+i*9+1,Math.round(5+3.2*Math.sin(((4+i*9)%40)/40*Math.PI))+2,5,i%4===1?'255,140,190':'255,210,140',.14);
    glow(hg,147,35,18,'255,170,80',.2+.04*Math.sin(t*6));
    glow(hg,21,28,17,'110,170,255',.12+fl*.5);
    glow(hg,143,56,12,'255,170,70',.24+.05*Math.sin(t*8));
    /* moonlight shafts from the window */
    var sh=hg.createLinearGradient(33,14,90,60);sh.addColorStop(0,'rgba(150,190,255,.11)');sh.addColorStop(1,'rgba(150,190,255,0)');
    hg.fillStyle=sh;hg.beginPath();hg.moveTo(33,14);hg.lineTo(33,22);hg.lineTo(96,62);hg.lineTo(70,62);hg.closePath();hg.fill();
    hg.beginPath();hg.moveTo(33,28);hg.lineTo(33,38);hg.lineTo(128,62);hg.lineTo(110,62);hg.closePath();hg.fill();
    hg.globalCompositeOperation='source-over';
    if(fl>0.05){hg.globalAlpha=fl*.09;hg.fillStyle='#cfe2ff';hg.fillRect(0,0,160,88);hg.globalAlpha=1}
    /* film grain */
    for(i=0;i<46;i++){hg.globalAlpha=.07+Math.random()*.06;R(hg,Math.floor(Math.random()*160),Math.floor(Math.random()*88),1,1,Math.random()<.5?'#fff':'#000')}
    hg.globalAlpha=1;
    hg.drawImage(hvig,0,0);
  }
  function dvStep(dt,t){
    var i,u=t%BC,p=bar.pt;
    function cr(x){return p<=u?(p<x&&x<=u):(x>p||x<=u)}
    if(cr(7.1))sfx.glass();
    if(cr(8.6))sfx.pour();
    if(cr(10.9))sfx.slide();
    if(cr(12.5)){sfx.glass()}
    bar.pt=u;
    for(i=0;i<bar.rain.length;i++){
      var r=bar.rain[i];r.y+=r.v*dt;
      if(r.y>40){if(Math.random()<.35)bar.splash.push({x:Math.round(r.x),l:0});r.y=13;r.x=11+Math.random()*20}
    }
    for(i=0;i<bar.drips.length;i++){var dr=bar.drips[i];dr.y+=dr.v*dt;if(dr.y>41){dr.y=14;dr.x=11+Math.random()*20;dr.v=5+Math.random()*7}}
    for(i=bar.splash.length-1;i>=0;i--){bar.splash[i].l+=dt;if(bar.splash[i].l>.18)bar.splash.splice(i,1)}
    if(t>bar.noteAt){bar.notes.push({x:152,y:40,l:0,m:2.6,p:Math.random()*6,c:Math.random()<.5?'#ffd98a':'#ff9ccf'});bar.noteAt=t+1.1+Math.random()*1.4}
    for(i=bar.notes.length-1;i>=0;i--){var nt=bar.notes[i];nt.l+=dt;if(nt.l>nt.m){bar.notes.splice(i,1);continue}nt.y-=7*dt;nt.x+=1.5*dt}
    if(Math.random()<dt*2.5&&bar.smoke.length<26)bar.smoke.push({x:25+Math.random()*2,y:54,vx:2+Math.random()*3,vy:-(4+Math.random()*4),l:0,m:2+Math.random()*2});
    for(i=bar.smoke.length-1;i>=0;i--){
      var s=bar.smoke[i];s.l+=dt;
      if(s.l>s.m){bar.smoke.splice(i,1);continue}
      s.x+=s.vx*dt;s.y+=s.vy*dt;
    }
    for(i=0;i<bar.motes.length;i++){
      var m=bar.motes[i];m.y+=m.v*dt*.5;if(m.y>62){m.y=12;m.x=20+Math.random()*120}
    }
    if(bar.flash<0&&t>bar.flashAt){bar.flash=t;setTimeout(sfx.thunder,350+Math.random()*500)}
    if(bar.flash>=0&&t-bar.flash>.6){bar.flash=-1;bar.flashAt=t+9+Math.random()*12}
  }


/* ======================= ATMOSPHERE ======================= */
  var HW=160,HH=88;
  var hc=$('hero'),hg=hc.getContext('2d');
  hg.imageSmoothingEnabled=false;
  function R(c,x,y,w,hh,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(hh))}
  function line(c,x0,y0,x1,y1,col){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    var dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,er=dx+dy;
    c.fillStyle=col;
    for(var n=0;n<400;n++){
      c.fillRect(x0,y0,1,1);
      if(x0===x1&&y0===y1)break;
      var e2=2*er;
      if(e2>=dy){er+=dy;x0+=sx}
      if(e2<=dx){er+=dx;y0+=sy}
    }
  }
  function sr(n){var x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x)}
  function arch(c,cx,top,bottom,r,col){
    for(var y=top;y<bottom;y++){
      var half=r;
      if(y<top+r){var dy=top+r-y-.5;half=Math.floor(Math.sqrt(Math.max(0,r*r-dy*dy)))}
      if(col===null)c.clearRect(cx-half,y,half*2,1);else R(c,cx-half,y,half*2,1,col);
    }
  }
  function disc(c,cx,cy,r,col){
    for(var dy=-r;dy<=r;dy++){var half=Math.floor(Math.sqrt(r*r-dy*dy)+.5);R(c,cx-half,cy+dy,half*2,1,col)}
  }
  function glow(c,x,y,r,rgb,a){
    var gr=c.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,'rgba('+rgb+','+a+')');gr.addColorStop(1,'rgba('+rgb+',0)');
    c.fillStyle=gr;c.fillRect(x-r,y-r,r*2,r*2);
  }

  /* static layer: wall, floor, window frame, hearth stone, decor, anvil, barrel */
  var bgc=document.createElement('canvas');bgc.width=HW;bgc.height=HH;
  (function(){
    var b=bgc.getContext('2d'),i,x,y,r;
    /* wall */
    R(b,0,0,HW,64,'#1a1310');
    var shades=['#2b1f19','#2f231c','#271c16','#33261e'];
    for(r=0;r<8;r++){
      y=r*8;var off=(r%2)*8;
      for(x=-off;x<HW;x+=16){
        var sh=shades[Math.floor(sr(r*31+x)*4)];
        R(b,x+1,y+1,15,7,sh);R(b,x+1,y+1,15,1,'#3a2b22');R(b,x+1,y+7,15,1,'#1f1611');
      }
    }
    for(i=0;i<34;i++)R(b,Math.floor(sr(i)*158),55+Math.floor(sr(i+50)*8),2,1,'#2c3a24');
    /* floor */
    R(b,0,64,HW,24,'#2a211b');
    for(r=0;r<3;r++){
      y=64+r*8;var fo=(r%2)*12;
      for(x=-fo;x<HW;x+=24){
        var fs=['#2c2420','#332a24','#292019'][Math.floor(sr(r*17+x)*3)];
        R(b,x+1,y+1,23,7,fs);R(b,x+1,y+1,23,1,'#3d322a');
      }
    }
    R(b,0,62,HW,2,'#3a2c24');R(b,0,64,HW,1,'#120d0a');
    /* ceiling beam */
    R(b,0,0,HW,5,'#3d2818');
    for(x=3;x<HW;x+=11)R(b,x,1,6,1,'#4a3020');
    R(b,0,5,HW,1,'#1f1209');
    R(b,0,0,3,64,'#2d1e12');R(b,157,0,3,64,'#2d1e12');
    /* hearth */
    R(b,2,10,46,54,'#3a2c24');
    for(y=16;y<62;y+=8){R(b,2,y,46,1,'#2a1f19');for(x=(y%16?8:2);x<48;x+=12)R(b,x,y,1,8,'#2a1f19')}
    R(b,2,10,46,1,'#54443a');
    R(b,8,4,34,8,'#46352b');R(b,8,4,34,1,'#5a4538');R(b,8,11,34,1,'#2a1f19');
    R(b,16,0,18,5,'#3a2c24');
    arch(b,25,24,62,13,'#5a4538');
    arch(b,25,26,62,11,'#0b0604');
    R(b,0,62,50,4,'#46352b');R(b,0,62,50,1,'#6a5545');
    /* window */
    arch(b,75,5,46,20,'#6a5545');
    arch(b,75,6,46,19,'#46352b');
    arch(b,75,8,44,17,null);
    R(b,74,8,2,36,'#3a2c24');R(b,58,26,34,2,'#3a2c24');
    R(b,54,44,42,3,'#5a4538');R(b,54,44,42,1,'#7a6552');R(b,56,47,38,1,'#1f1611');
    /* torch brackets */
    [52,98].forEach(function(tx){
      R(b,tx-1,33,3,10,'#4a3020');R(b,tx-3,31,7,3,'#54443a');R(b,tx-2,43,5,1,'#54443a');
    });
    /* banner */
    R(b,102,4,16,2,'#54443a');
    R(b,104,6,12,23,'#7a2a24');R(b,104,6,2,23,'#5a1d18');R(b,114,6,2,23,'#8a3228');
    R(b,104,29,5,3,'#7a2a24');R(b,111,29,5,3,'#7a2a24');R(b,104,29,12,1,'#c9a14a');
    R(b,109,10,2,12,'#e8c15a');R(b,106,14,8,2,'#e8c15a');R(b,108,12,4,1,'#e8c15a');
    /* crossed swords and shield */
    line(b,122,9,138,27,'#b9c0cc');line(b,123,9,139,27,'#8d95a3');
    line(b,138,9,122,27,'#b9c0cc');line(b,139,9,123,27,'#8d95a3');
    R(b,120,7,3,2,'#c9a14a');R(b,138,7,3,2,'#c9a14a');R(b,120,27,3,2,'#c9a14a');R(b,138,27,3,2,'#c9a14a');
    disc(b,130,19,7,'#c9a14a');disc(b,130,19,6,'#6b2622');
    R(b,129,13,2,12,'#c9a14a');R(b,124,18,12,2,'#c9a14a');R(b,129,18,3,3,'#e8c15a');
    /* portal shelf */
    R(b,139,22,19,2,'#4a3020');R(b,139,22,19,1,'#6a4630');R(b,141,24,2,3,'#3a2818');R(b,154,24,2,3,'#3a2818');
    /* shelves */
    R(b,139,36,19,2,'#4a3020');R(b,139,36,19,1,'#6a4630');R(b,141,38,2,3,'#3a2818');R(b,154,38,2,3,'#3a2818');
    R(b,140,28,3,8,'#7a2a24');R(b,143,29,3,7,'#2f5a7a');R(b,146,27,3,9,'#4a6b2f');
    R(b,151,31,5,5,'#cbbf9c');R(b,152,33,1,1,'#1a1410');R(b,154,33,1,1,'#1a1410');R(b,152,35,3,1,'#9a8f70');
    R(b,139,48,19,2,'#4a3020');R(b,139,48,19,1,'#6a4630');R(b,141,50,2,3,'#3a2818');R(b,154,50,2,3,'#3a2818');
    [[141,'#5fbf6a'],[147,'#5fa8e0'],[153,'#d9604f']].forEach(function(p){
      R(b,p[0],41,4,7,p[1]);R(b,p[0]+1,39,2,2,p[1]);R(b,p[0]+1,38,2,1,'#a07a4a');
      R(b,p[0]+1,42,1,4,mix(p[1],'#ffffff',.55));R(b,p[0]+3,43,1,4,mix(p[1],'#000000',.4));
    });
    /* anvil on stump */
    R(b,104,79,26,2,'rgba(0,0,0,.4)');
    R(b,108,70,16,9,'#5a3d28');R(b,108,70,16,1,'#7a5638');R(b,110,72,1,6,'#4a3020');R(b,118,73,1,5,'#4a3020');
    R(b,112,68,8,2,'#5a5e67');
    R(b,106,65,22,3,'#6b6f78');R(b,106,65,22,1,'#a5abb7');
    R(b,101,66,5,2,'#6b6f78');R(b,99,67,2,1,'#6b6f78');
    /* weapon rack under the window */
    R(b,53,49,42,2,'#4a3020');R(b,53,49,42,1,'#6a4630');R(b,53,60,42,2,'#4a3020');R(b,53,61,42,1,'#2a1d14');
    R(b,55,51,2,10,'#3a2818');R(b,91,51,2,10,'#3a2818');
    [58,64].forEach(function(x){
      R(b,x,52,1,8,'#c9d0dc');R(b,x+1,52,1,8,'#8d95a3');R(b,x,52,1,1,'#fff');
      R(b,x-2,58,5,1,'#c9a14a');R(b,x,59,2,2,'#5a3428');
    });
    [71,79].forEach(function(x){
      R(b,x,52,1,9,'#7a5638');R(b,x-3,52,3,4,'#a5abb7');R(b,x-3,52,3,1,'#dfe4ec');R(b,x-4,53,1,3,'#8d95a3');
    });
    R(b,86,50,1,11,'#7a5638');R(b,85,50,3,1,'#c9d0dc');R(b,86,48,1,2,'#c9d0dc');
    R(b,89,53,1,7,'#9a9fa9');R(b,88,52,3,2,'#6b6f78');
    /* barrel */
    R(b,142,83,18,2,'rgba(0,0,0,.4)');
    R(b,144,68,14,16,'#6b4426');R(b,145,66,12,3,'#7a5638');
    R(b,144,71,14,1,'#2a1d14');R(b,144,78,14,1,'#2a1d14');R(b,146,69,1,14,'#82552f');
  })();

  /* realistic hearth fire: a small heat simulation, stepped slowly and blended for smooth motion */
  var HFW=22,HFH=34,HFX=14,HFY=27,FSTEP=1/14;
  var fhA=new Float32Array(HFW*HFH),fhB=new Float32Array(HFW*HFH),fAcc=0;
  var fMask=new Float32Array(HFW*HFH);
  var fCan=document.createElement('canvas');fCan.width=HFW;fCan.height=HFH;
  var fCtx=fCan.getContext('2d'),fImg=fCtx.createImageData(HFW,HFH);
  (function(){
    for(var y=0;y<HFH;y++)for(var x=0;x<HFW;x++){
      var gy=HFY+y,half=gy<37?Math.floor(Math.sqrt(Math.max(0,121-Math.pow(37-gy-.5,2)))):11;
      var ax=HFX+x+.5-25;
      fMask[y*HFW+x]=Math.abs(ax)<half?1:(Math.abs(ax)<half+1.5?.5:0);
    }
  })();
  function fireStep(){
    fhB.set(fhA);
    var x,y,xs,v,r,side,cx=(HFW-1)/2;
    for(x=0;x<HFW;x++){
      var prof=1-Math.pow((x-cx)/(cx+1),2);
      fhA[(HFH-1)*HFW+x]=Math.min(1,Math.max(0,prof*(.88+Math.random()*.24)));
    }
    for(y=0;y<HFH-1;y++){
      for(x=0;x<HFW;x++){
        r=Math.random();
        xs=x+(r<.3?-1:r<.6?0:1);
        if(xs<0)xs=0;if(xs>=HFW)xs=HFW-1;
        v=fhB[(y+1)*HFW+xs];
        side=Math.abs(x-cx)/(cx+1);
        v-=.013+Math.random()*.02+side*side*.03;
        fhA[y*HFW+x]=v>0?v:0;
      }
    }
  }
  (function(){for(var n=0;n<80;n++)fireStep()})();
  function fireTick(dt){
    fAcc+=dt;
    var guard=0;
    while(fAcc>=FSTEP&&guard++<4){fAcc-=FSTEP;fireStep()}
    if(fAcc>FSTEP)fAcc=0;
  }
  function drawFire(t){
    var o=fImg.data,a=Math.min(1,fAcc/FSTEP),i,k,h,r,g,b,al,q=0;
    for(i=0;i<HFW*HFH;i++,q+=4){
      h=(fhB[i]+(fhA[i]-fhB[i])*a)*fMask[i];
      h=Math.round(h*16)/16;
      if(h<.04){o[q+3]=0;continue}
      al=Math.min(1,(h-.04)/.22);
      if(h<.25){k=h/.25;r=70+110*k;g=8+22*k;b=4}
      else if(h<.5){k=(h-.25)/.25;r=180+60*k;g=30+80*k;b=4+10*k}
      else if(h<.75){k=(h-.5)/.25;r=240+15*k;g=110+85*k;b=14+40*k}
      else{k=(h-.75)/.25;r=255;g=195+50*k;b=54+140*k}
      o[q]=r;o[q+1]=g;o[q+2]=b;o[q+3]=al*255;
    }
    fCtx.putImageData(fImg,0,0);
    /* logs and coals */
    R(hg,14,59,22,3,'#2a1810');
    R(hg,16,57,18,3,'#3a2412');R(hg,16,57,18,1,'#5a3a22');
    R(hg,18,55,14,2,'#33200f');R(hg,18,55,14,1,'#4d311a');
    for(i=0;i<9;i++){
      k=.5+.5*Math.sin(t*1.3+i*1.7);
      R(hg,16+i*2,60,2,1,mix('#7a1f08','#ff7a20',k));
      if(i%2===0)R(hg,17+i*2,58,1,1,mix('#7a1f08','#ff9a3c',1-k));
    }
    hg.drawImage(fCan,HFX,HFY);
    hg.globalCompositeOperation='lighter';
    glow(hg,25,56,14,'255,120,30',.22+.06*Math.sin(t*2.1));
    hg.globalCompositeOperation='source-over';
  }

  var hvig=document.createElement('canvas');hvig.width=HW;hvig.height=HH;
  (function(){
    var v=hvig.getContext('2d');
    var gr=v.createRadialGradient(HW/2,HH/2,HH*.3,HW/2,HH/2,HW*.65);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');
    v.fillStyle=gr;v.fillRect(0,0,HW,HH);
  })();

  var STARS=[];
  (function(){for(var i=0;i<16;i++)STARS.push([54+Math.floor(sr(i+3)*42),9+Math.floor(sr(i+9)*15)])})();
  var motes=[];
  (function(){for(var i=0;i<12;i++)motes.push({x:62+sr(i)*48,y:48+sr(i+20)*34,vx:(sr(i+40)-.5)*2,vy:-.5-sr(i+60)*1.2,p:sr(i+80)*6})})();
  var hparts=[];
  var popT=2;
  var heat=0;
  var SWING_T=2.2;
  var hitCycle=-1,whCycle=-1;
  var parX=0,parT=0;
  window.addEventListener('pointermove',function(e){parT=(e.clientX/Math.max(1,window.innerWidth)-.5)*2},{passive:true});

  function swingAngle(tm){
    var k;
    if(tm<1.2){k=tm/1.2;k=k*k*(3-2*k);return 20+(-105-20)*k}
    if(tm<1.3)return -105;
    if(tm<1.42){k=(tm-1.3)/.12;return -105+(28+105)*k}
    if(tm<2.2){k=(tm-1.42)/.78;return 28+(20-28)*k}
    return 20;
  }
  var ring=0,shake=0,flash=0;
  function impact(){
    heat=1;ring=.001;shake=1;flash=1;
    var i;
    for(i=0;i<34;i++){
      var a=Math.random()*Math.PI,s=18+Math.random()*52;
      hparts.push({x:113+Math.random()*5,y:63,vx:Math.cos(a)*s*(Math.random()<.5?-1:1),vy:-Math.sin(a)*s-8,l:0,m:.5+Math.random()*.8,c:['#fff0c0','#ffc766','#f08a24'][Math.floor(Math.random()*3)],g:95,big:Math.random()<.25});
    }
    sfx.clang();
  }
  function hstep(dt,t){
    if(reduce)return;
    parX+=(parT-parX)*Math.min(1,dt*3);
    if(realm==='dejavu'){dvStep(dt,t);return}
    fireTick(dt);
    heat=Math.max(0,heat-dt*.45);
    shake=Math.max(0,shake-dt*5);flash=Math.max(0,flash-dt*6);
    if(ring>0){ring+=dt*1.6;if(ring>1)ring=0}
    if(Math.random()<dt*7)hparts.push({x:17+Math.random()*16,y:34+Math.random()*12,vx:(Math.random()-.5)*5,vy:-(6+Math.random()*9),l:0,m:1.6+Math.random()*1.4,c:Math.random()<.5?'#ffb04a':'#ffd98a',g:-1.5,big:Math.random()<.1});
    popT-=dt;
    if(popT<=0){
      popT=1.5+Math.random()*2.5;
      for(var q=0;q<7;q++)hparts.push({x:22+Math.random()*12,y:58,vx:(Math.random()-.5)*28,vy:-(20+Math.random()*26),l:0,m:.7+Math.random()*.6,c:'#ffc766',g:55});
      if(A.on&&A.ctx){var tt=A.ctx.currentTime;noise(tt,.025,.1,'highpass',2800,A.sfx);noise(tt+.04,.02,.07,'highpass',3600,A.sfx)}
    }
    var cyc=t%SWING_T,idx=Math.floor(t/SWING_T);
    if(cyc>=1.3&&whCycle!==idx){whCycle=idx;sfx.whoosh()}
    if(cyc>=1.42&&hitCycle!==idx){hitCycle=idx;impact()}
    for(var i=hparts.length-1;i>=0;i--){
      var p=hparts[i];p.l+=dt;
      if(p.l>p.m){hparts.splice(i,1);continue}
      p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.g>50&&p.vy>0&&p.y>64.5&&p.x>100&&p.x<128){p.y=64.5;p.vy*=-.32;p.vx*=.85}
    }
    for(i=0;i<motes.length;i++){
      var m=motes[i];m.x+=m.vx*dt;m.y+=m.vy*dt;
      if(m.y<46||m.x<56||m.x>118){m.x=62+Math.random()*48;m.y=84}
    }
  }

  function drawSky(t){
    var o1=Math.round(parX*2),o2=Math.round(parX*1.2),o3=Math.round(parX*.6),i,x;
    var sk=hg.createLinearGradient(0,8,0,44);
    sk.addColorStop(0,'#0a0e2c');sk.addColorStop(.6,'#2a2152');sk.addColorStop(1,'#6a3f6a');
    hg.fillStyle=sk;hg.fillRect(48,6,54,40);
    for(i=0;i<STARS.length;i++){
      hg.globalAlpha=.35+.65*Math.abs(Math.sin(t*1.3+i*2.1));
      R(hg,STARS[i][0]+o1,STARS[i][1],1,1,'#f3ecd0');
    }
    hg.globalAlpha=1;
    glow(hg,82+o1,17,13+Math.sin(t*1.2)*2,'243,236,208',.26+.1*Math.sin(t*1.2));
    disc(hg,82+o1,17,4,'#f3ecd0');disc(hg,84+o1,16,4,'#1a1a44');
    for(i=0;i<2;i++){
      var cxp=((t*(1.5+i)+i*40)%70)+46;
      R(hg,cxp-8,14+i*9,16,2,'rgba(80,70,130,.55)');R(hg,cxp-5,13+i*9,10,1,'rgba(80,70,130,.55)');
    }
    for(x=44;x<104;x++){
      var mh=33+Math.round(Math.sin(x*.35)*2+Math.sin(x*.12+1)*4);
      R(hg,x+o2,mh,1,46-mh,'#141a38');
    }
    /* castle */
    R(hg,62+o3,31,12,14,'#0d1128');R(hg,61+o3,26,3,19,'#0d1128');R(hg,72+o3,25,3,20,'#0d1128');R(hg,66+o3,27,4,18,'#0d1128');
    R(hg,61+o3,25,1,1,'#0d1128');R(hg,63+o3,25,1,1,'#0d1128');R(hg,72+o3,24,1,1,'#0d1128');R(hg,74+o3,24,1,1,'#0d1128');R(hg,67+o3,26,2,1,'#0d1128');
    hg.globalAlpha=.6+.4*Math.sin(t*2.3)*Math.sin(t*3.7+1);
    R(hg,67+o3,31,1,2,'#ffc766');R(hg,62+o3,29,1,1,'#ffc766');R(hg,73+o3,28,1,1,'#ffc766');R(hg,69+o3,35,1,2,'#ffc766');
    hg.globalAlpha=1;
    var sc=t%9;
    if(sc<.55){
      var sk2=sc/.55,sx2=98-sk2*46,sy2=9+sk2*20;
      hg.globalAlpha=1-sk2*.5;
      for(var tr=0;tr<9;tr++){hg.globalAlpha=(1-sk2*.4)*(1-tr/9);R(hg,sx2+tr*1.6,sy2-tr*.9,1,1,'#fff6d8')}
      hg.globalAlpha=1;
    }
    for(var bt=0;bt<2;bt++){
      var bx=((t*(11+bt*5)+bt*47)%84)+34-bt*0,by=22+bt*11+Math.sin(t*2.2+bt*2)*4;
      if(bx>47&&bx<103){
        var fl2=Math.sin(t*14+bt)>0;
        R(hg,bx,by,2,1,'#05060f');
        if(fl2){R(hg,bx-2,by-1,2,1,'#05060f');R(hg,bx+2,by-1,2,1,'#05060f')}
        else{R(hg,bx-2,by+1,2,1,'#05060f');R(hg,bx+2,by+1,2,1,'#05060f')}
      }
    }
    var ms=hg.createLinearGradient(0,34,0,46);
    ms.addColorStop(0,'rgba(120,110,190,0)');ms.addColorStop(1,'rgba(150,140,210,.28)');
    hg.fillStyle=ms;hg.fillRect(48,34,54,12);
    for(i=0;i<3;i++){
      var mx=((t*(2.5+i*.8)+i*30)%72)+36;
      R(hg,mx-9,40+i*1.5,18,1,'rgba(170,160,225,.22)');
    }
    for(x=44;x<104;x++){
      var h2=40+Math.round(Math.sin(x*.5+2)*1.5);
      R(hg,x,h2,1,46-h2,'#0a0d22');
    }
  }
  function flame(x,y,t,seed){
    var f=Math.round(1+Math.sin(t*4.2+seed)*1.1+Math.sin(t*7.3+seed*2)*.5);
    R(hg,x-2,y-5-f,5,5+f,'#c24a14');R(hg,x-1,y-6-f,3,5+f,'#f08a24');R(hg,x,y-5-f,1,4,'#ffc766');R(hg,x,y-8-f,1,2,'#f08a24');
  }
  /* smith: swing phase k runs 0 (hammer raised) to 1 (hammer on the bar) */
  function smithK(tm){
    var k;
    if(tm<1.15){k=tm/1.15;k=k*k*(3-2*k);return .9*(1-k)}
    if(tm<1.3)return .012*Math.sin(tm*60);
    if(tm<1.42){k=(tm-1.3)/.12;return k*k}
    if(tm<1.58)return 1-.18*Math.sin(Math.PI*(tm-1.42)/.16);
    k=(tm-1.58)/.62;k=k*k*(3-2*k);
    return 1-.1*k;
  }
  function drawSmith(k,t){
    var sx=99,sy=77,i;
    var lean=-2+4*k,tx=Math.round(lean*.5),hx=sx+Math.round(lean*.9);
    var bob=k>.93?1:0;
    R(hg,sx-8,sy-1,17,3,'rgba(0,0,0,.4)');
    /* legs */
    R(hg,sx-4,sy-9+bob,3,9-bob,'#2f2218');R(hg,sx-6,sy-2,6,2,'#1f150e');
    var fl=Math.round(k);
    R(hg,sx+1+fl,sy-9+bob,3,9-bob,'#3d2c20');R(hg,sx+1+fl,sy-2,6,2,'#241810');
    /* torso */
    R(hg,sx-4,sy-12+bob,9,4,'#4a3220');
    R(hg,sx-5+tx,sy-19+bob,10,8,'#6b4a2e');
    R(hg,sx-3+tx,sy-17+bob,8,7,'#8a6238');R(hg,sx-3+tx,sy-17+bob,8,1,'#a37a48');
    R(hg,sx-5+tx,sy-12+bob,10,1,'#2a1d14');
    /* far arm with tongs holding the bar */
    var Lx=sx+1+tx,Ly=sy-17+bob,Hx2=107,Hy2=61;
    var Ex=(Lx+Hx2)/2-1,Ey=(Ly+Hy2)/2+4;
    line(hg,Lx,Ly,Ex,Ey,'#5a3d28');line(hg,Lx,Ly+1,Ex,Ey+1,'#5a3d28');
    line(hg,Ex,Ey,Hx2,Hy2,'#b8825a');
    R(hg,Hx2-1,Hy2-1,2,2,'#b8825a');
    line(hg,Hx2-5,Hy2-3,111,63,'#6b6f78');line(hg,Hx2-5,Hy2-2,111,64,'#4b4e56');
    /* neck and head */
    R(hg,hx-1,sy-20+bob,3,2,'#d99a6a');
    R(hg,hx-3,sy-28+bob,7,8,'#d99a6a');
    R(hg,hx-3,sy-29+bob,7,3,'#4a2a18');
    R(hg,hx-4,sy-27+bob,8,2,'#9a2a24');
    R(hg,hx-3,sy-22+bob,6,3,'#5a3a22');
    if(k>.88)R(hg,hx+1,sy-25+bob,2,1,'#1a0e06');else R(hg,hx+2,sy-25+bob,1,1,'#1a0e06');
    /* striking arm: shoulder, elbow, hand */
    var S={x:sx+3+tx,y:sy-17+bob},tgx=114,tgy=62.5;
    var dist=Math.sqrt((tgx-S.x)*(tgx-S.x)+(tgy-S.y)*(tgy-S.y));
    var aStrike=Math.atan2(tgy-S.y,tgx-S.x),aUp=-100*Math.PI/180;
    var a=aUp+(aStrike-aUp)*k;
    var reachMax=Math.max(5,Math.min(9,dist-7)),reach=8+(reachMax-8)*k;
    var Hx=S.x+Math.cos(a)*reach,Hy=S.y+Math.sin(a)*reach;
    var L1=4.5,L2=4.5,d=Math.max(1,Math.min(Math.sqrt((Hx-S.x)*(Hx-S.x)+(Hy-S.y)*(Hy-S.y)),L1+L2-.01));
    var aa=(L1*L1-L2*L2+d*d)/(2*d),hh=Math.sqrt(Math.max(0,L1*L1-aa*aa));
    var ux=(Hx-S.x)/d,uy=(Hy-S.y)/d;
    var e1x=S.x+ux*aa-uy*hh,e1y=S.y+uy*aa+ux*hh,e2x=S.x+ux*aa+uy*hh,e2y=S.y+uy*aa-ux*hh;
    var Ex2=e1y>e2y?e1x:e2x,Ey2=e1y>e2y?e1y:e2y;
    line(hg,S.x,S.y,Ex2,Ey2,'#8a6238');line(hg,S.x,S.y+1,Ex2,Ey2+1,'#8a6238');
    line(hg,Ex2,Ey2,Hx,Hy,'#d99a6a');line(hg,Ex2,Ey2+1,Hx,Hy+1,'#c78a5c');
    R(hg,Hx-1,Hy-1,3,3,'#d99a6a');
    /* hammer */
    var phi=a-(1-k)*.25,Tx=Hx+Math.cos(phi)*7,Ty=Hy+Math.sin(phi)*7;
    line(hg,Hx,Hy,Tx,Ty,'#7a5638');line(hg,Hx+1,Hy,Tx+1,Ty,'#5a3d28');
    var px=-Math.sin(phi),py=Math.cos(phi),cx2=Math.cos(phi),cy2=Math.sin(phi),q;
    for(q=-3;q<=3;q++){
      R(hg,Tx+px*q-1,Ty+py*q-1,2,2,'#7a808c');
      R(hg,Tx+px*q+cx2-1,Ty+py*q+cy2-1,1,1,'#a5abb7');
    }
    R(hg,Tx+px*3-1,Ty+py*3-1,1,1,'#c9d0dc');
  }

  function drawCat(t){
    var br=Math.sin(t*1.6)>0?1:0;
    R(hg,22,83,16,2,'rgba(0,0,0,.35)');
    R(hg,24,79-br,12,5+br,'#26262c');R(hg,24,79-br,12,1,'#5a3a2a');
    R(hg,35,78,5,4,'#26262c');R(hg,35,77,1,1,'#26262c');R(hg,39,77,1,1,'#26262c');R(hg,37,80,2,1,'#d9a14a');
    var tw=Math.sin(t*1.1)>.6?1:0;
    R(hg,20,81-tw,5,2,'#26262c');R(hg,19,80-tw,1,2,'#26262c');
    var zp=(t%4)/4;
    hg.globalAlpha=Math.sin(zp*Math.PI)*.7;
    var zx=42+Math.round(zp*5),zy=Math.round(76-zp*10);
    R(hg,zx,zy,3,1,'#c8d2ff');R(hg,zx+1,zy+1,1,1,'#c8d2ff');R(hg,zx,zy+2,3,1,'#c8d2ff');
    hg.globalAlpha=1;
  }
  function drawHero(t){
    if(realm==='dejavu'){drawDV(t);return}
    var i,fl=.88+.07*Math.sin(t*2.3)+.05*Math.sin(t*5.1+1)+.04*Math.sin(t*8.3);
    hg.globalCompositeOperation='source-over';
    hg.clearRect(0,0,HW,HH);
    drawSky(t);
    hg.drawImage(bgc,0,0);
    drawPortal(t,'violet');
    /* hearth fire */
    drawFire(t);
    flame(52,31,t,1);flame(98,31,t,4);
    drawCat(t);
    /* anvil bar */
    var heatMix=Math.max(heat,.25);
    R(hg,110,63,9,2,mix('#7a3a1a','#ffb04a',heatMix));
    if(heat>.5)R(hg,112,63,5,1,'#fff0c0');
    drawSmith(smithK(t%SWING_T),t);
    if(!npc.open){
      var qb2=Math.round(Math.sin(t*3));
      outlined(function(){
        R(hg,101,34+qb2,6,7,'#f4ecd8');R(hg,102,33+qb2,4,1,'#f4ecd8');R(hg,102,41+qb2,2,1,'#f4ecd8');R(hg,100,42+qb2,1,1,'#f4ecd8');
        R(hg,103,35+qb2,2,1,'#3a2418');R(hg,104,36+qb2,1,1,'#3a2418');R(hg,103,37+qb2,1,1,'#3a2418');R(hg,103,39+qb2,1,1,'#3a2418');
      });
    }
    if(flash>0){
      hg.globalCompositeOperation='lighter';
      glow(hg,114,62,16,'255,240,200',.9*flash);
      hg.globalCompositeOperation='source-over';
    }
    if(ring>0){
      hg.globalAlpha=1-ring;
      var rr=Math.round(ring*20);
      for(var ra=0;ra<24;ra++){var an=ra/24*Math.PI*2;R(hg,114+Math.cos(an)*rr,62+Math.sin(an)*rr*.45,1,1,'#ffe3a0')}
      hg.globalAlpha=1;
    }
    /* particles */
    for(i=0;i<hparts.length;i++){
      var p=hparts[i];
      hg.globalAlpha=Math.max(0,1-p.l/p.m);
      R(hg,p.x,p.y,p.big?2:1,p.big?2:1,p.c);
    }
    hg.globalAlpha=1;
    /* moonlight shaft + motes */
    var sh=hg.createLinearGradient(0,44,0,86);
    sh.addColorStop(0,'rgba(150,170,255,.10)');sh.addColorStop(1,'rgba(150,170,255,0)');
    hg.fillStyle=sh;
    hg.beginPath();hg.moveTo(60,44);hg.lineTo(90,44);hg.lineTo(120,86);hg.lineTo(72,86);hg.closePath();hg.fill();
    for(i=0;i<motes.length;i++){
      var m=motes[i];
      hg.globalAlpha=.25+.45*Math.abs(Math.sin(t*1.4+m.p));
      R(hg,m.x,m.y,1,1,'#c8d2ff');
    }
    hg.globalAlpha=1;
    /* warm lights */
    hg.globalCompositeOperation='lighter';
    glow(hg,25,50,66,'255,140,40',.32*fl);
    glow(hg,52,26,26,'255,170,70',.22*(.88+.08*Math.sin(t*3.1+1)+.04*Math.sin(t*6.7)));
    glow(hg,98,26,26,'255,170,70',.22*(.88+.08*Math.sin(t*3.1+4)+.04*Math.sin(t*6.7+3)));
    glow(hg,114,63,12+heat*10,'255,150,50',.12+.3*heat);
    var pz=.7+.3*Math.sin(t*2);
    glow(hg,143,44,9,'95,191,106',.2*pz);glow(hg,149,44,9,'95,168,224',.2*(1.7-pz));glow(hg,155,44,9,'217,96,79',.2*pz);
    hg.globalCompositeOperation='source-over';
    hg.drawImage(hvig,0,0);
  }

  /* page-wide drifting embers */
  var fx=$('fx'),fgx=fx.getContext('2d'),FW=0,FH=0,fxp=[];
  function fxResize(){
    FW=fx.width=window.innerWidth;FH=fx.height=window.innerHeight;
    if(!fxp.length)for(var i=0;i<44;i++)fxp.push({x:Math.random()*FW,y:Math.random()*FH,s:Math.random()<.7?2:3,vy:10+Math.random()*22,ph:Math.random()*6.28,amp:6+Math.random()*14,a:.35+Math.random()*.5,c:Math.random()<.6?'#f08a24':'#ffc766'});
  }
  function drawFx(dt,t){
    fgx.clearRect(0,0,FW,FH);
    for(var i=0;i<fxp.length;i++){
      var p=fxp[i];
      p.y-=p.vy*dt;
      if(p.y<-6){p.y=FH+6;p.x=Math.random()*FW}
      fgx.globalAlpha=p.a*(.6+.4*Math.sin(t*3+p.ph))*Math.min(1,p.y/140);
      fgx.fillStyle=p.c;
      fgx.fillRect(Math.round(p.x+Math.sin(t*.8+p.ph)*p.amp),Math.round(p.y),p.s,p.s);
    }
    fgx.globalAlpha=1;
  }

  var heroVisible=true;
  try{new IntersectionObserver(function(es){heroVisible=es[0].isIntersecting},{rootMargin:'60px'}).observe(hc)}catch(e){}
  if(reduce){
    heat=.4;
    drawHero(0);
    fx.hidden=true;
  }else{
    fxResize();
    window.addEventListener('resize',fxResize);
    var lastTs=0,T0=0;
    (function loop(ts){
      requestAnimationFrame(loop);
      var dt=Math.min(.05,(ts-lastTs)/1000||0);lastTs=ts;T0+=dt;
      if(heroVisible){hstep(dt,T0);drawHero(T0);var sk3=shake*shake;hc.style.transform=sk3>.01?'translate('+Math.round((Math.random()-.5)*6*sk3)/ 2+'px,'+Math.round((Math.random()-.5)*6*sk3)/2+'px)':''}
      drawFx(dt,T0);
    })(0);
  }

/* ======================= REALM SWITCHING ======================= */
  var COPY={
    forge:{title:'Smithing Venerable House',sub:'Workshop and archive',lede:'All the projects that I have created so far are below. Each one has a different type and category, so make sure to read the description before installing or visiting the site.',inv:'Storage',icon:'anvil',alt:'Animated pixel scene of a night-time smithy: a blacksmith hammers glowing iron at an anvil beside a roaring hearth, a cat sleeps by the fire, a tiny glowing portal stands on a wooden shelf in the top right corner, and a castle shows in the moonlit window.',empty:'No creations have been placed in the hall yet.'},
    dejavu:{title:'Familiar Bar',sub:'Tavern of echoes',lede:'All the projects that I have created so far are below. Each one has a different type and category, so make sure to read the description before installing or visiting the site.',inv:'Storage',icon:'mug',alt:'Animated pixel scene of a rainy fantasy tavern: the counter has no bartender. A dwarf patron you can click for a chat, a wizard, an elf ranger, a horned knight and a cat sit at the bar, under swinging iron lanterns, with kegs, bottles, a heraldic shield, a wooden tavern sign, an enchanted lute, a window with rain and lightning, and a tiny teal portal back to the forge on a wooden shelf in the top right corner.',empty:'Nothing has been poured here yet.'},
  };
  function realmFromHash(){return (location.hash==='#familiar-bar'||location.hash==='#deja-vu')?'dejavu':'forge'}
  function fxColors(){
    var set=realm==='dejavu'?['#ffd98a','#ff8fb8','#7ff0e0']:['#f08a24','#ffc766'];
    for(var i=0;i<fxp.length;i++)fxp[i].c=set[i%set.length];
  }
  function applyRealm(r){
    realm=r;
    var c=COPY[r];
    document.documentElement.setAttribute('data-realm',r);
    $('realmTitle').textContent=c.title;
    $('realmSub').textContent=c.sub;
    $('realmLede').textContent=c.lede;
    $('navHome').textContent=c.title;
    (function(el){el.classList.remove('navtype');void el.offsetWidth;el.classList.add('navtype')})($('navHome'));
    $('invTitle').textContent=c.inv;
    var sg=$('sigil');sg.textContent='';sg.appendChild(icon(c.icon));
    $('hero').setAttribute('aria-label',c.alt);
    npcBtn.hidden=false;
    npcBtn.setAttribute('aria-label',r==='dejavu'?'Talk to Deja, the eternal customer at the bar':'Talk to Spey, the smith');
    var nb=npcBtn.style;if(r==='dejavu'){nb.left='32%';nb.top='55%';nb.width='12%';nb.height='36%'}else{nb.left='58%';nb.top='50%';nb.width='14%';nb.height='42%'}if(typeof talkClose==='function')talkClose();
    F={status:'all',kind:'all',smith:'all',q:''};
    A.step=0;
    fireSoundSync();
    fxColors();
    updateGate();
    if(reduce)drawHero(0);
    render();
  }
  window.addEventListener('hashchange',function(){var r=realmFromHash();if(r!==realm)applyRealm(r)});

  /* destination picker */
  var gate=$('gate'),gateFrom=null;
  Array.prototype.forEach.call(gate.querySelectorAll('.dslot'),function(el){el.appendChild(icon(el.getAttribute('data-icon')))});
  function updateGate(){
    Array.prototype.forEach.call(gate.querySelectorAll('.dest'),function(b){
      var here=b.getAttribute('data-realm')===realm;
      b.setAttribute('aria-current',here?'true':'false');
      b.querySelector('.here').hidden=!here;
    });
  }
  /* pixel-art backdrops for the two realm cards in the destination window */
  function paintDests(){
    Array.prototype.forEach.call(gate.querySelectorAll('canvas.dbg'),function(cv){
      var par=cv.parentNode,w=Math.max(40,Math.ceil(par.clientWidth/3)),h=Math.max(20,Math.ceil(par.clientHeight/3));
      if(!par.clientWidth)return;
      cv.width=w;cv.height=h;var g=cv.getContext('2d'),forge=cv.getAttribute('data-dbg')==='forge',x,y,i;
      function H(a,b){var q=Math.sin(a*127.1+b*311.7)*43758.5453;return q-Math.floor(q)}
      function R(x0,y0,ww,hh,c){g.fillStyle=c;g.fillRect(Math.round(x0),Math.round(y0),Math.round(ww),Math.round(hh))}
      if(forge){
        R(0,0,w,h,'#1c1210');
        for(y=0;y<h;y+=5){for(x=-(y/5%2)*6;x<w;x+=12){var sh=H(x,y);R(x+1,y+1,11,4,sh>.7?'#3a281c':sh>.35?'#32221a':'#2a1c14')}}
        /* hearth arch with fire at the right */
        var hx=w*.8,hy=h-2,hw=Math.min(40,w*.2),hh2=h*.7;
        R(hx-hw/2-3,hy-hh2-3,hw+6,hh2+3,'#4a3a2e');R(hx-hw/2,hy-hh2,hw,hh2,'#150a06');
        for(x=0;x<hw;x++){var fh=hh2*(.35+.5*H(x,3))*(1-Math.abs(x/hw-.5)*.9);for(y=0;y<fh;y++){var q=y/fh;R(hx-hw/2+x,hy-y,1,1,q<.3?'#fff2b0':q<.6?'#ffb030':q<.85?'#e0601a':'#8a2a10')}}
        /* anvil */
        var ax=w*.5;R(ax-10,h-9,20,3,'#6a6a78');R(ax-5,h-6,10,4,'#4a4a56');R(ax-8,h-3,16,3,'#3a3a44');R(ax-14,h-9,6,2,'#6a6a78');
        /* sparks */
        for(i=0;i<34;i++)R(hx-hw/2+H(i,9)*hw*1.4,hy-hh2*(.2+H(i,8)*1.2),1,1,i%3?'#ffb050':'#fff0b0');
        var gr=g.createRadialGradient(hx,hy-hh2*.4,2,hx,hy-hh2*.4,w*.55);gr.addColorStop(0,'rgba(255,140,40,.45)');gr.addColorStop(1,'rgba(255,140,40,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
      }else{
        R(0,0,w,h,'#140e22');
        for(y=0;y<h;y+=4)R(0,y,w,1,'rgba(255,255,255,.03)');
        /* hanging string lights */
        for(x=0;x<w;x+=6){var ly=3+Math.round(2.5*Math.sin(x/w*6.28*2));R(x,ly,1,1,'#3a3050');R(x,ly+1,1,2,['#ffd98a','#ff8fb8','#7ff0e0','#ffb050'][(x/6|0)%4])}
        /* bottle shelf */
        var sy=Math.round(h*.52);R(0,sy,w,2,'#5a3a22');
        for(x=3;x<w-3;x+=5){var bh=6+Math.round(H(x,1)*5),bc=['#2a7a52','#a0482a','#2a5a9a','#9a2a6a','#c0a030','#6a3aa0'][Math.floor(H(x,2)*6)];R(x,sy-bh,3,bh,bc);R(x+1,sy-bh-2,1,2,bc);R(x,sy-bh,1,bh,'rgba(255,255,255,.25)')}
        /* counter with mugs */
        R(0,h-8,w,8,'#3a2214');R(0,h-8,w,1,'#7a5230');
        for(x=8;x<w-8;x+=16){R(x,h-13,5,5,'#d8c080');R(x+5,h-12,2,3,'#d8c080');R(x,h-13,5,1,'#fff6d0')}
        /* neon sign glow */
        var nx=w*.82,ny=h*.3;g.globalCompositeOperation='lighter';var gr2=g.createRadialGradient(nx,ny,1,nx,ny,w*.4);gr2.addColorStop(0,'rgba(255,90,170,.5)');gr2.addColorStop(1,'rgba(255,90,170,0)');g.fillStyle=gr2;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
        R(nx-9,ny-4,18,1,'#ff7ab8');R(nx-9,ny+3,18,1,'#ff7ab8');R(nx-9,ny-4,1,8,'#ff7ab8');R(nx+8,ny-4,1,8,'#ff7ab8');
      }
    });
  }
  function openGate(){
    gateFrom=document.activeElement;
    sfx.portal();
    gate.hidden=false;
    updateGate();
    paintDests();
    var first=gate.querySelector('.dest[aria-current="false"]')||gate.querySelector('.dest');
    first.focus();
  }
  function closeGate(restore){
    gate.hidden=true;
    if(restore!==false&&gateFrom&&gateFrom.focus)gateFrom.focus();
  }
  $('navRealm').addEventListener('click',openGate);
  (function(){
    var ab=$('about'),from=null;
    var AV={
      spey:['....KKKK....','...KOOOOK...','..KOOOOOOK..','..KOSSSSOK..','..KSKSSKSK..','..KSSSSSSK..','...KSSMMS...','..KOOOOOOK..','.KOOEOOEOOK.','.KOOOOOOOOK.','.KOOOOOOOOK.','..KKK..KKK..'],
      dejavu:['...KKKKKK...','..KPPPPPPK..','.KPPPPPPPPK.','.KPPSSSSPPK.','.KPSKSSKSPK.','..KSSSSSSK..','..KSSMMSSK..','...KSSSSK...','..KPPEEPPK..','.KPPPEEPPPK.','.KPPPPPPPPK.','..KKK..KKK..']};
    var PAL={K:'#120c10',S:'#f2c9a0',M:'#a3503c',O:'#f08a24',P:'#ff7ab8',E:'#fff3c4'};
    Array.prototype.forEach.call(ab.querySelectorAll('canvas[data-av]'),function(cv){
      var g=cv.getContext('2d'),m=AV[cv.getAttribute('data-av')];
      for(var y=0;y<12;y++)for(var x=0;x<12;x++){var c=PAL[m[y].charAt(x)];if(c){g.fillStyle=c;g.fillRect(x,y,1,1)}}
    });
    /* pixel-art waterfall backdrops, drawn per card with its own palette */
    var PAL2={
      spey:{s0:[246,150,96],s1:[255,222,176],far:[64,116,128],fall:[226,247,246],mist:[196,226,230],p0:[62,132,142],p1:[26,64,84],rk:[38,44,50],rh:[78,90,96],rl:[18,22,28],mo:[62,112,72],seed:3},
      dejavu:{s0:[140,116,206],s1:[244,186,224],far:[104,98,150],fall:[250,236,250],mist:[226,206,238],p0:[120,112,176],p1:[54,46,98],rk:[44,36,56],rh:[88,72,104],rl:[22,16,30],mo:[88,122,112],seed:9}};
    function hs(x,y,z){var n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n)}
    function vn(x,y,z){var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;xf=xf*xf*(3-2*xf);yf=yf*yf*(3-2*yf);var a=hs(xi,yi,z),b=hs(xi+1,yi,z),c=hs(xi,yi+1,z),d=hs(xi+1,yi+1,z);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf}
    function mx(a,b,t){t=t<0?0:t>1?1:t;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]}
    function paintCastle(cv){
      var par=cv.parentNode;if(!par.clientWidth)return;
      var w=cv.width=Math.max(60,Math.ceil(par.clientWidth/3)),h=cv.height=Math.max(30,Math.ceil(par.clientHeight/3)),g=cv.getContext('2d');
      function mk(ww,hh){var c=document.createElement('canvas');c.width=ww||w;c.height=hh||h;return{c:c,g:c.getContext('2d')}}
      function rgb(c){return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'}
      function R(q,x,y,a,b,c){q.fillStyle=typeof c==='string'?c:rgb(c);q.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b))}
      var hz=h*.7,y,x,i,sx=w*.8,sy=h*.4,u=Math.max(.7,h/72);
      /* far scenery: hazy mountains, castle on a hill */
      var fr=mk(),f=fr.g,winds=[],flag=null;
      for(x=0;x<w;x++){
        R(f,x,h*.5+vn(x*.035,0,31)*h*.2,1,h,[142,160,204]);
        R(f,x,h*.58+vn(x*.05,3,32)*h*.14,1,h,[100,142,164]);
      }
      var cx0=w*.6,gy=h*.62,st=[236,214,196],sh=[134,126,158],dk=[84,78,108],roof=[196,70,78],rf2=[140,48,62],lit=[255,214,120];
      function tower(x0,tw,th,rh,fl){
        R(f,x0,gy-th,tw,th,sh);R(f,x0+tw*.45,gy-th,tw*.55,th,st);
        for(var k=0;k<tw;k+=2)R(f,x0+k,gy-th-u,Math.max(1,u),u,k%4?dk:st);
        R(f,x0-u,gy-th-u,tw+2*u,u,dk);
        for(var r=0;r<rh;r++){var wd=(tw+2*u)*(1-r/rh)/2;R(f,x0+tw/2-wd,gy-th-u-r-1,wd*2,1,r%3?roof:rf2);R(f,x0+tw/2,gy-th-u-r-1,wd,1,r%3?[226,96,92]:roof)}
        R(f,x0+tw/2,gy-th-u-rh-5*u,1,5*u,dk);
        if(fl)flag={x:x0+tw/2+1,y:gy-th-u-rh-5*u};
        winds.push({x:x0+tw/2-u/2,y:gy-th*.7,a:Math.max(2,u*1.5),b:Math.max(3,u*3)});
        winds.push({x:x0+tw/2-u/2,y:gy-th*.35,a:Math.max(2,u*1.5),b:Math.max(3,u*3)});
      }
      R(f,cx0-14*u,gy-2*u,40*u,3*u,dk);
      R(f,cx0-9*u,gy-16*u,26*u,16*u,sh);R(f,cx0+4*u,gy-16*u,13*u,16*u,st);
      for(i=0;i<26*u;i+=2*u)R(f,cx0-9*u+i,gy-18*u,u,2*u,i%(4*u)?dk:st);
      R(f,cx0+2*u,gy-8*u,5*u,8*u,dk);R(f,cx0+2*u,gy-9*u,5*u,u,sh);
      tower(cx0-14*u,8*u,28*u,12*u,false);tower(cx0+16*u,8*u,34*u,14*u,true);tower(cx0+2*u,8*u,26*u,10*u,false);
      winds.push({x:cx0+9*u,y:gy-12*u,a:Math.max(2,u*1.5),b:Math.max(3,u*3)});
      /* forest layers, each its own canvas so they can sway independently */
      function layer(by,hmin,hmax,col,hi,sp,sd,round){
        var L=mk(),a=L.g;R(a,0,by,w,h-by,col);
        for(var tx=-sp;tx<w+sp;tx+=sp){
          var px=tx+hs(tx,sd,1)*sp,th=hmin+hs(tx,sd,2)*(hmax-hmin),tw=th*(round?.7:.45),ty=by-th;
          if(round){
            R(a,px-1,by-th*.4,2,th*.4,[70,46,34]);
            for(var r=0;r<th*.7;r++){var qq=r/(th*.7),wd=tw*Math.sin(Math.min(1,qq*1.15+.12)*Math.PI*.5)*(qq>.75?(1.4-qq)*1.5:1);R(a,px-wd,ty+r,wd*2,1,col);R(a,px+wd*.1,ty+r,Math.max(1,wd*.9),1,mx(col,hi,.35+.4*(1-qq)))}
          }else{
            for(var r2=0;r2<th;r2++){var wd2=tw*(r2/th)+(r2%4==0?1:0);R(a,px-wd2,ty+r2,wd2*2,1,col);R(a,px+wd2*.1,ty+r2,Math.max(1,wd2*.9),1,mx(col,hi,.3+.35*(1-r2/th)))}
            R(a,px-1,by-1,2,3,[60,40,30]);
          }
        }
        L.by=by;L.top=Math.max(0,Math.floor(by-hmax*1.1));return L;
      }
      var FL=[layer(h*.66,h*.12,h*.22,[66,124,126],[150,200,170],4*u,41,false),
              layer(h*.74,h*.16,h*.28,[44,132,86],[170,222,120],5*u,42,true),
              layer(h*.84,h*.2,h*.38,[30,104,62],[150,214,100],6*u,43,false),
              layer(h*.97,h*.28,h*.55,[20,74,48],[130,196,96],9*u,44,true)];
      var AMP=[.7,1.1,1.6,2.2],PH=[0,1.3,2.6,3.9];
      /* periodic mist strip, scrolls forever */
      var mc=mk(w,Math.ceil(h*.4)),mg=mc.g,mi=mg.createImageData(mc.c.width,mc.c.height),md=mi.data;
      for(y=0;y<mc.c.height;y++)for(x=0;x<mc.c.width;x++){
        var vv=.5+.25*Math.sin(x/w*6.2832*3+y*.4)+.25*Math.sin(x/w*6.2832*5-y*.7+1),al=Math.max(0,Math.min(1,(vv-.42)*1.6))*(1-Math.abs(y/mc.c.height-.5)*1.6),j=(y*mc.c.width+x)*4;
        md[j]=255;md[j+1]=232;md[j+2]=208;md[j+3]=Math.max(0,al*150);
      }
      mg.putImageData(mi,0,0);
      var CL=[],FF=[],PT=[],BD=[];
      for(i=0;i<6;i++)CL.push({x:hs(i,1,5)*w,y:h*(.06+hs(i,2,5)*.2),l:10+hs(i,3,5)*18,v:1.2+hs(i,4,5)*1.6});
      for(i=0;i<20;i++)FF.push({x:hs(i,9,9)*w,y:h*(.5+hs(i,10,9)*.42),p:hs(i,11,9)*6.28,s:.5+hs(i,12,9)});
      for(i=0;i<26;i++)PT.push({x:hs(i,13,9)*w,y:hs(i,14,9)*h,v:2+hs(i,15,9)*3,s:.4+hs(i,16,9),g:hs(i,17,9)>.5});
      for(i=0;i<2;i++)BD.push({x:hs(i,18,9)*w,y:h*(.14+i*.1),v:4+i*2});
      var KEYS=[
        [0,[70,90,160],[240,160,170],[255,200,140],[255,170,170,.16],.3,.6,.5],
        [.18,[100,165,228],[190,218,244],[255,226,170],[255,236,210,.04],0,.1,1],
        [.45,[88,158,226],[176,214,242],[236,238,230],[255,255,255,0],0,0,.6],
        [.62,[90,100,170],[236,150,130],[255,176,100],[255,150,90,.2],0,.4,.9],
        [.75,[10,16,46],[20,30,72],[44,50,100],[30,46,120,.5],1,1,0],
        [.9,[24,30,70],[90,80,130],[200,120,130],[70,60,130,.3],.8,.9,0],
        [1,[70,90,160],[240,160,170],[255,200,140],[255,170,170,.16],.3,.6,.5]];
      function mxa(a,b,t){var o=[],k;for(k=0;k<a.length;k++)o.push(a[k]+(b[k]-a[k])*t);return o}
      function sample(p){
        var k=0;while(k<KEYS.length-2&&p>=KEYS[k+1][0])k++;
        var A=KEYS[k],B=KEYS[k+1],t=(p-A[0])/(B[0]-A[0]);t=t*t*(3-2*t);
        return{top:mxa(A[1],B[1],t),mid:mxa(A[2],B[2],t),bot:mxa(A[3],B[3],t),tint:mxa(A[4],B[4],t),star:A[5]+(B[5]-A[5])*t,win:A[6]+(B[6]-A[6])*t,ray:A[7]+(B[7]-A[7])*t};
      }
      var scn=mk(),sg=scn.g,ST=[],GR=[];
      for(i=0;i<46;i++)ST.push({x:hs(i,21,9)*w,y:hs(i,22,9)*h*.5,p:hs(i,23,9)*6.28,b:hs(i,24,9)});
      for(i=0;i<Math.ceil(w/3);i++)GR.push({x:i*3+hs(i,25,9)*3,h:3+Math.round(hs(i,26,9)*4),c:hs(i,27,9)});
      function sway(ctx,L,t,amp,ph,gu){
        var top=L.top,by=Math.ceil(L.by),m=1+gu*1.8;
        for(var yy=top;yy<by;yy++){
          var k=Math.min(1,(by-yy)/(h*.28)),off=Math.round((Math.sin(t*1.25+yy*.07+ph)*amp*k+Math.sin(t*.5+ph)*amp*.4*k)*m);
          ctx.drawImage(L.c,0,yy,w,1,off,yy,w,1);
        }
        ctx.drawImage(L.c,0,by,w,h-by,0,by,w,h-by);
      }
      function mist(ctx,t,yy,al,sp,gu){
        var o=((windX*sp*.2)%w)-w;ctx.globalAlpha=al;ctx.drawImage(mc.c,o,yy);ctx.drawImage(mc.c,o+w,yy);ctx.globalAlpha=1;
      }
      var CYC=64,lastT=0,windX=0,cloudX=0,cloudW=.7;
      cv._scene={draw:function(t){
        var p=typeof cv._phase==='number'?cv._phase:((t%CYC)/CYC),S=sample(p);
        var gu=Math.pow(Math.max(0,Math.sin(t*.37)*Math.sin(t*.21+1)),2)*1.4+Math.max(0,Math.sin(t*.9))*.12;
        var dtw=(t-lastT>0&&t-lastT<1)?(t-lastT):0;windX+=dtw*(1.5+gu*9);cloudW+=((.7+gu*.9)-cloudW)*Math.min(1,dtw*.8);cloudX+=dtw*cloudW;lastT=t;
        g.globalAlpha=1;g.globalCompositeOperation='source-over';
        /* sky */
        var sgr=g.createLinearGradient(0,0,0,hz);
        sgr.addColorStop(0,rgb(S.top));sgr.addColorStop(.5,rgb(S.mid));sgr.addColorStop(1,rgb(S.bot));
        g.fillStyle=sgr;g.fillRect(0,0,w,h);
        for(i=0;i<ST.length;i++){var s2=ST[i],a2=S.star*(.35+.65*Math.max(0,Math.sin(t*(1.2+s2.b*2)+s2.p)))*(.4+.6*s2.b);if(a2<.05)continue;g.globalAlpha=a2;R(g,s2.x,s2.y,1,1,[255,250,230])}
        g.globalAlpha=1;
        /* sun and moon travel the sky */
        var sS=(p+.06)/.76,sunUp=sS>=0&&sS<=1,sunX=w*(.1+.8*sS),sunY=h*(.7-.56*Math.sin(Math.PI*Math.max(0,Math.min(1,sS))));
        var mS=p>=.66?(p-.66)/.4:(p<.06?(p+.34)/.4:-1),moonUp=mS>=0&&mS<=1,moonX=w*(.9-.75*mS),moonY=h*(.68-.5*Math.sin(Math.PI*Math.max(0,Math.min(1,mS))));
        var low=sunUp?1-Math.sin(Math.PI*sS):0;
        if(sunUp){
          var gl=g.createRadialGradient(sunX,sunY,0,sunX,sunY,h*(.55+.04*Math.sin(t*.6)));
          gl.addColorStop(0,'rgba(255,'+(240-low*70|0)+','+(200-low*90|0)+',.75)');gl.addColorStop(.35,'rgba(255,'+(214-low*50|0)+',150,.28)');gl.addColorStop(1,'rgba(255,200,140,0)');
          g.fillStyle=gl;g.fillRect(0,0,w,h);
          for(y=-8;y<=8;y++)for(x=-8;x<=8;x++)if(x*x+y*y<=h*h*.0056)R(g,sunX+x,sunY+y,1,1,mx([255,246,214],[255,170,110],low));
        }
        if(moonUp){
          var mg2=g.createRadialGradient(moonX,moonY,0,moonX,moonY,h*.4);
          mg2.addColorStop(0,'rgba(190,210,255,.35)');mg2.addColorStop(1,'rgba(150,180,255,0)');g.fillStyle=mg2;g.fillRect(0,0,w,h);
          var mr=h*.07;for(y=-8;y<=8;y++)for(x=-8;x<=8;x++)if(x*x+y*y<=mr*mr)R(g,moonX+x,moonY+y,1,1,(x+y*.6)>mr*.35?[196,206,230]:[236,240,252]);
          R(g,moonX-2,moonY-1,2,2,[196,206,226]);R(g,moonX+1,moonY+2,2,1,[196,206,226]);
        }
        /* clouds, pushed along by the wind and tinted by time of day */
        var cc=mx(mx([255,244,232],[255,200,180],Math.min(1,S.tint[3]*3)),[84,96,150],S.star);
        for(i=0;i<CL.length;i++){var c=CL[i],cx=(((c.x+cloudX*c.v*.6)%(w+50))+w+50)%(w+50)-25;R(g,cx,c.y,c.l,2,cc);R(g,cx+3,c.y-1,c.l*.6,1,mx(cc,[255,255,255],.4));R(g,cx-2,c.y+2,c.l*.8,1,mx(cc,[120,110,160],.4))}
        if(S.star<.5)for(i=0;i<BD.length;i++){var b=BD[i],bx=((b.x+t*b.v)%(w+30))-15,by2=b.y+Math.sin(t*1.3+i*2)*2,fl=Math.sin(t*9+i*3)>0;R(g,bx,by2,1,1,[60,54,80]);R(g,bx-1,by2+(fl?-1:1),1,1,[60,54,80]);R(g,bx+1,by2+(fl?-1:1),1,1,[60,54,80])}
        /* landscape composed on its own layer so one tint colours only the land */
        sg.globalCompositeOperation='source-over';sg.clearRect(0,0,w,h);
        sg.drawImage(fr.c,0,0);
        mist(sg,t,h*.5,.45,2.2,gu);
        sway(sg,FL[0],t,AMP[0],PH[0],gu);
        mist(sg,t,h*.56,.4,3.2,gu);
        sway(sg,FL[1],t,AMP[1],PH[1],gu);
        sway(sg,FL[2],t,AMP[2],PH[2],gu);
        mist(sg,t,h*.66,.35,4.4,gu);
        sway(sg,FL[3],t,AMP[3],PH[3],gu);
        /* tall grass in the front bends with each gust */
        for(i=0;i<GR.length;i++){var bl=GR[i];for(var kk=0;kk<bl.h;kk++){var bo=Math.round(Math.sin(t*2.2+bl.x*.3)*(kk/bl.h)*(1+gu*2.4)*1.3+gu*kk*.35);R(sg,bl.x+bo,h-1-kk,1,1,mx([28,96,58],[170,222,110],(kk/bl.h)*.7+bl.c*.2))}}
        sg.globalCompositeOperation='source-atop';
        sg.fillStyle='rgba('+(S.tint[0]|0)+','+(S.tint[1]|0)+','+(S.tint[2]|0)+','+S.tint[3].toFixed(3)+')';sg.fillRect(0,0,w,h);
        sg.globalCompositeOperation='source-over';
        g.drawImage(scn.c,0,0);
        /* castle windows glow after dark; flag snaps in the gusts */
        for(i=0;i<winds.length;i++){
          var wn=winds[i],fk=.75+.25*Math.sin(t*3.1+i*1.9)*Math.sin(t*1.7+i),lv=.28+.72*S.win;
          if(S.win>.35){g.globalAlpha=(S.win-.2)*.3*fk;R(g,wn.x-1,wn.y-1,wn.a+2,wn.b+2,[255,190,90]);g.globalAlpha=1}
          R(g,wn.x,wn.y,wn.a,wn.b,[255*fk*lv+40*(1-lv),208*fk*lv+50*(1-lv),110*fk*lv+70*(1-lv)]);
        }
        if(flag)for(i=0;i<5+Math.round(gu*2);i++)R(g,flag.x+i,flag.y+Math.round(Math.sin(t*5-i*.9)*(1.2+gu*1.4)+i*gu*.4),1,2,i%2?[240,84,98]:[214,64,84]);
        /* god rays only while the sun is up */
        if(sunUp&&S.ray>.05){
          g.globalCompositeOperation='lighter';
          for(i=0;i<5;i++){
            var a=(.06+.05*(.5+.5*Math.sin(t*.5+i*1.4)))*S.ray,ax=sunX-i*2+Math.sin(t*.3+i)*2;
            g.fillStyle='rgba(255,'+(226-low*50|0)+',160,'+a.toFixed(3)+')';
            g.beginPath();g.moveTo(ax,sunY);g.lineTo(ax-w*.5+i*w*.13,h);g.lineTo(ax-w*.5+i*w*.13+w*.07,h);g.closePath();g.fill();
          }
          g.globalCompositeOperation='source-over';
        }
        /* wind streaks appear in gusts */
        if(gu>.12){
          for(i=0;i<8;i++){
            var wx=(((hs(i,31,9)*w+windX*(10+i*2))%(w+30))),wy=h*(.2+hs(i,32,9)*.55)+Math.sin(t*2+i)*1.2;
            g.globalAlpha=Math.min(.55,gu*.5);R(g,wx-12,wy,6+hs(i,33,9)*8,1,[255,255,255]);g.globalAlpha=1;
          }
        }
        /* leaves and pollen ride the wind */
        for(i=0;i<PT.length;i++){var pt=PT[i],lf=i%4===0,px=((pt.x+windX*pt.v*(lf?3.2:2)+Math.sin(t*pt.s+i)*3)%w+w)%w,py=(pt.y+t*pt.v*.5+Math.sin(t*pt.s*2+i)*1.5)%h;
          if(lf){R(g,px,py,2,1,pt.g?[120,190,80]:[220,170,70]);R(g,px+(Math.sin(t*4+i)>0?1:0),py+1,1,1,[90,140,60])}
          else R(g,px,py,1,1,pt.g?[180,230,110]:[255,230,150])}
        /* fireflies pulse and wander, brightest at night */
        var fz=.3+.7*S.star;
        for(i=0;i<FF.length;i++){
          var ff=FF[i],pl=Math.max(0,Math.sin(t*1.5*ff.s+ff.p))*fz,fx=ff.x+Math.sin(t*.4*ff.s+ff.p)*6+gu*3,fy=ff.y+Math.sin(t*.7*ff.s+ff.p*2)*4;
          if(pl<.05)continue;
          g.globalAlpha=pl*.5;R(g,fx-1,fy,3,1,[255,226,120]);R(g,fx,fy-1,1,3,[255,226,120]);
          g.globalAlpha=pl;R(g,fx,fy,1,1,[255,250,200]);g.globalAlpha=1;
        }
      }};
      cv._scene.draw(performance.now()/1000);
    }
    function paintAbolish(cv){
      var par=cv.parentNode;if(!par.clientWidth)return;
      var w=cv.width=Math.max(60,Math.ceil(par.clientWidth/3)),h=cv.height=Math.max(30,Math.ceil(par.clientHeight/3)),g=cv.getContext('2d');
      function mk(ww,hh){var c=document.createElement('canvas');c.width=ww||w;c.height=hh||h;return{c:c,g:c.getContext('2d')}}
      function rgb(c){return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'}
      function R(q,x,y,a,b,c){q.fillStyle=typeof c==='string'?c:rgb(c);q.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b))}
      var i,x,y,u=Math.max(.7,h/72),gy=h*.8,ex=w*.8,ey=h*.27,er=h*.13;
      var BLK=[18,8,24],RIM=[168,32,56],GOLD=[222,172,70],CR=[200,36,56];
      /* palace of black spires, drawn once; windows and crack glow animate on top */
      var far=mk(),mid=mk(),pal=mk(),p=pal.g,wins=[],lamps=[];
      function skyline(q,by,body,rim,hmin,hmax,wmin,wmax,sd,wp,anim,sp){
        var x=-4,r,k,wy,wx;
        while(x<w+4){
          var bw=wmin+hs(x,sd,1)*(wmax-wmin),bh=hmin+hs(x,sd,2)*(hmax-hmin),ty=by-bh,kind=hs(x,sd,3);
          R(q,x,ty,bw,bh+3,body);R(q,x+bw-1,ty,1,bh,rim);
          if(kind<sp){
            var sh=bw*1.7;
            for(r=0;r<sh;r++){var wd=bw*(1-r/sh)/2;R(q,x+bw/2-wd,ty-r-1,wd*2,1,body);R(q,x+bw/2+wd-.5,ty-r-1,1,1,rim)}
            R(q,x+bw/2,ty-sh-3*u,1,3*u,body);
          }else if(kind<sp+.25){for(k=0;k<bw;k+=2)R(q,x+k,ty-1.3,1,1.3,body)}
          else if(kind<sp+.4){R(q,x+bw*.2,ty-bh*.14,bw*.6,bh*.14,body);R(q,x+bw*.8-1,ty-bh*.14,1,bh*.14,rim)}
          for(wy=ty+2*u;wy<by-2*u;wy+=2.7*u)for(wx=x+1.3*u;wx<x+bw-1.7*u;wx+=2.3*u){
            if(hs(wx,wy,sd+5)<wp){
              if(anim)wins.push({x:wx,y:wy,a:Math.max(1,u*.9),b:Math.max(1,u*1.4),s:hs(wx,wy,9)});
              else R(q,wx,wy,Math.max(1,u*.8),Math.max(1,u),[255,176,96]);
            }
          }
          x+=bw+(hs(x,sd,4)>.8?2:0);
        }
      }
      skyline(far.g,gy-2*u,[120,34,66],[200,70,90],h*.12,h*.3,5*u,10*u,81,.22,false,.3);
      skyline(mid.g,gy-u,[62,20,48],[210,60,80],h*.14,h*.3,6*u,12*u,82,.34,false,.35);
      R(p,0,gy,w,h-gy,[28,10,24]);R(p,0,gy,w,1,[220,80,70]);for(y=gy+1;y<h;y++)R(p,0,y,w,1,mx([60,20,36],[14,6,14],(y-gy)/(h-gy)));
      skyline(p,gy,[24,10,28],[240,70,84],h*.12,h*.34,7*u,13*u,83,.5,true,.35);
      /* the grand black cathedral */
      var cx=w*.6;
      R(p,cx-9*u,gy-24*u,18*u,24*u,BLK);R(p,cx+9*u-1,gy-24*u,1,24*u,RIM);
      function ctower(tx){R(p,tx,gy-40*u,6*u,40*u,BLK);R(p,tx+6*u-1,gy-40*u,1,40*u,RIM);for(var r=0;r<16*u;r++){var wd=3*u*(1-r/(16*u));R(p,tx+3*u-wd,gy-40*u-r-1,wd*2+1,1,BLK);R(p,tx+3*u+wd-.5,gy-40*u-r-1,1,1,RIM)}R(p,tx+3*u,gy-40*u-16*u-3*u,1,3*u,BLK)}
      ctower(cx-12*u);ctower(cx+6*u);
      for(var r3=0;r3<24*u;r3++){var wd3=4*u*(1-r3/(24*u));R(p,cx-wd3,gy-24*u-r3-1,wd3*2,1,BLK);R(p,cx+wd3-.5,gy-24*u-r3-1,1,1,RIM)}
      R(p,cx,gy-24*u-24*u-4*u,1,4*u,BLK);
      R(p,cx-3*u,gy-8*u,6*u,8*u,[2,1,4]);for(i=0;i<3*u;i++)R(p,cx-(3*u-i),gy-8*u-i,(3*u-i)*2,1,[2,1,4]);
      wins.push({x:cx-6*u,y:gy-19*u,a:2*u,b:7*u,s:.2});wins.push({x:cx+4*u,y:gy-19*u,a:2*u,b:7*u,s:.6});wins.push({x:cx-u,y:gy-21*u,a:2*u,b:9*u,s:.9});
      wins.push({x:cx-10*u,y:gy-32*u,a:1.5*u,b:4*u,s:.4});wins.push({x:cx+8*u,y:gy-32*u,a:1.5*u,b:4*u,s:.8});
      /* street lamps */
      for(x=5*u;x<w;x+=9*u){R(p,x,gy-5*u,1,5*u,[70,34,40]);R(p,x-1,gy-5*u,3,1,[70,34,40]);lamps.push({x:x,y:gy-5*u,s:hs(x,90,3)})}
      /* entropy cracks in the ground */
      var CK=[];
      for(i=0;i<6;i++){var cx2=w*(.3+hs(i,64,3)*.7),cy2=gy+h*.03,pts=[];for(var k=0;k<14;k++){pts.push([cx2,cy2]);cx2+=(hs(i*20+k,65,3)-.5)*5;cy2+=1+hs(i*20+k,66,3)*1.5;if(cy2>h-1)break}CK.push(pts)}
      /* crimson fog strip that scrolls */
      var mc=mk(w,Math.ceil(h*.32)),mi=mc.g.createImageData(mc.c.width,mc.c.height),md=mi.data;
      for(y=0;y<mc.c.height;y++)for(x=0;x<mc.c.width;x++){
        var vv=.5+.25*Math.sin(x/w*6.2832*3+y*.5)+.25*Math.sin(x/w*6.2832*6-y*.8+2),al=Math.max(0,Math.min(1,(vv-.4)*1.7))*(1-Math.abs(y/mc.c.height-.5)*1.7),j=(y*mc.c.width+x)*4;
        md[j]=150;md[j+1]=26;md[j+2]=48;md[j+3]=Math.max(0,al*130);
      }
      mc.g.putImageData(mi,0,0);
      var ST=[],EM=[],AS=[];
      for(i=0;i<34;i++)ST.push({x:hs(i,70,3)*w,y:hs(i,71,3)*h*.55,p:hs(i,72,3)*6.28});
      for(i=0;i<46;i++)EM.push({x:hs(i,73,3)*w,y:hs(i,74,3)*h,v:3+hs(i,75,3)*7,s:.5+hs(i,76,3),g:hs(i,77,3)>.45});
      for(i=0;i<26;i++)AS.push({x:hs(i,78,3)*w,y:hs(i,79,3)*h,v:1.5+hs(i,80,3)*2.5,s:.4+hs(i,81,3)});
      function mist(t,yy,al,sp){var o=-((t*sp)%w);g.globalAlpha=al;g.drawImage(mc.c,o,yy);g.drawImage(mc.c,o+w,yy);g.globalAlpha=1}
      cv._scene={draw:function(t){
        g.globalAlpha=1;g.globalCompositeOperation='source-over';
        var pu=.5+.5*Math.sin(t*.5);
        var sg=g.createLinearGradient(0,0,0,gy);
        sg.addColorStop(0,'rgb(3,2,8)');sg.addColorStop(.45,'rgb('+(70+pu*12|0)+',12,42)');sg.addColorStop(1,'rgb('+(196+pu*26|0)+',52,60)');
        g.fillStyle=sg;g.fillRect(0,0,w,h);
        for(i=0;i<ST.length;i++){var s=ST[i],a=.2+.5*Math.max(0,Math.sin(t*1.1+s.p));g.globalAlpha=a;R(g,s.x,s.y,1,1,[230,190,120])}
        g.globalAlpha=1;
        /* black eclipse with a flaring crimson-gold corona */
        var gl=g.createRadialGradient(ex,ey,er*.8,ex,ey,er*3.2);
        gl.addColorStop(0,'rgba(220,40,60,'+(.55+.15*pu).toFixed(2)+')');gl.addColorStop(.4,'rgba(130,18,40,.25)');gl.addColorStop(1,'rgba(60,8,24,0)');
        g.fillStyle=gl;g.fillRect(0,0,w,h);
        for(var an=0;an<360;an+=3){
          var rad=an*Math.PI/180,fl=.5+.5*Math.sin(an*.17+t*1.4)*Math.sin(an*.05-t*.6),len=1+fl*3.2*(1+.4*pu);
          for(var d=0;d<len;d++){var rr=er+1+d;R(g,ex+Math.cos(rad)*rr,ey+Math.sin(rad)*rr,1,1,d<1?[255,214,130]:d<2?[236,96,72]:[160,28,52])}
        }
        for(y=-er;y<=er;y++)for(x=-er;x<=er;x++)if(x*x+y*y<=er*er)R(g,ex+x,ey+y,1,1,(x*x+y*y>(er-1.2)*(er-1.2)&&x+y>0)?[60,14,28]:[2,1,4]);
        /* rotating sigils of the Black Emperor */
        for(i=0;i<28;i++){var aa=i/28*6.2832+t*.15;if(i%3===0)R(g,ex+Math.cos(aa)*er*1.85,ey+Math.sin(aa)*er*1.85,2,1,GOLD);else R(g,ex+Math.cos(aa)*er*1.85,ey+Math.sin(aa)*er*1.85,1,1,[150,110,50])}
        for(i=0;i<12;i++){var ab2=-i/12*6.2832-t*.22;R(g,ex+Math.cos(ab2)*er*1.45,ey+Math.sin(ab2)*er*1.45,1,1,i%2?GOLD:CR)}
        g.drawImage(far.c,0,0);mist(t,h*.42,.5,2.5);g.drawImage(mid.c,0,0);mist(t,h*.52,.4,4);g.drawImage(pal.c,0,0);
        /* flicker of crimson and gold windows */
        for(i=0;i<wins.length;i++){var wn=wins[i],fk=.5+.5*Math.sin(t*2.3+i*2.1)*Math.sin(t*.9+i);g.globalAlpha=.4*fk;R(g,wn.x-1,wn.y-1,wn.a+2,wn.b+2,[255,120,60]);g.globalAlpha=.14*fk;R(g,wn.x-2,wn.y-2,wn.a+4,wn.b+4,[255,150,70]);g.globalAlpha=1;R(g,wn.x,wn.y,wn.a,wn.b,mx([200,70,50],[255,226,140],.35+.65*fk))}
        for(i=0;i<lamps.length;i++){var lp=lamps[i],lf=.7+.3*Math.sin(t*5+lp.s*20);g.globalAlpha=.4*lf;R(g,lp.x-2,lp.y-2,5,5,[255,170,70]);g.globalAlpha=.2*lf;R(g,lp.x-5,lp.y-5,11,11,[255,130,50]);g.globalAlpha=.16*lf;R(g,lp.x-9,gy+1,19,3,[255,150,70]);g.globalAlpha=1;R(g,lp.x,lp.y-1,1,2,[255,226,150]);g.globalAlpha=.18*lf;R(g,lp.x,lp.y+1,1,h-lp.y,[255,110,60]);g.globalAlpha=1}
        g.globalCompositeOperation='lighter';
        var cgl=g.createRadialGradient(w*.55,gy,0,w*.55,gy,w*.55);cgl.addColorStop(0,'rgba(255,120,60,'+(.28+.06*pu).toFixed(2)+')');cgl.addColorStop(1,'rgba(255,80,50,0)');
        g.fillStyle=cgl;g.fillRect(0,h*.2,w,h);
        for(i=0;i<3;i++){var bx=w*.6+(i-1)*9*u,ba=(.07+.04*Math.sin(t*.8+i*2)).toFixed(3);g.fillStyle='rgba(255,170,90,'+ba+')';g.beginPath();g.moveTo(bx-1,gy-24*u);g.lineTo(bx-9*u+i*9*u-2,0);g.lineTo(bx-9*u+i*9*u+7,0);g.lineTo(bx+1,gy-24*u);g.closePath();g.fill()}
        g.globalCompositeOperation='source-over';
        /* entropy cracks pulse like breathing */
        for(i=0;i<CK.length;i++){var cp=CK[i],pk=.35+.65*Math.max(0,Math.sin(t*1.2+i*1.7));for(var k2=0;k2<cp.length;k2++){g.globalAlpha=pk*.5;R(g,cp[k2][0]-1,cp[k2][1],3,1,[255,50,60]);g.globalAlpha=pk;R(g,cp[k2][0],cp[k2][1],1,1,[255,206,120])}g.globalAlpha=1}
        mist(t,h*.66,.6,5);
        /* embers climb, ash drifts down */
        for(i=0;i<EM.length;i++){var e=EM[i],ey2=((e.y-t*e.v)%h+h)%h,ex2=(e.x+Math.sin(t*e.s+i)*4+t*1.5)%w,fa=.5+.5*Math.sin(t*4*e.s+i);g.globalAlpha=.35+.65*fa;R(g,ex2,ey2,1,1,e.g?[255,200,100]:[240,60,60]);if(e.s>1){g.globalAlpha=.25;R(g,ex2,ey2-1,1,1,[255,120,80])}g.globalAlpha=1}
        for(i=0;i<AS.length;i++){var a3=AS[i],ay=(a3.y+t*a3.v)%h,ax=((a3.x+Math.sin(t*a3.s+i)*3+t*2.5)%w);g.globalAlpha=.5;R(g,ax,ay,1,1,[120,112,124]);g.globalAlpha=1}
        /* rare red lightning lights the whole realm */
        var ph=t%9,fl2=ph<.5?Math.max(0,1-ph/.5)*(Math.sin(ph*40)>-.2?1:.3):0;
        if(fl2>.02){g.fillStyle='rgba(255,90,100,'+(fl2*.22).toFixed(3)+')';g.fillRect(0,0,w,h)}
        var vg=g.createRadialGradient(w*.5,h*.5,h*.35,w*.5,h*.5,w*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.32)');g.fillStyle=vg;g.fillRect(0,0,w,h);
      }};
      cv._scene.draw(performance.now()/1000);
    }
    function paintRI(cv){
      var par=cv.parentNode;if(!par.clientWidth)return;
      var w=cv.width=Math.max(60,Math.ceil(par.clientWidth/3)),h=cv.height=Math.max(30,Math.ceil(par.clientHeight/3)),g=cv.getContext('2d');
      function mk(){var c=document.createElement('canvas');c.width=w;c.height=h;return{c:c,g:c.getContext('2d')}}
      function rgb(c){return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'}
      function R(q,x,y,a,b,c){q.fillStyle=typeof c==='string'?c:rgb(c);q.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b))}
      var i,x,y,u=Math.max(.7,h/72),hz=h*.84,mx0=w*.78,my0=h*.27,mr=h*.12,wins=[],lants=[];
      /* sky: moonlit jade night */
      var sk=mk(),q=sk.g;
      for(y=0;y<h;y++){var tt=y/hz;R(q,0,y,w,1,tt<.55?mx([6,10,22],[22,50,62],tt/.55):mx([22,50,62],[96,138,132],(tt-.55)/.45))}
      /* karst mountain ranges, hazier the further they are */
      function range(base,amp,col,sd,rim){
        var L=mk(),a=L.g;
        for(var X=0;X<w;X++){
          var v=vn(X*.06,sd),sp=Math.pow(Math.max(0,v-.42)*1.9,2.2),yy=base-sp*amp-vn(X*.22,sd+3)*amp*.1;
          R(a,X,yy,1,h,col);if(rim)R(a,X,yy,1,1,rim);
        }
        return L;
      }
      var far=range(h*.68,h*.46,[68,116,122],11,[150,200,190]),mid=range(h*.76,h*.4,[40,84,94],22,[100,156,150]),near=range(h*.86,h*.34,[10,26,34],33,null);
      /* a plateau with a five-tier pagoda */
      var pn=near.g,px=w*.3,pby=h*.66;
      for(x=px-w*.13;x<=px+w*.13;x++){var edge=1-Math.abs(x-px)/(w*.13);R(pn,x,pby+(1-Math.min(1,edge*3))*4,1,h,[10,26,34])}
      R(pn,px-7*u,pby-u,14*u,2*u,[26,36,40]);
      function tier(cx,by,tw,th){
        R(pn,cx-tw/2+u,by-th,tw-2*u,th,[14,20,26]);
        R(pn,cx-tw/2-3*u,by-th-u,tw+6*u,u*1.2,[22,18,20]);R(pn,cx-tw/2-3*u,by-th-u,tw+6*u,.6,[200,150,60]);
        R(pn,cx-tw/2-4*u,by-th-2*u,u,u,[22,18,20]);R(pn,cx+tw/2+3*u,by-th-2*u,u,u,[22,18,20]);
        wins.push({x:cx-u*.6,y:by-th*.7,a:Math.max(1,u*1.2),b:Math.max(2,u*2.2)});
        lants.push({x:cx-tw/2-3*u,y:by-th-u,s:hs(cx,by)*6});lants.push({x:cx+tw/2+3*u,y:by-th-u,s:hs(by,cx)*6});
      }
      var cy2=pby-u;[[14,6],[11.5,6],[9,5.5],[7,5],[5,5]].forEach(function(t2){tier(px,cy2,t2[0]*u,t2[1]*u);cy2-=(t2[1]+1.2)*u});
      R(pn,px-.5,cy2-5*u,1,5*u,[200,150,60]);R(pn,px-1,cy2-5*u,3,1,[200,150,60]);
      /* periodic qi mist strip */
      var mc=mk(),mi=mc.g.createImageData(w,Math.ceil(h*.3)),md=mi.data,mh=Math.ceil(h*.3);
      for(y=0;y<mh;y++)for(x=0;x<w;x++){var vv=.5+.25*Math.sin(x/w*6.2832*3+y*.45)+.25*Math.sin(x/w*6.2832*5-y*.8+1.7),al=Math.max(0,Math.min(1,(vv-.4)*1.6))*(1-Math.abs(y/mh-.5)*1.7),j=(y*w+x)*4;md[j]=170;md[j+1]=214;md[j+2]=200;md[j+3]=Math.max(0,al*120)}
      mc.g.putImageData(mi,0,0);
      var GU=[],CR=[],ST=[],BB=[];
      for(i=0;i<52;i++)GU.push({x:hs(i,1,7)*w,y:hs(i,2,7)*h,s:.5+hs(i,3,7),p:hs(i,4,7)*6.3,k:hs(i,5,7)<.5?0:hs(i,5,7)<.8?1:2,big:i<4});
      for(i=0;i<3;i++)CR.push({x:hs(i,6,7)*w,y:h*(.14+i*.09),v:3+i*1.2,p:i*2});
      for(i=0;i<42;i++)ST.push({x:hs(i,7,7)*w,y:hs(i,8,7)*h*.45,p:hs(i,9,7)*6.3});
      [.02,.055,.09,.93,.965].forEach(function(f,k){BB.push({x:f*w,top:h*(.12+hs(k,10,7)*.25),k:k})});
      var ISL=[[.58,.43,15,0],[.9,.58,10,1],[.45,.3,8,2]];
      function mist(t,yy,al,sp){var o=((t*sp)%w)-w;g.globalAlpha=al;g.drawImage(mc.c,o,yy);g.drawImage(mc.c,o+w,yy);g.globalAlpha=1}
      function island(cx,cy,sz,t,k){
        var b=Math.round(Math.sin(t*.7+k*2)*1.6),y0=cy+b,r,rows=sz*.9;
        for(r=0;r<rows;r++){var wd=sz*(1-r/rows)*(.85+.15*Math.sin(r*.9+k)),c=[28+r%3*3,40,44];R(g,cx-wd,y0+r,wd*2,1,c);R(g,cx-wd,y0+r,Math.max(1,wd*.5),1,[56,78,80])}
        R(g,cx-sz,y0-2,sz*2,2,[54,128,84]);R(g,cx-sz,y0-2,sz*2,1,[96,172,110]);
        var ps=Math.max(3,sz*.28);
        for(var tr=0;tr<3;tr++){var tw=ps*(1.6-tr*.35),ty=y0-3-tr*ps*.55;R(g,cx-tw/2,ty-ps*.5,tw,ps*.5,[16,22,26]);R(g,cx-tw/2-1,ty-ps*.5-1,tw+2,1,[210,160,64])}
        R(g,cx-.5,y0-3-ps*.5,1,2,[255,214,120]);
        for(var yy=y0+rows;yy<y0+rows+h*.22;yy++){if(Math.sin(yy*.9-t*9+k)>-.2){g.globalAlpha=.7*(1-(yy-y0-rows)/(h*.22));R(g,cx+Math.sin(yy*.3+t)*.6,yy,1,1,[210,240,236]);g.globalAlpha=1}}
      }
      cv._scene={draw:function(t){
        g.globalAlpha=1;g.globalCompositeOperation='source-over';
        var gu=Math.pow(Math.max(0,Math.sin(t*.37)*Math.sin(t*.21+1)),2);
        g.drawImage(sk.c,0,0);
        for(i=0;i<ST.length;i++){var s=ST[i];g.globalAlpha=.2+.6*Math.max(0,Math.sin(t*1.3+s.p));R(g,s.x,s.y,1,1,[210,236,226])}g.globalAlpha=1;
        /* a pale moon in a breathing halo */
        var pu=.5+.5*Math.sin(t*.45),hl=g.createRadialGradient(mx0,my0,mr*.6,mx0,my0,mr*3.4);
        hl.addColorStop(0,'rgba(210,240,225,'+(.42+.1*pu).toFixed(2)+')');hl.addColorStop(1,'rgba(120,190,170,0)');g.fillStyle=hl;g.fillRect(0,0,w,h);
        for(y=-mr;y<=mr;y++)for(x=-mr;x<=mr;x++)if(x*x+y*y<=mr*mr)R(g,mx0+x,my0+y,1,1,vn((x+mr)*.4,(y+mr)*.4)>.62?[206,222,204]:[238,244,226]);
        /* thin clouds slide across the moon */
        for(i=0;i<3;i++){var cx=(((hs(i,11,7)*w+t*(1.2+i*.5))%(w+60))+w+60)%(w+60)-30,cyy=my0-mr+i*mr*.9;g.globalAlpha=.35;R(g,cx,cyy,26+i*8,2,[150,196,190]);R(g,cx+5,cyy-1,16,1,[190,226,214]);g.globalAlpha=1}
        g.drawImage(far.c,0,0);mist(t,h*.46,.5,1.6);
        ISL.forEach(function(o){island(w*o[0],h*o[1],o[2]*u,t,o[3])});
        g.drawImage(mid.c,0,0);mist(t,h*.56,.45,2.4);
        g.drawImage(near.c,0,0);
        for(i=0;i<wins.length;i++){var wn=wins[i],fk=.65+.35*Math.sin(t*3+i*1.7)*Math.sin(t*1.3+i);g.globalAlpha=.3*fk;R(g,wn.x-1,wn.y-1,wn.a+2,wn.b+2,[255,170,70]);g.globalAlpha=1;R(g,wn.x,wn.y,wn.a,wn.b,mx([200,110,40],[255,226,130],fk))}
        for(i=0;i<lants.length;i++){var ln=lants[i],sw=Math.round(Math.sin(t*1.6+ln.s)*(1+gu*1.5));R(g,ln.x+sw,ln.y+1,1,2,[90,60,40]);R(g,ln.x+sw-.5,ln.y+3,2,2,[236,60,50]);g.globalAlpha=.3;R(g,ln.x+sw-1.5,ln.y+2.5,4,3,[255,90,60]);g.globalAlpha=1}
        mist(t,h*.66,.5,3.2);
        /* the immortal's flying sword, now and then */
        var sp=(t%13)/3.2;
        if(sp<1){var sx=sp*(w+30)-15,sy=h*.12+sp*h*.3;for(i=0;i<14;i++){g.globalAlpha=.7*(1-i/14);R(g,sx-i*1.4,sy-i*.45,1.6,1,i<2?[255,244,200]:[240,190,80])}g.globalAlpha=1;R(g,sx,sy,5,1,[236,244,250]);R(g,sx+1,sy-1,2,1,[190,220,236])}
        /* cranes */
        for(i=0;i<CR.length;i++){var c2=CR[i],cx2=(c2.x+t*c2.v)%(w+40)-20,cy3=c2.y+Math.sin(t*.8+c2.p)*3,fl=Math.sin(t*5+c2.p)>0?1:-1;R(g,cx2,cy3,3,1,[240,244,240]);R(g,cx2-3,cy3-fl,3,1,[226,232,230]);R(g,cx2+3,cy3-fl,3,1,[226,232,230]);R(g,cx2+3,cy3,1,1,[236,70,60])}
        /* Gu fireflies drift upward and pulse in jade, violet and gold */
        var COL=[[130,255,176],[196,128,255],[255,214,110]];
        for(i=0;i<GU.length;i++){
          var f=GU[i],fx=((f.x+Math.sin(t*.5*f.s+f.p)*9+t*1.6*f.s)%w+w)%w,fy=(((f.y-t*2.6*f.s)%h)+h)%h,pl=.35+.65*Math.max(0,Math.sin(t*1.8*f.s+f.p)),c3=COL[f.k];
          g.globalAlpha=.3*pl;R(g,fx-1,fy,3,1,c3);R(g,fx,fy-1,1,3,c3);g.globalAlpha=pl;R(g,fx,fy,1,1,[255,255,236]);
          if(f.big){for(var tl=1;tl<5;tl++){var ty=(((f.y-(t-tl*.08)*2.6*f.s)%h)+h)%h,tx=(((f.x+Math.sin((t-tl*.08)*.5*f.s+f.p)*9+(t-tl*.08)*1.6*f.s)%w)+w)%w;g.globalAlpha=pl*(.5-tl*.1);R(g,tx,ty,1,1,c3)}}
          g.globalAlpha=1;
        }
        /* spring water with the moon's reflection */
        for(y=hz;y<h;y++){R(g,0,y,w,1,mx([30,70,80],[6,20,28],(y-hz)/(h-hz)))}
        for(y=hz;y<h;y++){var off=Math.sin(y*.55+t*2)*2.2,ww=Math.max(1,mr*.8-(y-hz)*.5);g.globalAlpha=.3+.15*Math.sin(t*3+y);R(g,mx0+off-ww/2,y,ww,1,[210,236,214]);g.globalAlpha=1}
        for(i=0;i<22;i++){var gx=(hs(i,12,7)*w+t*(2+i%3))%w,gy=hz+2+hs(i,13,7)*(h-hz-3);g.globalAlpha=.5*(.5+.5*Math.sin(t*2+i));R(g,gx,gy,2+hs(i,14,7)*4,1,[180,226,214]);g.globalAlpha=1}
        /* bamboo at both edges, swaying with the wind */
        BB.forEach(function(b){
          for(var yy=h;yy>b.top;yy-=1){var k=1-yy/h,off=Math.round(Math.sin(t*1.2+b.k+yy*.03)*k*2.4*(1+gu*1.6)),nd=((Math.round(yy)+b.k*3)%7)===0;
            R(g,b.x+off,yy,2,1,nd?[8,24,20]:[16,48,34]);R(g,b.x+off,yy,1,1,nd?[10,30,24]:[44,108,74]);
            if(nd&&yy<h*.9&&yy>b.top+4){var dir=(b.k%2?1:-1);R(g,b.x+off+dir*2,yy-1,3,1,[30,96,62]);R(g,b.x+off+dir*4,yy,2,1,[24,76,50]);R(g,b.x+off+dir*3,yy+1,2,1,[46,120,80])}}
        });
        var vg=g.createRadialGradient(w*.5,h*.5,h*.3,w*.5,h*.5,w*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.4)');g.fillStyle=vg;g.fillRect(0,0,w,h);
      }};
      cv._scene.draw(performance.now()/1000);
    }
    function paintSeasons(cv){
      var par=cv.parentNode;if(!par.clientWidth)return;
      var w=cv.width=Math.max(60,Math.ceil(par.clientWidth/3)),h=cv.height=Math.max(30,Math.ceil(par.clientHeight/3)),g=cv.getContext('2d'),u=Math.max(.7,h/72);
      function mk(){var c=document.createElement('canvas');c.width=w;c.height=h;return{c:c,g:c.getContext('2d')}}
      function rgb(c){return'rgb('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+')'}
      function R(q,x,y,a,b,c){q.fillStyle=typeof c==='string'?c:rgb(c);q.fillRect(Math.round(x),Math.round(y),Math.round(a),Math.round(b))}
      var NAMES=['Spring','Summer','Autumn','Winter'],ACC=['#ff9ac4','#5ad06a','#f08a24','#8ad0ff'];
      var PAL=[
        {top:[150,196,240],mid:[250,214,232],bot:[255,238,226],far:[170,190,222],hill:[130,184,142],gnd:[98,164,98],tree:[255,166,200],hi:[255,216,232],trunk:[84,58,48],pond:[150,204,232],pond2:[110,170,210]},
        {top:[50,136,236],mid:[128,200,250],bot:[222,242,252],far:[92,150,192],hill:[58,152,72],gnd:[44,132,56],tree:[40,150,60],hi:[116,204,92],trunk:[84,58,40],pond:[90,186,226],pond2:[40,128,186]},
        {top:[112,64,100],mid:[236,128,70],bot:[255,204,124],far:[132,92,118],hill:[176,108,54],gnd:[150,96,44],tree:[214,70,38],hi:[255,176,52],trunk:[68,44,36],pond:[190,150,140],pond2:[120,90,100]},
        {top:[96,124,170],mid:[170,196,226],bot:[232,240,250],far:[146,166,198],hill:[204,216,234],gnd:[232,240,248],tree:[0,0,0],hi:[0,0,0],trunk:[66,54,52],pond:[204,232,246],pond2:[160,200,226]}];
      var px=w*.34,py=h*.9,prx=w*.24,pry=h*.065,tx=w*.76,pvx=w*.16;
      function disc(q,cx,cy,r,c1,c2,sd){
        for(var y=-r;y<=r;y++)for(var x=-r;x<=r;x++){var d=x*x+y*y;if(d>r*r+vn((cx+x)*.6,(cy+y)*.6,0)*r*.8)continue;
          var sh=((-x-y)/(r*1.6)+.5)+(vn((cx+x)*.5,(cy+y)*.5+sd,0)-.5)*.7;R(q,cx+x,cy+y,1,1,mx(c1,c2,Math.max(0,Math.min(1,sh))))}
      }
      function build(k){
        var L=mk(),q=L.g,P=PAL[k],X,Y,i;
        for(Y=0;Y<h*.78;Y++){var t2=Y/(h*.7);R(q,0,Y,w,1,t2<.5?mx(P.top,P.mid,t2*2):mx(P.mid,P.bot,Math.min(1,(t2-.5)*2)))}
        for(X=0;X<w;X++){var ry=h*.5-Math.pow(vn(X*.04,k+3,0),1.6)*h*.3;R(q,X,ry,1,h,P.far);if(k===3)R(q,X,ry,1,3,[240,246,255])}
        for(X=0;X<w;X++){var hy=h*.66-(Math.sin(X*.045+k)*.5+.5)*h*.1-vn(X*.09,k+7,0)*h*.05;R(q,X,hy,1,h,P.hill);R(q,X,hy,1,1,mx(P.hill,[255,255,255],.25));if(k===3)R(q,X,hy,1,3,[250,252,255])}
        if(k===0)for(i=0;i<70;i++){R(q,hs(i,3,9)*w,h*.62+hs(i,4,9)*h*.15,1,1,i%3?[255,214,230]:[255,246,180])}
        if(k===2)for(i=0;i<50;i++){R(q,hs(i,3,9)*w,h*.62+hs(i,4,9)*h*.15,1,1,i%2?[230,90,40]:[255,190,60])}
        R(q,0,h*.78,w,h,P.gnd);
        for(Y=h*.78;Y<h;Y+=1)for(X=0;X<w;X+=1)if(hs(X,Y,k)>.86)R(q,X,Y,1,1,mx(P.gnd,k===3?[200,214,236]:[255,255,255],.18));
        /* pond */
        for(Y=-pry;Y<=pry;Y++)for(X=-prx;X<=prx;X++){var e=(X*X)/(prx*prx)+(Y*Y)/(pry*pry);if(e>1)continue;R(q,px+X,py+Y,1,1,e>.88?mx(P.pond2,[0,0,0],.25):mx(P.pond,P.pond2,(Y+pry)/(pry*2)))}
        if(k===3)for(i=0;i<5;i++){var cx=px-prx*.6+hs(i,5,9)*prx*1.2;for(var s=0;s<8;s++)R(q,cx+s*.8,py-pry*.5+hs(i,6,9)*pry+(s%2),1,1,[250,254,255])}
        /* pavilion on the hill */
        var bx=pvx,by=h*.74;R(q,bx-6*u,by-7*u,12*u,7*u,[60,36,36]);R(q,bx-5*u,by-6*u,u,6*u,[170,50,50]);R(q,bx+4*u,by-6*u,u,6*u,[170,50,50]);
        for(i=0;i<8*u;i++){var rw=(14*u)*(1-i/(8*u))+2;R(q,bx-rw/2,by-7*u-i,rw,1,i%3?[150,44,44]:[196,70,60]);if(k===3)R(q,bx-rw/2,by-7*u-i,rw,1,[244,248,255])}
        R(q,bx-1,by-7*u-8*u-3,2,3,[200,150,60]);L.win={x:bx-1.5*u,y:by-5*u,a:3*u,b:4*u};
        /* the great tree */
        for(Y=h*.84;Y>h*.5;Y--){var tw=Math.max(2,4*u*(1-(h*.84-Y)/(h*.5))+1);R(q,tx-tw/2+(Math.sin(Y*.1)*.8),Y,tw,1,P.trunk);R(q,tx-tw/2,Y,1,1,mx(P.trunk,[255,255,255],.18))}
        if(k===3){
          for(i=0;i<9;i++){var ang=-1.2+i*.3,len=(10+hs(i,7,9)*9)*u,sx=tx,sy=h*.62-hs(i,8,9)*h*.1;for(var s2=0;s2<len;s2++){var bxx=sx+Math.cos(ang+(i%2?3.14-2.4:0))*s2*(i%2?1:1),byy=sy-Math.sin(Math.abs(ang)+.7)*s2*.8;R(q,bxx,byy,1,1,P.trunk);if(s2%3===0)R(q,bxx,byy-1,1,1,[246,250,255])}}
        }else{
          var cs=[[0,-.34,11],[-9,-.3,9],[9,-.31,9],[-4,-.42,8],[5,-.41,8],[0,-.5,6]];
          cs.forEach(function(c,ci){disc(q,tx+c[0]*u,h*(.5+(c[1]+.34)*.5)+0,c[2]*u,P.tree,P.hi,ci*5+k)});
          if(k===0)for(i=0;i<60;i++)R(q,tx-14*u+hs(i,9,9)*28*u,h*.3+hs(i,10,9)*h*.2,1,1,[255,246,250]);
        }
        return L;
      }
      var LY=[0,1,2,3].map(build);
      /* qi / mist strip, used for autumn and winter haze */
      var mh=Math.ceil(h*.28),mc=document.createElement('canvas');mc.width=w;mc.height=mh;var mg=mc.getContext('2d'),mi=mg.createImageData(w,mh),md=mi.data;
      for(var yy=0;yy<mh;yy++)for(var xx=0;xx<w;xx++){var vv=.5+.25*Math.sin(xx/w*6.2832*3+yy*.45)+.25*Math.sin(xx/w*6.2832*5-yy*.8+1.7),al=Math.max(0,Math.min(1,(vv-.4)*1.6))*(1-Math.abs(yy/mh-.5)*1.7),j=(yy*w+xx)*4;md[j]=255;md[j+1]=240;md[j+2]=226;md[j+3]=Math.max(0,al*110)}
      mg.putImageData(mi,0,0);
      function mistS(q,t,yy,al,sp){var o=((t*sp)%w)-w;q.globalAlpha=al;q.drawImage(mc,o,yy);q.drawImage(mc,o+w,yy);q.globalAlpha=1}
      function cloud(q,x,y,l,col){R(q,x,y,l,2,col);R(q,x+3,y-1,l*.6,1,mx(col,[255,255,255],.5));R(q,x-2,y+2,l*.8,1,mx(col,[140,150,180],.25))}
      function frame(q,k,t,gu){
        q.globalAlpha=1;q.drawImage(LY[k].c,0,0);var i,P=PAL[k];
        if(k===0){
          var sg=q.createRadialGradient(w*.15,h*.16,0,w*.15,h*.16,h*.5);sg.addColorStop(0,'rgba(255,244,214,.55)');sg.addColorStop(1,'rgba(255,230,200,0)');q.fillStyle=sg;q.fillRect(0,0,w,h);
          for(i=0;i<4;i++)cloud(q,((hs(i,1,5)*w+t*(1+i*.4))%(w+50))-25,h*(.08+hs(i,2,5)*.16),16+hs(i,3,5)*12,[255,248,248]);
          for(i=0;i<4;i++){var bxx=w*(.2+hs(i,4,5)*.5)+Math.sin(t*.5+i*2)*10,byy=h*.58+Math.sin(t*.8+i)*5+hs(i,5,5)*h*.1,fl=Math.sin(t*14+i*2)>0?1:0;R(q,bxx,byy,1,1,[60,40,40]);R(q,bxx-1,byy-fl,1,1,i%2?[255,150,200]:[255,214,100]);R(q,bxx+1,byy-fl,1,1,i%2?[255,150,200]:[255,214,100])}
          for(i=0;i<80;i++){var ppx=(hs(i,6,5)*w+t*(3+hs(i,7,5)*4)*(1+gu)+Math.sin(t*1.3+i)*4)%w,ppy=(hs(i,8,5)*h+t*(4+hs(i,9,5)*5))%(h*.96);q.globalAlpha=.9;R(q,ppx,ppy,i%4?1:2,1,i%3?[255,176,208]:[255,244,248])}q.globalAlpha=1;
          for(i=0;i<6;i++)R(q,px-prx*.7+hs(i,10,5)*prx*1.4+Math.sin(t+i)*1.5,py+Math.sin(t*1.4+i)*pry*.4,2,1,[255,190,214]);
        }else if(k===1){
          var sx=w*.16,sy=h*.18;var sg2=q.createRadialGradient(sx,sy,0,sx,sy,h*.6);sg2.addColorStop(0,'rgba(255,250,214,.7)');sg2.addColorStop(1,'rgba(255,240,180,0)');q.fillStyle=sg2;q.fillRect(0,0,w,h);
          for(y2=-5;y2<=5;y2++)for(x2=-5;x2<=5;x2++)if(x2*x2+y2*y2<=h*h*.0063)R(q,sx+x2,sy+y2,1,1,[255,250,214]);
          q.globalCompositeOperation='lighter';for(i=0;i<5;i++){q.fillStyle='rgba(255,236,160,'+(.05+.04*Math.sin(t*.6+i)).toFixed(3)+')';q.beginPath();q.moveTo(sx,sy);q.lineTo(sx+w*(.1+i*.22),h*.78);q.lineTo(sx+w*(.1+i*.22)+w*.07,h*.78);q.closePath();q.fill()}q.globalCompositeOperation='source-over';
          for(i=0;i<5;i++)cloud(q,((hs(i,1,6)*w+t*(1.4+i*.3))%(w+60))-30,h*(.08+hs(i,2,6)*.2),20+hs(i,3,6)*16,[255,255,255]);
          for(i=0;i<3;i++){var dx=w*(.3+i*.2)+Math.sin(t*.9+i*3)*12,dy=h*.62+Math.sin(t*1.7+i)*3,hov=((t*1.3+i)%3)<.4?Math.sin(t*30)*2:0;R(q,dx+hov,dy,4,1,[40,170,190]);R(q,dx+1+hov,dy-1,2,1,[220,240,250]);R(q,dx+hov,dy+1,1,1,[220,240,250])}
          for(i=0;i<24;i++){var gx=px-prx+hs(i,11,6)*prx*2,gy=py-pry+hs(i,12,6)*pry*2;q.globalAlpha=.5+.5*Math.sin(t*3+i);R(q,gx,gy,2,1,[255,255,255]);q.globalAlpha=1}
          for(i=0;i<3;i++){var lx=px-prx*.5+i*prx*.5,ly=py+Math.sin(t*1.2+i)*.6;R(q,lx-3,ly,7,1,[60,160,70]);R(q,lx-1,ly-2,3,2,[255,150,190])}
          for(i=0;i<w;i+=3){var gh=3+Math.round(hs(i,13,6)*4),sw=Math.round(Math.sin(t*2+i*.3)*(1+gu*2));R(q,i+sw*.5,h-gh,1,gh,[30,110,50]);R(q,i+sw,h-gh-1,1,1,[70,170,80])}
        }else if(k===2){
          var sx2=w*.2,sy2=h*.62,hl=q.createRadialGradient(sx2,sy2,0,sx2,sy2,h*.7);hl.addColorStop(0,'rgba(255,170,80,'+(.55+.1*Math.sin(t*.5)).toFixed(2)+')');hl.addColorStop(1,'rgba(255,120,60,0)');q.fillStyle=hl;q.fillRect(0,0,w,h);
          for(y2=-6;y2<=6;y2++)for(x2=-6;x2<=6;x2++)if(x2*x2+y2*y2<=h*h*.0072)R(q,sx2+x2,sy2+y2,1,1,[255,200,110]);
          mistS(q,t,h*.55,.4,2);
          var gf=((t*4)%(w+80))-40;for(i=0;i<7;i++){var gxx=gf-Math.abs(i-3)*0+(i>3?-(i-3)*5:-(3-i)*5),gyy=h*.2+Math.abs(i-3)*3+Math.sin(t*.6)*2,fl2=Math.sin(t*7+i)>0?1:-1;R(q,gxx,gyy,2,1,[50,36,50]);R(q,gxx-1,gyy-fl2,1,1,[50,36,50]);R(q,gxx+2,gyy-fl2,1,1,[50,36,50])}
          for(i=0;i<64;i++){var lx2=(hs(i,6,7)*w+t*(2+hs(i,7,7)*3)*(1+gu*1.5)+Math.sin(t*1.6+i)*5)%w,ly2=(hs(i,8,7)*h+t*(5+hs(i,9,7)*5))%(h*.96),c4=i%3===0?[210,60,36]:i%3===1?[255,166,40]:[255,214,80],fl3=Math.sin(t*5+i)>0;R(q,lx2,ly2,fl3?2:1,fl3?1:2,c4)}
          for(i=0;i<5;i++)R(q,px-prx*.6+hs(i,10,7)*prx*1.2+Math.sin(t*.8+i)*1.5,py+Math.sin(t*1.2+i)*pry*.4,2,1,[236,110,50]);
        }else{
          for(i=0;i<46;i++){var sa=.25+.6*Math.max(0,Math.sin(t*1.2+i));q.globalAlpha=sa;R(q,hs(i,1,8)*w,hs(i,2,8)*h*.4,1,1,[236,244,255])}q.globalAlpha=1;
          q.globalCompositeOperation='lighter';
          for(i=0;i<3;i++){for(X2=0;X2<w;X2+=2){var ay=h*(.12+i*.07)+Math.sin(X2*.05+t*.4+i*2)*6,aa=(.1+.07*Math.sin(t*.5+X2*.03+i))*(1-i*.2);q.fillStyle='rgba('+(i===1?190:110)+','+(i===1?120:240)+','+(i===1?255:190)+','+aa.toFixed(3)+')';q.fillRect(X2,ay,2,h*.16)}}
          q.globalCompositeOperation='source-over';
          var mx2=w*.22,my2=h*.2;for(y2=-6;y2<=6;y2++)for(x2=-6;x2<=6;x2++)if(x2*x2+y2*y2<=h*h*.0056)R(q,mx2+x2,my2+y2,1,1,(x2+y2*.5)>2?[196,210,236]:[240,246,255]);
          mistS(q,t,h*.6,.35,1.2);
          var W2=LY[3].win,fk=.7+.3*Math.sin(t*3)*Math.sin(t*1.3);q.globalAlpha=.4*fk;R(q,W2.x-1,W2.y-1,W2.a+2,W2.b+2,[255,170,70]);q.globalAlpha=1;R(q,W2.x,W2.y,W2.a,W2.b,mx([200,110,40],[255,226,130],fk));
          for(i=0;i<8;i++){q.globalAlpha=.5*(1-((t*.6+i*.3)%1));R(q,pvx+3*u+Math.sin(t+i)*1.4,h*.74-18*u-((t*.6+i*.3)%1)*10,1,1,[230,236,246])}q.globalAlpha=1;
          for(i=0;i<8;i++){var gx2=px-prx+hs(i,3,8)*prx*2,gy2=py-pry+hs(i,4,8)*pry*2;q.globalAlpha=.4+.6*Math.max(0,Math.sin(t*2.4+i*1.7));R(q,gx2,gy2,2,1,[255,255,255]);q.globalAlpha=1}
          var cl=(t%7)/2.2;if(cl<1){R(q,tx-6*u+hs(Math.floor(t/7),1,1)*12*u,h*.45+cl*cl*h*.4,2,2,[250,252,255]);R(q,tx-6*u+hs(Math.floor(t/7),1,1)*12*u+1,h*.45+cl*cl*h*.4-2,1,1,[230,238,250])}
          for(i=0;i<130;i++){var near=i>80,spd=near?9+hs(i,5,8)*6:4+hs(i,5,8)*3,fx=(hs(i,6,8)*w+t*(near?3:1.2)*(1+gu)+Math.sin(t*(near?1.4:.8)+i)*(near?4:2))%w,fy=(hs(i,7,8)*h+t*spd)%h;q.globalAlpha=near?1:.65;R(q,fx,fy,near&&i%3===0?2:1,near&&i%3===0?2:1,[250,252,255])}q.globalAlpha=1;
        }
        /* wind: streaks, shed blossoms/leaves/snow from the great tree, all driven by gust gu */
        var WC=[[255,200,220],[200,244,170],[240,130,50],[240,248,255]][k],wi,wk=gu>.5?Math.min(1,(gu-.5)/1.2):0;
        for(wi=0;wi<9;wi++){var wy=h*(.12+hs(wi,41,5)*.6),wl=10+hs(wi,42,5)*18,wx=((t*(26+hs(wi,43,5)*22)*(.5+gu*.6)+hs(wi,44,5)*w*2)%(w+60))-30;q.globalAlpha=.1+.28*wk;R(q,wx,wy+Math.sin(t*2+wi)*1.5,wl,1,[255,255,255]);R(q,wx+wl,wy+Math.sin(t*2+wi)*1.5+1,wl*.4,1,[255,255,255])}
        if(k!==3||true){for(wi=0;wi<22;wi++){var life=((t*.5+hs(wi,45,5)*3)%3)/3,sx0=tx-8*u+hs(wi,46,5)*16*u,sy0=h*.42+hs(wi,47,5)*h*.1,dist=life*w*.55*(.3+gu*.5);q.globalAlpha=Math.min(1,(1-life)*1.6)*(.4+.6*wk);R(q,sx0+dist,sy0+life*h*.3+Math.sin(life*9+wi)*3,wi%3?1:2,1,WC)}}
        q.globalAlpha=1;
        var vg=q.createRadialGradient(w*.5,h*.5,h*.35,w*.5,h*.5,w*.62);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.3)');q.fillStyle=vg;q.fillRect(0,0,w,h);
      }
      var oc=mk(),t0=cv._sT0||(cv._sT0=performance.now()/1000),lastK=-1,x2,y2,X2;
      cv._scene={draw:function(t){
        var el=t-t0,gu=.3+1.7*Math.pow(Math.max(0,Math.sin(t*.37)*Math.sin(t*.21+1)),2),k=Math.floor(el/15)%4,ph=el%15;
        if(k<0)k=0;
        g.globalAlpha=1;g.globalCompositeOperation='source-over';
        frame(g,k,t,gu);
        var kk=k;
        if(ph>12){
          var p=(ph-12)/3;p=p*p*(3-2*p);var nk=(k+1)%4,edge=-14+p*(w+44),wv=function(y){return edge+Math.sin(y*.16+t*3)*5+Math.sin(y*.07-t*2)*4};
          frame(oc.g,nk,t,gu);
          g.save();g.beginPath();g.moveTo(0,0);var yy;for(yy=0;yy<=h;yy+=2)g.lineTo(wv(yy),yy);g.lineTo(0,h);g.closePath();g.clip();g.drawImage(oc.c,0,0);g.restore();
          var C=[[[255,176,208],[255,244,248]],[[120,214,90],[255,255,200]],[[230,90,40],[255,190,60]],[[250,252,255],[200,226,250]]][nk],i3,fl=Math.sin(Math.PI*Math.min(1,p));
          for(i3=0;i3<90;i3++){var fy=(hs(i3,31,4)*h),fx=wv(fy)-(hs(i3,32,4)*26*(.4+p))+Math.sin(t*5+i3)*3+(hs(i3,33,4)-.3)*14;g.globalAlpha=Math.min(1,fl*1.6)*(.5+.5*hs(i3,34,4));R(g,fx,fy+Math.sin(t*3+i3)*2,i3%4?1:2,i3%3?1:2,C[i3%2])}
          g.globalAlpha=1;
          if(p>.5)kk=nk;
        }
        if(kk!==lastK){lastK=kk;if(cv.onSeason)cv.onSeason(kk,NAMES[kk],ACC[kk])}
      }};
      cv._scene.draw(performance.now()/1000);
    }
    function paint(cv){
      if(cv.getAttribute('data-bg')==='castle')return paintCastle(cv);
      if(cv.getAttribute('data-bg')==='abolish')return paintAbolish(cv);
      if(cv.getAttribute('data-bg')==='insanity')return paintRI(cv);
      if(cv.getAttribute('data-bg')==='seasons')return paintSeasons(cv);
      var P=PAL2[cv.getAttribute('data-bg')],par=cv.parentNode;if(!P||!par.clientWidth)return;
      var w=cv.width=Math.max(60,Math.ceil(par.clientWidth/3)),h=cv.height=Math.max(30,Math.ceil(par.clientHeight/3)),
          g=cv.getContext('2d'),im=g.createImageData(w,h),d=im.data,sd=P.seed,hz=h*.7;
      for(var y=0;y<h;y++)for(var x=0;x<w;x++){
        var c,v=y/h;
        var top=h*.12+vn(x*.05,0,sd)*h*.14;
        var lx=w*.1+vn(y*.06,0,sd+5)*w*.09;
        var rx=w*.9-vn(y*.06,1,sd+6)*w*.07-(y>hz?(y-hz)*.6:0);
        var b1=Math.pow((x-w*.6)/(w*.075),2)+Math.pow((y-hz)/(h*.24),2)+(vn(x*.2,y*.2,sd+11)-.5)*.5;
        var b2=Math.pow((x-w*.36)/(w*.05),2)+Math.pow((y-hz-h*.04)/(h*.16),2)+(vn(x*.2,y*.2,sd+12)-.5)*.5;
        var rock=(x<lx&&y>h*.04)||x>rx||b1<1||b2<1;
        if(rock){
          var sh=vn(x*.13,y*.16,sd+7)*.75+vn(x*.5,y*.5,sd+9)*.25;
          c=sh>.62?P.rh:sh<.3?P.rl:P.rk;
          if(vn(x*.3,y*.3,sd+8)>.8&&y<hz+h*.1)c=P.mo;
        }else if(y>=hz){
          c=mx(P.p0,P.p1,(y-hz)/(h-hz));
          var rp=vn(x*.22,y*.95,sd+3);
          if(rp>.74)c=mx(c,P.mist,.5);
          else if(vn(x*.3,y*1.3,sd+4)>.8)c=mx(c,P.fall,.7);
        }else if(y>=top){
          var st=vn(x*.55,y*.02,sd+1)*.6+vn(x*.2,y*.01,sd+2)*.4,fb=Math.round(Math.max(0,Math.min(1,(st-.3)*2.8))*4)/4,m=(y-top)/(hz-top);
          c=mx(mx(P.far,P.fall,fb),P.mist,m*m*.85);
        }else{
          c=mx(P.s0,P.s1,v/(top/h+.001));
        }
        var i=(y*w+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=255;
      }
      g.putImageData(im,0,0);
    }
    function paintAll(){Array.prototype.forEach.call(ab.querySelectorAll('canvas.bg'),paint)}
    var raf=0,calm=false,lastF=0;
    function loop(now){
      if(ab.hidden){raf=0;return}
      if(now-lastF>=33){lastF=now;Array.prototype.forEach.call(ab.querySelectorAll('canvas.bg'),function(cv){if(cv._scene)cv._scene.draw(now/1000)})}
      raf=requestAnimationFrame(loop);
    }
    window.addEventListener('resize',function(){if(!ab.hidden)paintAll()});
    (function(){
      var card=$('speyCard'),role=$('speyRole'),T=role.getAttribute('data-titles').split('|'),ix=0,pip=document.createElement('span');
      pip.className='tpip';pip.setAttribute('aria-hidden','true');
      pip.innerHTML='<span>Switch mode</span>'+T.map(function(_,k){return'<i'+(k?'':' class="on"')+'></i>'}).join('');
      card.appendChild(pip);
      function go(){
        ix=(ix+1)%T.length;sfx.blip();card.classList.remove('morph');void card.offsetWidth;card.classList.add('morph');setTimeout(function(){card.classList.remove('morph')},600);
        role.classList.add('swap');
        setTimeout(function(){
          role.textContent=T[ix];role.classList.toggle('alt',ix>0);
          card.classList.toggle('abolish',ix>0);
          var tg=$('speyTags');if(!tg._d)tg._d=tg.innerHTML;
          tg.innerHTML=ix>0?tg.getAttribute('data-alt').split('|').map(function(x){return'<span>'+x+'</span>'}).join(''):tg._d;
          var bio=$('speyBio');if(!bio._d)bio._d=bio.innerHTML;bio.innerHTML=ix>0?bio.getAttribute('data-alt'):bio._d;
          var bgc=card.querySelector('canvas.bg');bgc.setAttribute('data-bg',ix>0?'abolish':'castle');paintAll();
          Array.prototype.forEach.call(pip.querySelectorAll('i'),function(d,k){d.classList.toggle('on',k===ix)});
          role.classList.remove('swap');
        },130);
      }
      card.addEventListener('click',go);
      card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
    })();
    (function(){
      var card=$('dejaCard'),role=$('dejaRole'),tg=$('dejaTags'),T=role.getAttribute('data-titles').split('|'),ix=0,pip=document.createElement('span'),home=tg.innerHTML;
      pip.className='tpip';pip.setAttribute('aria-hidden','true');
      pip.innerHTML='<span>Switch mode</span>'+T.map(function(_,k){return'<i'+(k?'':' class="on"')+'></i>'}).join('');
      card.appendChild(pip);
      var bgc=card.querySelector('canvas.bg'),homeVars=['#ff7ab8','#ff7ab8','#d9b0ff','#ff5a9a'];
      function vars(c,a,b,d){card.style.setProperty('--c',c);card.style.setProperty('--b1',a);card.style.setProperty('--b2',b);card.style.setProperty('--b3',d)}
      bgc.onSeason=function(k,name,acc){
        if(ix===0)return;
        var sets=[['#ff9ac4','#ffd0e4','#ff6fa8'],['#5ad06a','#d4ffb0','#2fa84a'],['#f08a24','#ffd27a','#d4501a'],['#8ad0ff','#e6f6ff','#5aa8e8']][k];
        vars(acc,sets[0],sets[1],sets[2]);
        tg.innerHTML='<span>Four Season</span><span>Youthful</span><span>Old Man</span><span>Peace</span>';
      };
      function go(){
        ix=(ix+1)%T.length;sfx.blip();card.classList.remove('morph');void card.offsetWidth;card.classList.add('morph');setTimeout(function(){card.classList.remove('morph')},600);
        role.classList.add('swap');
        setTimeout(function(){
          var bio=$('dejaBio');if(!bio._d)bio._d=bio.textContent;bio.textContent=ix>0?bio.getAttribute('data-alt'):bio._d;role.textContent=T[ix];role.classList.toggle('alt',ix>0);
          Array.prototype.forEach.call(pip.querySelectorAll('i'),function(d,k){d.classList.toggle('on',k===ix)});
          if(ix>0)bgc._sT0=performance.now()/1000;bgc.setAttribute('data-bg',ix>0?'seasons':'insanity');
          if(ix===0){tg.innerHTML=home;card.style.removeProperty('--b1');card.style.removeProperty('--b2');card.style.removeProperty('--b3');card.style.setProperty('--c','#8fd4ee')}
          paintAll();role.classList.remove('swap');
        },130);
      }
      card.addEventListener('click',go);
      card.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
    })();
    function open(){from=document.activeElement;sfx.portal();ab.hidden=false;paintAll();if(!calm&&!raf)raf=requestAnimationFrame(loop);$('aboutClose').focus()}
    function close(){ab.hidden=true;if(from&&from.focus)from.focus()}
    $('navAbout').addEventListener('click',open);
    $('aboutClose').addEventListener('click',close);
    ab.addEventListener('click',function(e){if(e.target===ab)close()});
    document.addEventListener('keydown',function(e){
      if(ab.hidden)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
      else if(e.key==='Tab'){e.preventDefault();$('aboutClose').focus()}
    },true);
  })();

  /* Blogs: dated posts about what gets made and updated, read from the "posts" collection */
  (function(){
    var bl=$('blogs'),list=$('blogList'),note=$('blogNote'),cnt=$('blogCount'),from=null,posts=[],state='idle',loaded=false;
    var PAL=['#f08a24','#ff7ab8','#6fd0e8','#b48cff','#7ff0b0','#e8c15a'];
    function colorFor(name){var n=0,i;for(i=0;i<name.length;i++)n=(n*31+name.charCodeAt(i))>>>0;return PAL[n%PAL.length]}
    function safe(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:''}
    function when(ms){try{return new Date(ms).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}catch(e){return''}}
    function render(){
      list.textContent='';
      cnt.textContent=posts.length?posts.length+(posts.length===1?' post':' posts'):'';
      if(!loaded){list.appendChild(h('p',{class:'bempty',text:'Opening the blog...'}));return}
      if(!posts.length){list.appendChild(h('p',{class:'bempty',text:'Coming soon. Updates about everything I create will be posted here.'}));return}
      posts.forEach(function(p){
        var c=colorFor(p.project||p.title),lk=safe(p.link);
        var tag=p.project?(lk?h('a',{class:'ptag',href:lk,target:'_blank',rel:'noopener'},p.project):h('span',{class:'ptag',text:p.project})):null;
        var paras=String(p.body||'').split(/\n{2,}/).map(function(t){return h('p',{text:t})});
        list.appendChild(h('article',{class:'post',style:'--c:'+c},
          h('div',{class:'phead'},h('time',{text:when(p.createdAt)}),tag),
          h('h3',{text:p.title||'Untitled'}),paras));
      });
    }
    function load(){
      if(state!=='idle')return;state='loading';render();
      (async function(){
        var db=null;
        try{db=await (window.claude&&window.claude.use?window.claude.use('db'):null)}catch(e){db=null}
        if(!db){loaded=true;state='done';
          if(window.__SEED&&window.__SEED.posts){posts=window.__SEED.posts.map(function(o){return{id:o.id,title:String(o.title||'').slice(0,140),body:String(o.body||'').slice(0,6000),project:String(o.project||'').slice(0,60),link:o.link,createdAt:Number(o.createdAt)||0}}).sort(function(a,b){return b.createdAt-a.createdAt});note.hidden=true}
          else{note.hidden=false;note.textContent='The blog could not be opened in this view.'}
          render();return}
        db.collection('posts').onSnapshot(function(snap){
          posts=snap.docs.map(function(d){var o=d.data()||{};return{id:d.id,title:String(o.title||'').slice(0,140),body:String(o.body||'').slice(0,6000),project:String(o.project||'').slice(0,60),link:o.link,createdAt:Number(o.createdAt)||0}}).sort(function(a,b){return b.createdAt-a.createdAt});
          loaded=true;state='done';note.hidden=true;render();
        },function(){loaded=true;state='done';note.hidden=false;note.textContent='The blog could not be reached.';render()});
      })();
    }
    function open(){from=document.activeElement;sfx.portal();bl.hidden=false;load();render();$('blogsClose').focus()}
    function close(){bl.hidden=true;if(from&&from.focus)from.focus()}
    $('navBlogs').addEventListener('click',open);
    $('blogsClose').addEventListener('click',close);
    bl.addEventListener('click',function(e){if(e.target===bl)close()});
    document.addEventListener('keydown',function(e){
      if(bl.hidden)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
    },true);
  })();
  document.addEventListener('pointerover',function(e){
    if(e.pointerType==='touch')return;
    var b=e.target.closest&&e.target.closest('.btn,.cat-tab,.navbrand,.dest');
    if(!b||(e.relatedTarget&&b.contains(e.relatedTarget)))return;
    sfx.tick();
  });
  /* header embers: tiny pixel sparks drift up off the bar's lower edge */
  (function(){
    var cv=$('navfx'),g=cv.getContext('2d'),ps=[],nw=0,nh=0,fr=0,col='#ffb454',last=performance.now();
    if(reduce)return;
    function size(){var r=cv.parentNode.getBoundingClientRect();nw=cv.width=Math.max(20,Math.round(r.width/3));nh=cv.height=Math.max(10,Math.round(r.height/3))}
    size();window.addEventListener('resize',size);
    function tick(now){
      var dt=Math.min(.05,(now-last)/1000);last=now;
      if(document.hidden){requestAnimationFrame(tick);return}
      if(!(fr++%40)){try{col=getComputedStyle(document.documentElement).getPropertyValue('--ember-hot').trim()||col}catch(e){}}
      if(Math.random()<dt*7)ps.push({x:Math.random()*nw,y:nh-1,vx:(Math.random()-.5)*4,vy:-(5+Math.random()*9),l:0,m:.9+Math.random()*1.2});
      g.clearRect(0,0,nw,nh);
      for(var i=ps.length-1;i>=0;i--){
        var p=ps[i];p.l+=dt;if(p.l>p.m||p.y<0){ps.splice(i,1);continue}
        p.x+=(p.vx+Math.sin(now/300+i)*2)*dt;p.y+=p.vy*dt;
        g.globalAlpha=1-p.l/p.m;g.fillStyle=p.l<p.m*.5?col:'#c24a1a';g.fillRect(p.x|0,p.y|0,1,1);
      }
      g.globalAlpha=1;requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();
  /* pixel app icons: 16x16 bitmaps painted onto small canvases */
  (function(){
    var ART={
      discord:{bg:'#5865f2',fg:'#ffffff',rows:[
        '.BBBBBBBBBBBBBB.','BBBBBBBBBBBBBBBB','BBBBBBBBBBBBBBBB','BBBBWWBBBBWWBBBB','BBBWWWWWWWWWWBBB','BBWWWWWWWWWWWWBB','BBWWWWWWWWWWWWBB','BWWWBBWWWWBBWWWB','BWWWBBWWWWBBWWWB','BWWWWWWWWWWWWWWB','BBWWWWWWWWWWWWBB','BBWWWWBBBBWWWWBB','BBBWWWBBBBWWWBBB','BBBBBBBBBBBBBBBB','BBBBBBBBBBBBBBBB','.BBBBBBBBBBBBBB.']}
    };
    var ROUND=function(x,y){return (x===0||x===15)&&(y===0||y===15)};
    function draw(cv,name){
      cv.width=16;cv.height=16;var g=cv.getContext('2d'),x,y;g.clearRect(0,0,16,16);
      function px(x,y,c){g.fillStyle=c;g.fillRect(x,y,1,1)}
      if(name==='instagram'){
        for(y=0;y<16;y++)for(x=0;x<16;x++){
          if(ROUND(x,y))continue;
          var t=((15-y)+x)/30,c=t<.2?'#ffd35a':t<.4?'#fa7e1e':t<.6?'#d62976':t<.8?'#962fbf':'#4f5bd5';px(x,y,c);
        }
        var W='#fff',i;
        for(i=3;i<=12;i++){px(i,3,W);px(i,12,W);px(3,i,W);px(12,i,W)}
        px(3,3,'transparent');
        g.clearRect(3,3,1,1);g.clearRect(12,3,1,1);g.clearRect(3,12,1,1);g.clearRect(12,12,1,1);
        [[3,3],[12,3],[3,12],[12,12]].forEach(function(p){var q=((15-p[1])+p[0])/30;px(p[0],p[1],q<.2?'#ffd35a':q<.4?'#fa7e1e':q<.6?'#d62976':q<.8?'#962fbf':'#4f5bd5')});
        for(y=5;y<11;y++)for(x=5;x<11;x++){var d=Math.hypot(x-7.5,y-7.5);if(d<3.3&&d>1.7)px(x,y,W)}
        px(10,5,W);return;
      }
      if(name==='x'){
        for(y=0;y<16;y++)for(x=0;x<16;x++)if(!ROUND(x,y))px(x,y,(x===0||y===0||x===15||y===15)?'#2f3336':'#000');
        for(i=3;i<13;i++){px(i,i,'#fff');px(i+1,i,'#fff')}
        for(i=3;i<13;i++)px(15-i,i,'#fff');
        px(3,3,'#fff');px(12,12,'#fff');return;
      }
      if(name==='github'){
        for(y=0;y<16;y++)for(x=0;x<16;x++)if(!ROUND(x,y))px(x,y,'#161b22');
        var Wh='#f0f6fc';
        for(y=2;y<15;y++)for(x=1;x<15;x++){var d3=Math.hypot(x-7.5,y-8.2);if(d3<6.3)px(x,y,Wh)}
        [[3,1],[4,1],[3,2],[4,2],[5,2],[3,3],[4,3],[5,3],[6,3],[11,1],[12,1],[10,2],[11,2],[12,2],[9,3],[10,3],[11,3],[12,3]].forEach(function(p){px(p[0],p[1],Wh)});
        [[3,11],[4,12],[4,13],[5,13],[7,14],[8,14],[9,13],[10,14],[7,13],[11,13]].forEach(function(p){px(p[0],p[1],'#161b22')});
        [[1,12],[1,13],[2,14],[13,13],[14,12]].forEach(function(p){px(p[0],p[1],'#161b22')});
        return;
      }
      if(name==='web'){
        for(y=0;y<16;y++)for(x=0;x<16;x++)if(!ROUND(x,y))px(x,y,'#0f3d7a');
        for(y=1;y<15;y++)for(x=1;x<15;x++){
          var dd=Math.hypot(x-7.5,y-7.5);if(dd>6.6)continue;
          px(x,y,dd>5.6?'#1f6fd0':dd>4.4?'#3b8ef0':'#58a6ff');
        }
        [[4,4],[5,4],[6,4],[3,5],[4,5],[5,5],[4,6],[5,6],[4,7],[9,3],[10,3],[11,4],[10,4],[9,5],[10,5],[11,5],[10,6],[9,8],[10,8],[11,8],[9,9],[10,9],[10,10],[11,10],[5,10],[6,10],[5,11],[6,11],[7,12]].forEach(function(p){px(p[0],p[1],'#3cc24a')});
        px(3,3,'#bfe0ff');px(4,3,'#bfe0ff');px(3,4,'#bfe0ff');
        return;
      }
      var art=ART[name];if(!art)return;
      art.rows.forEach(function(row,yy){for(var xx=0;xx<16;xx++){var ch=row[xx];if(ch==='.')continue;px(xx,yy,(ch==='W')?art.fg:art.bg)}});
    }
    Array.prototype.forEach.call(document.querySelectorAll('canvas[data-pix]'),function(cv){draw(cv,cv.getAttribute('data-pix'))});
  })();
  /* canyon waterfall: mossy gorge walls, a split fall, billowing mist, a turquoise pool with rocks, a great tree and life in the water */
  /* ===== Contact window: real-time 3D waterfall (three.js), rendered small and scaled up so it keeps the pixel look ===== */
  var scene3d=(function(){
    var T=window.THREE,obj={ok:null,start:start,stop:stop,still:still,init:init};
    var cv=null,rd=null,sc,cam,raf=0,run=false,t0=0,pw=0,ph=0,mx=0,my=0,tx=0,ty=0,A={},wrap=null;
    function cl(a,b,x){return x<a?a:x>b?b:x}
    function ss(a,b,x){var t=cl(0,1,(x-a)/(b-a));return t*t*(3-2*t)}
    function hs(i,j){var n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n)}
    function vn(x,y){var i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
      var a=hs(i,j),b=hs(i+1,j),c=hs(i,j+1),d=hs(i+1,j+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy}
    function fbm(x,y){return vn(x,y)*.55+vn(x*2.1,y*2.1)*.3+vn(x*4.3,y*4.3)*.15}
    /* the whole canyon is one height function, so the water, trees and rocks can all sit on it */
    function H(x,z){
      var r=Math.sqrt(Math.pow(x/11,2)+Math.pow((z+2)/8.5,2));
      var g=-.2-2.2*Math.max(0,1-r*r)+ss(.95,1.3,r)*(.7+.5*vn(x*.3,z*.3));
      g+=Math.max(0,r-1.35)*.9;
      var ax=Math.abs(x),lip=11+Math.max(0,-12-z)*.1;
      var cliff=15+4*fbm(x*.12+3,z*.12)+(vn(x*.6,z*.6)-.5)*1.4;
      var wall=lip+(cliff-lip)*ss(2.6,3.8,ax),wz=ss(-10.4,-11.8,z);
      var h=g+(wall-g)*wz,sw=ss(10,18,ax);
      h+=sw*(8+5*fbm(x*.1,z*.1+7));
      h+=(vn(x*.45,z*.45+9)-.5)*1.6*Math.max(wz*ss(2.6,3.8,ax),sw);
      if(h>1.2){var q=Math.round(h*1.6)/1.6;h+=(q-h)*.55}
      return h;
    }
    var GL=['float h21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y);}'].join('\n');
    function blobTex(sz,soft){var c=document.createElement('canvas');c.width=c.height=sz;var g=c.getContext('2d'),gr=g.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
      gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(soft,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,sz,sz);return new T.CanvasTexture(c)}
    function cloudTex(){var c=document.createElement('canvas');c.width=256;c.height=96;var g=c.getContext('2d');
      for(var i=0;i<14;i++){var x=30+hs(i,1)*196,y=54+hs(i,2)*16-Math.sin(i/14*3.14)*18,r=16+hs(i,3)*18,gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.6,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,96)}
      return new T.CanvasTexture(c)}
    function init(){
      if(obj.ok!==null)return obj.ok;
      try{
        if(!T)throw 0;
        var body=document.getElementById('dscene').parentNode;
        cv=document.createElement('canvas');cv.className='dscene';cv.id='d3';cv.setAttribute('aria-hidden','true');
        rd=new T.WebGLRenderer({canvas:cv,antialias:false,alpha:false,powerPreference:'high-performance'});
        wrap=body;
        rd.outputColorSpace=T.LinearSRGBColorSpace;rd.useLegacyLights=true;
        body.insertBefore(cv,document.getElementById('dscene'));
        build();setupPost();
        window.__s3=obj;
        document.getElementById('dscene').style.display='none';
        body.addEventListener('pointermove',function(e){var r=body.getBoundingClientRect();tx=(e.clientX-r.left)/r.width-.5;ty=(e.clientY-r.top)/r.height-.5});
        body.addEventListener('pointerleave',function(){tx=ty=0});
        obj.ok=true;
      }catch(e){
        if(cv&&cv.parentNode)cv.parentNode.removeChild(cv);
        obj.ok=false;
      }
      return obj.ok;
    }
    function build(){
      sc=new T.Scene();
      /* sky */
      var sk=document.createElement('canvas');sk.width=64;sk.height=256;var sg=sk.getContext('2d'),gr=sg.createLinearGradient(0,0,0,256);
      gr.addColorStop(0,'#5d98e4');gr.addColorStop(.55,'#a9d4f6');gr.addColorStop(1,'#e6f5fb');sg.fillStyle=gr;sg.fillRect(0,0,64,256);
      A.skyC=sk;A.skyT=new T.CanvasTexture(sk);sc.background=A.skyT;
      sc.fog=new T.Fog(0xcfeaf3,34,95);
      cam=new T.PerspectiveCamera(42,1.6,.5,220);
      var hemi=new T.HemisphereLight(0xcfe8ff,0x3c6a44,.95);sc.add(hemi);A.hemi=hemi;
      var sun=new T.DirectionalLight(0xfff0cf,1.25);sun.position.set(-14,22,12);sc.add(sun);A.sun=sun;
      /* far hazy ridges */
      [[-70,.55,0x9cc2d0,14,26],[-52,.4,0x7fb0a4,9,20]].forEach(function(o,k){
        var s=new T.Shape(),i;s.moveTo(-110,-10);
        for(i=0;i<=44;i++){var x=-110+i*5;s.lineTo(x,o[3]+fbm(x*.05+k*9,k)*o[4])}
        s.lineTo(110,-10);s.closePath();
        var m=new T.Mesh(new T.ShapeGeometry(s),new T.MeshBasicMaterial({color:o[2],fog:true}));m.position.set(0,0,o[0]);sc.add(m)});
      /* terrain: flat-shaded, coloured per face so it reads as chunky pixel-art rock and moss */
      var pg=new T.PlaneGeometry(80,56,160,112);pg.rotateX(-Math.PI/2);
      var P=pg.attributes.position,i;
      for(i=0;i<P.count;i++){var x=P.getX(i),z=P.getZ(i)-17;P.setZ(i,z);P.setY(i,H(x,z))}
      var tg=pg.toNonIndexed();tg.computeVertexNormals();
      var tp=tg.attributes.position,tn=tg.attributes.normal,col=new Float32Array(tp.count*3);
      for(i=0;i<tp.count;i+=3){
        var cx=(tp.getX(i)+tp.getX(i+1)+tp.getX(i+2))/3,cy=(tp.getY(i)+tp.getY(i+1)+tp.getY(i+2))/3,cz=(tp.getZ(i)+tp.getZ(i+1)+tp.getZ(i+2))/3,ny=tn.getY(i),n=vn(cx*.9,cz*.9),n2=vn(cx*.35+5,cz*.35),c;
        if(cy<.3)c=[.58+.1*n,.55+.08*n,.42+.06*n];
        else if(ny<.66){
          c=n2>.5?[.42+.08*n,.36+.07*n,.3+.05*n]:[.32+.07*n,.28+.06*n,.25+.05*n];
          if(cy>1.2&&cy<16&&vn(cx*.45,cz*.45+3)>.42)c=[.22+.06*n,.46+.08*n,.2+.03*n];
          if(Math.abs(cx)<3.3&&cz<-10&&cy<11)c=[.3,.33,.36];
        }else{
          c=cy>11?[.36+.1*n,.6+.06*n,.26]:[.25+.08*n,.52+.08*n,.2+.04*n];
          if(cy>.3&&cy<.9)c=[.46+.06*n,.56+.06*n,.3]
        }
        if(cz<-9&&cy<2.2){var d=.72+.28*ss(0,2.2,cy);c=[c[0]*d,c[1]*d,c[2]*d]}
        for(var k=0;k<3;k++){col[(i+k)*3]=c[0];col[(i+k)*3+1]=c[1];col[(i+k)*3+2]=c[2]}
      }
      tg.setAttribute('color',new T.BufferAttribute(col,3));
      sc.add(new T.Mesh(tg,new T.MeshLambertMaterial({vertexColors:true,flatShading:true})));
      /* the fall: a ribbon that hugs the cliff face, sampled from the same height function */
      var NX=26,NY=46,pos=[],uv=[],idx=[],yy,xx,lo,hi,zc,it;
      for(var r=0;r<=NY;r++){
        yy=11.15-(r/NY)*10.9;
        for(var c=0;c<=NX;c++){
          xx=-2.55+(c/NX)*5.1;lo=-16;hi=-8;
          for(it=0;it<22;it++){zc=(lo+hi)/2;if(H(xx,zc)>yy)lo=zc;else hi=zc}
          pos.push(xx,yy,zc+.3+.12*Math.sin(r*.4+c));uv.push(c/NX,r/NY);
        }
      }
      for(r=0;r<NY;r++)for(c=0;c<NX;c++){var a=r*(NX+1)+c;idx.push(a,a+1,a+NX+1,a+1,a+NX+2,a+NX+1)}
      var fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(pos,3));fg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));fg.setIndex(idx);
      A.U={uTime:{value:0},uDim:{value:new T.Vector3(1,1,1)},uSky:{value:new T.Vector3(.8,.93,1)}};
      var fall=new T.Mesh(fg,new T.ShaderMaterial({uniforms:A.U,transparent:true,depthWrite:false,side:T.DoubleSide,
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 vUv;uniform float uTime;uniform vec3 uDim;\n'+GL+'\nvoid main(){float x=vUv.x,y=vUv.y;float rag=vn(vec2(y*14.,x*6.+3.));float a=smoothstep(0.,.1+rag*.1,x)*smoothstep(1.,.9-rag*.1,x);float n1=vn(vec2(x*34.,y*3.-uTime*.8));float st=sin(x*70.+n1*5.)*.5+.5;float fl=fract(y*9.-uTime*1.7+vn(vec2(x*22.,0.))*2.);float br=clamp(st*.55+fl*.45,0.,1.);vec3 c=mix(vec3(.55,.8,.94),vec3(1.),smoothstep(.35,.85,br));c=mix(c,vec3(.74,.9,.98),.25*(1.-st));float f=max(smoothstep(.07,0.,y),smoothstep(.82,1.,y)*(.5+.5*vn(vec2(x*20.,uTime*6.))));c=mix(c,vec3(1.),f);gl_FragColor=vec4(c*uDim,a*.93);}'}));
      sc.add(fall);
      /* the river that feeds it, running in from the distance */
      var rg=new T.PlaneGeometry(5.1,24,12,30);rg.rotateX(-Math.PI/2);var RP=rg.attributes.position;
      for(i=0;i<RP.count;i++){var rx=RP.getX(i),rz=RP.getZ(i)-23.8;RP.setZ(i,rz);RP.setY(i,Math.max(H(rx,rz),11)+.1)}
      var river=new T.Mesh(rg,new T.ShaderMaterial({uniforms:A.U,transparent:true,depthWrite:false,
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 vUv;uniform float uTime;uniform vec3 uDim;\n'+GL+'\nvoid main(){float x=vUv.x,y=vUv.y;float s=vn(vec2(x*9.,y*26.+uTime*2.4))*.6+vn(vec2(x*18.+4.,y*40.+uTime*3.5))*.4;vec3 c=mix(vec3(.5,.82,.92),vec3(1.),smoothstep(.55,.95,s));float e=smoothstep(0.,.07,x)*smoothstep(1.,.93,x);gl_FragColor=vec4(c*uDim,e*.9);}'}));
      sc.add(river);
      /* the pool */
      var pool=new T.Mesh(new T.CircleGeometry(1,64).rotateX(-Math.PI/2),new T.ShaderMaterial({uniforms:A.U,transparent:true,depthWrite:false,
        vertexShader:'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader:'varying vec3 vW;uniform float uTime;uniform vec3 uDim;uniform vec3 uSky;\n'+GL+'\nvoid main(){vec2 p=vW.xz;vec2 q=(p-vec2(0.,-2.))/vec2(11.,8.5);float r=length(q);float depth=clamp(1.-r*r,0.,1.);vec3 col=mix(vec3(.42,.88,.86),vec3(.06,.4,.55),smoothstep(0.,.8,depth));float w1=sin(p.x*1.3+uTime*1.6+sin(p.y*.8+uTime))*.5+.5;float w2=sin(p.y*1.7-uTime*1.3+p.x*.4)*.5+.5;col+=w1*w2*.07;float sp=vn(p*3.+vec2(uTime*.7,-uTime*.5));col+=smoothstep(.82,.95,sp)*.5;vec3 V=normalize(cameraPosition-vW);float fr=pow(1.-clamp(V.y,0.,1.),3.);col=mix(col,uSky,fr*.55);float d=length((p-vec2(0.,-9.6))*vec2(.8,1.1));float ring=sin(d*3.2-uTime*3.)*.5+.5;float foam=smoothstep(5.2,.5,d)*(.45+.55*vn(p*2.2+vec2(0.,uTime*2.)))*(.55+.45*ring);col=mix(col,vec3(1.),clamp(foam,0.,1.)*.95);float sh=smoothstep(.86,1.,r)*(.5+.5*vn(p*2.5+uTime*.3));col=mix(col,vec3(.95,1.,1.),sh*.7);float al=(.74+foam*.24)*(1.-smoothstep(1.04,1.1,r));gl_FragColor=vec4(col*uDim,al);}'}));
      pool.scale.set(11*1.12,1,8.5*1.12);pool.position.set(0,0,-2);sc.add(pool);
      /* trees on every bank, instanced */
      var trees=[],tries=0,ok;
      function tryPlace(x,z,s,kind){var h=H(x,z);trees.push({x:x,y:h,z:z,s:s,k:kind,ph:hs(x,z)*6})}
      while(trees.length<170&&tries<9000){
        tries++;var x=(hs(tries,3)-.5)*64,z=-34+hs(tries,7)*42,h=H(x,z),r=Math.sqrt(Math.pow(x/11,2)+Math.pow((z+2)/8.5,2));
        ok=h>.4&&r>1.4&&!(Math.abs(x)<3.7&&z<-9.5)&&!(Math.abs(x)<8&&z>-9.5&&z<9)&&z<8&&Math.abs(H(x+1.2,z)-h)<2.4&&Math.abs(H(x,z+1.2)-h)<2.4;
        if(ok)tryPlace(x,z,.8+hs(tries,11)*.9,hs(tries,13)>.45?0:1);
      }
      tryPlace(13.5,1.5,2.5,0);tryPlace(-13,2.5,2,0);
      var nR=trees.filter(function(t){return t.k===0}).length,nP=trees.length-nR;
      var trunk=new T.InstancedMesh(new T.CylinderGeometry(.16,.24,2,6),new T.MeshLambertMaterial({color:0x5a3e2a,flatShading:true}),trees.length);
      var round=new T.InstancedMesh(new T.IcosahedronGeometry(1.35,0),new T.MeshLambertMaterial({flatShading:true}),nR);
      var pine1=new T.InstancedMesh(new T.ConeGeometry(1.25,3,7),new T.MeshLambertMaterial({flatShading:true}),nP);
      var pine2=new T.InstancedMesh(new T.ConeGeometry(.9,2.4,7),new T.MeshLambertMaterial({flatShading:true}),nP);
      var D=new T.Object3D(),col2=new T.Color(),ri=0,pi=0;
      A.trees=trees;A.round=round;A.D=D;
      trees.forEach(function(t,k){
        D.position.set(t.x,t.y+t.s,t.z);D.scale.set(t.s,t.s,t.s);D.rotation.set(0,0,0);D.updateMatrix();trunk.setMatrixAt(k,D.matrix);
        if(t.k===0){col2.setHSL(.26+hs(k,5)*.08,.5,.3+hs(k,6)*.1);round.setColorAt(ri,col2);t.ri=ri++}
        else{col2.setHSL(.36+hs(k,5)*.05,.5,.2+hs(k,6)*.07);pine1.setColorAt(pi,col2);pine2.setColorAt(pi,col2);
          D.position.set(t.x,t.y+t.s*2.9,t.z);D.updateMatrix();pine1.setMatrixAt(pi,D.matrix);
          D.position.set(t.x,t.y+t.s*4.6,t.z);D.updateMatrix();pine2.setMatrixAt(pi,D.matrix);pi++}
      });
      sc.add(trunk,round,pine1,pine2);
      /* boulders round the shore and stepping stones in the water */
      var rocks=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshLambertMaterial({flatShading:true}),44);
      for(i=0;i<44;i++){
        var an=hs(i,21)*6.283,rf=i<36?1.02+hs(i,22)*.3:.2+hs(i,22)*.55,rx2=11*rf*Math.cos(an),rz2=-2+8.5*rf*Math.sin(an),s=(i<36?.45:.55)+hs(i,23)*.95;
        if(i<36&&rz2<-8.2)rz2=-8.2+hs(i,24)*2;
        D.position.set(rx2,Math.max(H(rx2,rz2),i<36?-.3:-.25)+s*.1,rz2);D.scale.set(s,s*.65,s*.9);D.rotation.set(0,hs(i,25)*6,0);D.updateMatrix();rocks.setMatrixAt(i,D.matrix);
        col2.setRGB(...(hs(i,26)>.65?[.3,.46,.26]:[.46+hs(i,27)*.1,.43+hs(i,27)*.08,.4]));rocks.setColorAt(i,col2);
      }
      D.rotation.set(0,0,0);sc.add(rocks);
      /* lily pads, a lotus and a frog */
      A.pads=[];[[3.2,.4,0],[-4.6,2.4,1],[1,3.6,0]].forEach(function(p,k){
        var g=new T.Group(),pad=new T.Mesh(new T.CylinderGeometry(.85,.85,.06,12),new T.MeshLambertMaterial({color:0x44b050,flatShading:true}));g.add(pad);
        if(p[2]===0){var lo2=new T.Mesh(new T.ConeGeometry(.22,.4,6),new T.MeshLambertMaterial({color:0xff9cc4,flatShading:true}));lo2.position.y=.22;g.add(lo2)}
        else{var fr=new T.Mesh(new T.BoxGeometry(.36,.22,.3),new T.MeshLambertMaterial({color:0x6cd040,flatShading:true}));fr.position.set(.1,.14,0);g.add(fr);A.frog=fr}
        g.position.set(p[0],.05,p[1]);sc.add(g);A.pads.push(g)});
      /* koi swimming under the surface */
      A.fish=[];[[0xff7a2a,4,3],[0xf4f0e6,6,4],[0xff9a3a,3,2.5],[0x2a2a30,7,3.5],[0xf4f0e6,5,2.2],[0xff7a2a,2.5,4]].forEach(function(f,k){
        var g=new T.Group(),b=new T.Mesh(new T.BoxGeometry(.9,.24,.34),new T.MeshLambertMaterial({color:f[0],flatShading:true})),tl=new T.Group(),tb=new T.Mesh(new T.BoxGeometry(.4,.2,.06),new T.MeshLambertMaterial({color:f[0],flatShading:true}));
        tl.position.x=-.5;tb.position.x=-.18;tl.add(tb);g.add(b,tl);sc.add(g);A.fish.push({g:g,tl:tl,rx:f[1],rz:f[2],cx:(k%2?3:-3),cz:-1+hs(k,31)*2,sp:.22+hs(k,32)*.22,ph:hs(k,33)*6.3,y:-.55-hs(k,34)*.9})});
      /* gulls wheeling above the fall */
      A.gulls=[];for(i=0;i<4;i++){var gg=new T.Group(),gb=new T.Mesh(new T.BoxGeometry(.55,.16,.18),new T.MeshBasicMaterial({color:0xffffff})),w1=new T.Mesh(new T.BoxGeometry(.14,.03,.8),new T.MeshBasicMaterial({color:0xf2f6fa})),w2=w1.clone();
        w1.position.z=.45;w2.position.z=-.45;gg.add(gb,w1,w2);sc.add(gg);A.gulls.push({g:gg,w1:w1,w2:w2,cx:(hs(i,41)-.5)*6,cy:13+i*1.4,cz:-6-i*1.5,rx:8+i*2.2,rz:4+i,sp:.28+i*.05,ph:i*1.7})}
      /* mist, spray, dust and soft light shafts */
      var bt=blobTex(64,.35);A.mist=[];
      for(i=0;i<46;i++){var sp=new T.Sprite(new T.SpriteMaterial({map:bt,color:0xf2f9ff,transparent:true,depthWrite:false,fog:false,opacity:0}));sp.userData={l:hs(i,51)*5,m:3.5+hs(i,52)*2.5,x:0,z:0};sc.add(sp);A.mist.push(sp)}
      var NS=320,sp2=new Float32Array(NS*3),sv=new Float32Array(NS*3);A.sp=sp2;A.sv=sv;A.NS=NS;
      for(i=0;i<NS;i++)sp2[i*3+1]=-9;
      var sgm=new T.BufferGeometry();sgm.setAttribute('position',new T.BufferAttribute(sp2,3));A.spg=sgm;
      sc.add(new T.Points(sgm,new T.PointsMaterial({color:0xffffff,size:.2,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false})));
      var ND=90,dp=new Float32Array(ND*3);for(i=0;i<ND;i++){dp[i*3]=(hs(i,61)-.5)*24;dp[i*3+1]=1+hs(i,62)*8;dp[i*3+2]=-9+hs(i,63)*14}
      A.dp=dp;A.dg=new T.BufferGeometry();A.dg.setAttribute('position',new T.BufferAttribute(dp,3));A.ND=ND;
      sc.add(new T.Points(A.dg,new T.PointsMaterial({color:0xffe9a8,size:.09,sizeAttenuation:true,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending})));
      var rc=document.createElement('canvas');rc.width=16;rc.height=128;var rg2=rc.getContext('2d'),rgr=rg2.createLinearGradient(0,0,0,128);
      rgr.addColorStop(0,'rgba(255,240,200,0)');rgr.addColorStop(.35,'rgba(255,240,200,.9)');rgr.addColorStop(1,'rgba(255,240,200,0)');rg2.fillStyle=rgr;rg2.fillRect(0,0,16,128);
      var rt=new T.CanvasTexture(rc);A.rays=[];
      [[-11,9,-4,2.4],[-7,8,-2,1.6],[-14,10,-7,3]].forEach(function(r,k){
        var m=new T.Mesh(new T.PlaneGeometry(r[3],34),new T.MeshBasicMaterial({map:rt,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.1,fog:false}));
        m.position.set(r[0],r[1],r[2]);m.rotation.z=-.5;sc.add(m);A.rays.push(m)});
      /* clouds */
      var ct=cloudTex();A.clouds=[];
      for(i=0;i<6;i++){var c=new T.Sprite(new T.SpriteMaterial({map:ct,transparent:true,opacity:.92,fog:false,depthWrite:false}));c.scale.set(22+hs(i,71)*14,8+hs(i,72)*4,1);c.position.set((hs(i,73)-.5)*110,26+hs(i,74)*10,-85);c.userData.v=.5+hs(i,75)*.6;sc.add(c);A.clouds.push(c)}
      life();
    }
    /* ---- time of day: a slow dawn > day > golden hour > night cycle ---- */
    var KEYS=[
      [0,[.36,.4,.7],[.95,.6,.6],[1,.82,.6],[.92,.7,.7],[.85,.75,.9],[.3,.3,.35],.7,[1,.7,.5],.8,.25,[1.06,.97,.96]],
      [.2,[.36,.6,.9],[.66,.83,.96],[.9,.96,.98],[.81,.92,.95],[.81,.91,1],[.24,.42,.28],.95,[1,.94,.81],1.2,0,[1,1,1]],
      [.45,[.3,.58,.92],[.62,.83,.97],[.9,.97,1],[.82,.94,.96],[.81,.91,1],[.24,.42,.28],1,[1,.97,.9],1.3,0,[1,1.01,1.02]],
      [.65,[.3,.3,.6],[.95,.55,.4],[1,.78,.5],[.95,.7,.55],[1,.8,.7],[.35,.3,.25],.8,[1,.62,.32],1.1,.15,[1.1,.96,.88]],
      [.8,[.03,.05,.16],[.08,.12,.3],[.2,.25,.45],[.12,.16,.3],[.3,.4,.7],[.12,.15,.24],.85,[.5,.6,1],.5,1,[.8,.92,1.15]],
      [.93,[.03,.05,.16],[.08,.12,.3],[.2,.25,.45],[.12,.16,.3],[.3,.4,.7],[.12,.15,.24],.85,[.5,.6,1],.5,1,[.8,.92,1.15]],
      [1,[.36,.4,.7],[.95,.6,.6],[1,.82,.6],[.92,.7,.7],[.85,.75,.9],[.3,.3,.35],.7,[1,.7,.5],.8,.25,[1.06,.97,.96]]];
    function lerpA(a,b,t){if(typeof a==='number')return a+(b-a)*t;return a.map(function(v,i){return v+(b[i]-v)*t})}
    function sample(p){
      var k=0;while(k<KEYS.length-2&&p>=KEYS[k+1][0])k++;
      var A0=KEYS[k],B0=KEYS[k+1],t=(p-A0[0])/(B0[0]-A0[0]);t=t*t*(3-2*t);var o=[];
      for(var i=1;i<A0.length;i++)o.push(lerpA(A0[i],B0[i],t));
      return{top:o[0],mid:o[1],bot:o[2],fog:o[3],hs:o[4],hg:o[5],hi:o[6],sc:o[7],si:o[8],night:o[9],gr:o[10]};
    }
    function rgbs(c,m){m=m||1;return'rgb('+Math.round(cl(0,1,c[0]*m)*255)+','+Math.round(cl(0,1,c[1]*m)*255)+','+Math.round(cl(0,1,c[2]*m)*255)+')'}
    var skyAcc=9;
    function paintSky(S,dt){
      skyAcc+=dt;if(skyAcc<.2)return;skyAcc=0;
      var c=A.skyC,g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);
      gr.addColorStop(0,rgbs(S.top));gr.addColorStop(.55,rgbs(S.mid));gr.addColorStop(1,rgbs(S.bot));g.fillStyle=gr;g.fillRect(0,0,64,256);
      if(S.night>.05)for(var i=0;i<70;i++){var tw=.4+.6*Math.max(0,Math.sin(A.tt*(1+hs(i,3,1)*2)+hs(i,4,1)*6));g.globalAlpha=S.night*tw*(.4+.6*hs(i,5,1));g.fillStyle='#fff6d8';g.fillRect(Math.floor(hs(i,1,1)*64),Math.floor(hs(i,2,1)*150),1,1)}
      g.globalAlpha=1;A.skyT.needsUpdate=true;
    }
    function life(){
      var D=A.D,i,col2=new T.Color();
      /* flowers and grass tufts */
      var fl=new T.InstancedMesh(new T.IcosahedronGeometry(.14,0),new T.MeshLambertMaterial({flatShading:true}),140),n=0,tries=0;
      var pal=[0xff7aa8,0xffd84a,0xffffff,0xb48cff,0xff9a5a];
      while(n<140&&tries<2000){tries++;var an=hs(tries,81)*6.283,rf=1.06+hs(tries,82)*.55,x=11*rf*Math.cos(an),z=-2+8.5*rf*Math.sin(an),h=H(x,z);
        if(z<-8.3||h<.3||h>2.2||Math.abs(x)>15)continue;
        D.position.set(x,h+.22,z);D.scale.set(1,1,1);D.rotation.set(0,0,0);D.updateMatrix();fl.setMatrixAt(n,D.matrix);col2.setHex(pal[Math.floor(hs(tries,83)*5)]);fl.setColorAt(n,col2);n++}
      fl.count=n;sc.add(fl);
      var gt=new T.InstancedMesh(new T.ConeGeometry(.1,.62,3),new T.MeshLambertMaterial({flatShading:true}),460);n=0;tries=0;
      while(n<460&&tries<6000){tries++;var x2=(hs(tries,84)-.5)*30,z2=-9+hs(tries,85)*17,h2=H(x2,z2),r2=Math.sqrt(Math.pow(x2/11,2)+Math.pow((z2+2)/8.5,2));
        if(h2<.3||h2>2.4||r2<1.08)continue;
        D.position.set(x2,h2+.28,z2);D.scale.set(1,.7+hs(tries,86)*.9,1);D.rotation.set((hs(tries,87)-.5)*.3,0,(hs(tries,88)-.5)*.3);D.updateMatrix();gt.setMatrixAt(n,D.matrix);
        col2.setHSL(.27+hs(tries,89)*.08,.55,.28+hs(tries,90)*.16);gt.setColorAt(n,col2);n++}
      gt.count=n;sc.add(gt);D.rotation.set(0,0,0);D.scale.set(1,1,1);
      /* butterflies */
      A.bf=[];[0xffb347,0xff7aa8,0xffffff,0x8ec8ff,0xffe14a,0xd08cff,0xff9a5a,0xffffff,0x9be870].forEach(function(c,k){
        var g=new T.Group(),m=new T.MeshBasicMaterial({color:c,side:T.DoubleSide}),pg=new T.PlaneGeometry(.34,.26).rotateX(-Math.PI/2);
        var lw=new T.Group(),rw=new T.Group(),a=new T.Mesh(pg,m),b=new T.Mesh(pg,m);a.position.z=.15;b.position.z=-.15;lw.add(a);rw.add(b);
        var bd=new T.Mesh(new T.BoxGeometry(.2,.05,.05),new T.MeshBasicMaterial({color:0x2a1e18}));g.add(lw,rw,bd);sc.add(g);
        var cx=(k%2?1:-1)*(5+hs(k,91)*7),cz=-3+hs(k,92)*9;A.bf.push({g:g,lw:lw,rw:rw,cx:cx,cz:cz,by:Math.max(H(cx,cz),.3)+.9,rx:1.5+hs(k,93)*2.5,rz:1+hs(k,94)*2,sp:.3+hs(k,95)*.35,ph:hs(k,96)*6.3})});
      /* fireflies, two flocks that blink out of step */
      var fz=[];for(i=0;i<2;i++){var pa=new Float32Array(45*3);for(var q=0;q<45;q++){pa[q*3]=(hs(q,97+i)-.5)*30;pa[q*3+1]=.4+hs(q,98+i)*3.6;pa[q*3+2]=-9+hs(q,99+i)*15}
        var gm=new T.BufferGeometry();gm.setAttribute('position',new T.BufferAttribute(pa,3));var pt=new T.Points(gm,new T.PointsMaterial({color:0xe6ff8a,size:.3,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));
        sc.add(pt);fz.push({pt:pt,pa:pa,gm:gm,ph:i*1.9})}A.ff=fz;
      /* ducks */
      A.ducks=[];for(i=0;i<3;i++){
        var g2=new T.Group(),wm=new T.MeshLambertMaterial({color:i===1?0x8a6a48:0xf4f0e0,flatShading:true}),bo=new T.Mesh(new T.IcosahedronGeometry(.42,0),wm);bo.scale.set(1.4,.75,.85);
        var hd=new T.Mesh(new T.IcosahedronGeometry(.22,0),new T.MeshLambertMaterial({color:i===1?0x2f8a4a:0xf4f0e0,flatShading:true}));hd.position.set(.55,.42,0);
        var bk=new T.Mesh(new T.BoxGeometry(.22,.07,.13),new T.MeshLambertMaterial({color:0xff9a2a,flatShading:true}));bk.position.set(.8,.38,0);
        g2.add(bo,hd,bk);g2.position.y=.06;sc.add(g2);A.ducks.push({g:g2,cx:-1+i*2.2,cz:-3+i*1.6,rx:3.5+i*.9,rz:2.2+i*.5,sp:.12+i*.04,ph:i*2.1})}
      /* a deer drinking at the left bank */
      var dg=new T.Group(),dm=new T.MeshLambertMaterial({color:0xb98a52,flatShading:true}),dl=new T.MeshLambertMaterial({color:0x8a6234,flatShading:true});
      var bd2=new T.Mesh(new T.BoxGeometry(1.3,.55,.5),dm);bd2.position.y=1.05;dg.add(bd2);
      [[.45,.17],[.45,-.17],[-.45,.17],[-.45,-.17]].forEach(function(p){var l=new T.Mesh(new T.BoxGeometry(.12,.8,.12),dl);l.position.set(p[0],.45,p[1]);dg.add(l)});
      var neck=new T.Group();neck.position.set(.62,1.2,0);var nk=new T.Mesh(new T.BoxGeometry(.2,.62,.2),dm);nk.position.set(.1,.3,0);nk.rotation.z=-.3;neck.add(nk);
      var hdd=new T.Mesh(new T.BoxGeometry(.4,.22,.2),dm);hdd.position.set(.32,.62,0);neck.add(hdd);
      [-.07,.07].forEach(function(z){var e=new T.Mesh(new T.BoxGeometry(.06,.16,.04),dl);e.position.set(.2,.78,z*1.7);neck.add(e);var an2=new T.Mesh(new T.BoxGeometry(.04,.4,.04),new T.MeshLambertMaterial({color:0x5a4030}));an2.position.set(.22,.95,z*1.4);an2.rotation.z=.3;neck.add(an2)});
      dg.add(neck);var tl=new T.Mesh(new T.BoxGeometry(.14,.2,.1),new T.MeshLambertMaterial({color:0xffffff}));tl.position.set(-.68,1.15,0);dg.add(tl);A.deerTail=tl;
      dg.position.set(-11.2,Math.max(H(-11.2,1.8),.15),1.8);dg.rotation.y=.12;sc.add(dg);A.deer=dg;A.neck=neck;
      /* a fish that leaps now and then */
      var jf=new T.Group(),jb=new T.Mesh(new T.BoxGeometry(.7,.2,.26),new T.MeshLambertMaterial({color:0xff8a30,flatShading:true})),jt=new T.Mesh(new T.BoxGeometry(.25,.18,.05),new T.MeshLambertMaterial({color:0xff8a30,flatShading:true}));jt.position.x=-.45;jf.add(jb,jt);jf.visible=false;sc.add(jf);
      var rg=new T.Mesh(new T.RingGeometry(.8,1,28).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));rg.position.y=.08;sc.add(rg);
      A.jf={g:jf,ring:rg,wait:4,u:-1,x:0,z:0,rl:9};
      /* lanterns that glow after dark */
      var lt=blobTex(64,.2);A.lan=[];[[-8.6,3.6],[9.4,2.4],[-5.8,-7.6],[7.2,-7.4]].forEach(function(p,k){
        var y=Math.max(H(p[0],p[1]),.3),g=new T.Group();
        var po=new T.Mesh(new T.CylinderGeometry(.05,.07,1.7,5),new T.MeshLambertMaterial({color:0x3a2a1e,flatShading:true}));po.position.y=.85;
        var lp=new T.Mesh(new T.BoxGeometry(.26,.3,.26),new T.MeshBasicMaterial({color:0xffd27a}));lp.position.y=1.85;
        var gl=new T.Sprite(new T.SpriteMaterial({map:lt,color:0xffb050,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,opacity:0}));gl.position.y=1.85;gl.scale.set(3.2,3.2,1);
        g.add(po,lp,gl);g.position.set(p[0],y,p[1]);sc.add(g);A.lan.push({gl:gl,lp:lp,ph:k*1.7})});
      /* a rainbow hanging in the mist */
      A.rbU={uAlpha:{value:0}};
      var rb=new T.Mesh(new T.RingGeometry(7,8.6,72,1,0,Math.PI),new T.ShaderMaterial({uniforms:A.rbU,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
        vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'varying vec2 vP;uniform float uAlpha;vec3 hsv(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}void main(){float t=(length(vP)-7.)/1.6;vec3 c=hsv((1.-t)*.78);gl_FragColor=vec4(c,sin(t*3.14159)*uAlpha);}'}));
      rb.position.set(0,.2,-9);sc.add(rb);
      /* leaves tumbling down, and low ground fog */
      var LN=34,lp2=new Float32Array(LN*3),lc=new Float32Array(LN*3);
      for(i=0;i<LN;i++){lp2[i*3]=(hs(i,101)-.5)*28;lp2[i*3+1]=2+hs(i,102)*12;lp2[i*3+2]=-9+hs(i,103)*13;var cc=hs(i,104)>.5?[.9,.55,.2]:[.5,.8,.3];lc[i*3]=cc[0];lc[i*3+1]=cc[1];lc[i*3+2]=cc[2]}
      A.lv=lp2;A.lvN=LN;A.lvg=new T.BufferGeometry();A.lvg.setAttribute('position',new T.BufferAttribute(lp2,3));A.lvg.setAttribute('color',new T.BufferAttribute(lc,3));
      sc.add(new T.Points(A.lvg,new T.PointsMaterial({size:.24,vertexColors:true,sizeAttenuation:true,transparent:true,depthWrite:false})));
      var bt=blobTex(64,.4);A.gf=[];for(i=0;i<12;i++){var s=new T.Sprite(new T.SpriteMaterial({map:bt,color:0xdff0f8,transparent:true,depthWrite:false,fog:false,opacity:.1}));s.scale.set(12,2.6,1);s.position.set((hs(i,105)-.5)*28,.5+hs(i,106)*.9,-8+hs(i,107)*12);s.userData.v=.25+hs(i,108)*.4;sc.add(s);A.gf.push(s)}
      /* the sun and moon, seen through the gap above the fall */
      A.sunS=new T.Sprite(new T.SpriteMaterial({map:blobTex(64,.5),color:0xfff0b8,transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending}));A.sunS.scale.set(12,12,1);sc.add(A.sunS);
      A.moonS=new T.Sprite(new T.SpriteMaterial({map:blobTex(64,.7),color:0xcfe0ff,transparent:true,depthWrite:false,fog:false}));A.moonS.scale.set(7,7,1);sc.add(A.moonS);
    }
    /* pixel-art post pass: low-res render, limited palette, ordered dither */
    function setupPost(){
      A.rt=new T.WebGLRenderTarget(8,8,{minFilter:T.NearestFilter,magFilter:T.NearestFilter,depthBuffer:true});
      A.pU={tDiffuse:{value:A.rt.texture},uRes:{value:new T.Vector2(8,8)},uGrade:{value:new T.Vector3(1,1,1)},uVig:{value:.3}};
      A.qs=new T.Scene();A.qc=new T.OrthographicCamera(-1,1,1,-1,0,1);
      A.qs.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:A.pU,depthTest:false,depthWrite:false,
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
        fragmentShader:'varying vec2 vUv;uniform sampler2D tDiffuse;uniform vec2 uRes;uniform vec3 uGrade;uniform float uVig;float b2(vec2 a){a=floor(a);return fract(a.x*.5+a.y*a.y*.75);}float b4(vec2 a){return b2(.5*a)*.25+b2(a);}void main(){vec3 c=texture2D(tDiffuse,vUv).rgb*uGrade;float L=9.;float d=b4(gl_FragCoord.xy)-.47;c=floor(c*L+.5+d*.9)/L;vec2 q=vUv-.5;c*=1.-uVig*dot(q,q)*2.4;gl_FragColor=vec4(c,1.);}'})));
    }
    function resize(){
      var par=cv.parentNode,w=Math.max(80,Math.floor(par.clientWidth/3)),h=Math.max(50,Math.floor(par.clientHeight/3));
      if(w!==pw||h!==ph){pw=w;ph=h;rd.setSize(w,h,false);A.rt.setSize(w,h);A.pU.uRes.value.set(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()}
    }
    function frame(t,dt){
      var i,k;A.U.uTime.value=t;A.tt=t;
      var p=typeof obj.phase==='number'?obj.phase:(((t-2)/90+.2)%1),S=sample(p),day=1-S.night;
      paintSky(S,dt);sc.fog.color.setRGB(S.fog[0],S.fog[1],S.fog[2]);
      A.hemi.color.setRGB(S.hs[0],S.hs[1],S.hs[2]);A.hemi.groundColor.setRGB(S.hg[0],S.hg[1],S.hg[2]);A.hemi.intensity=S.hi;
      A.sun.color.setRGB(S.sc[0],S.sc[1],S.sc[2]);A.sun.intensity=S.si;var sp0=cl(0,1,p/.75);A.sun.position.set(S.night>.6?-10:-22+44*sp0,S.night>.6?20:6+22*Math.sin(Math.PI*sp0),12);
      A.U.uDim.value.set(.62+.38*day+(S.night*.0),.7+.3*day,.9+.1*day);A.U.uSky.value.set(S.bot[0],S.bot[1],S.bot[2]);
      A.pU.uGrade.value.set(S.gr[0],S.gr[1],S.gr[2]);A.pU.uVig.value=.25+.35*S.night;
      A.sunS.position.set(-16+32*sp0,16+12*Math.sin(Math.PI*sp0),-84);A.sunS.material.opacity=day>.1?Math.min(1,day*1.3)*.9:0;A.sunS.material.color.setRGB(1,.9-.3*Math.max(0,.6-Math.sin(Math.PI*sp0))*1.2,.65);
      A.moonS.position.set(8,26,-84);A.moonS.material.opacity=S.night;
      A.rbU.uAlpha.value=day*(.16+.06*Math.sin(t*.7))*(p<.5?1:.5);
      mx+=(tx-mx)*Math.min(1,dt*3);my+=(ty-my)*Math.min(1,dt*3);
      var a=Math.sin(t*.12)*.16+mx*-.22;
      cam.position.set(Math.sin(a)*24,5.6+Math.sin(t*.2)*.2-my*1.2,-8+Math.cos(a)*24);cam.lookAt(0,5.2+my*-.6,-8);
      /* trees sway */
      for(i=0;i<A.trees.length;i++){var tr=A.trees[i];if(tr.k===0){var D=A.D;D.position.set(tr.x,tr.y+tr.s*2.6,tr.z);D.scale.set(tr.s*(1+.04*Math.sin(t*1.7+tr.ph)),tr.s*.9,tr.s);D.rotation.set(0,0,Math.sin(t*1.1+tr.ph)*.05+Math.sin(t*.4)*.03);D.updateMatrix();A.round.setMatrixAt(tr.ri,D.matrix)}}
      A.round.instanceMatrix.needsUpdate=true;
      /* mist rising off the plunge */
      for(i=0;i<A.mist.length;i++){var s=A.mist[i],u=s.userData;u.l+=dt;if(u.l>u.m){u.l=0;u.x=(Math.random()-.5)*8;u.z=-10.2+Math.random()*2.6;u.m=3.5+Math.random()*2.5}
        var q=u.l/u.m;s.position.set(u.x+q*(u.x>0?1.5:-1.5),.5+q*5,u.z);var sz=3+q*5;s.scale.set(sz,sz,1);s.material.opacity=.3*Math.sin(Math.PI*q)}
      /* spray thrown up where the fall lands */
      var sp=A.sp,sv=A.sv;
      for(i=0;i<A.NS;i++){
        if(sp[i*3+1]<.05){if(Math.random()<dt*70){sp[i*3]=(Math.random()-.5)*5.4;sp[i*3+1]=.3;sp[i*3+2]=-10+Math.random()*1.2;sv[i*3]=(Math.random()-.5)*2.4;sv[i*3+1]=3+Math.random()*5;sv[i*3+2]=1+Math.random()*2.4}else sp[i*3+1]=-9;continue}
        sv[i*3+1]-=9.5*dt;sp[i*3]+=sv[i*3]*dt;sp[i*3+1]+=sv[i*3+1]*dt;sp[i*3+2]+=sv[i*3+2]*dt;
        if(sp[i*3+1]<.05&&sv[i*3+1]<0)sp[i*3+1]=-9;
      }
      A.spg.attributes.position.needsUpdate=true;
      /* dust motes drift in the light */
      for(i=0;i<A.ND;i++){A.dp[i*3]+=Math.sin(t*.5+i)*dt*.3;A.dp[i*3+1]+=Math.sin(t*.7+i*1.3)*dt*.25;A.dp[i*3+2]+=Math.cos(t*.4+i)*dt*.2}
      A.dg.attributes.position.needsUpdate=true;
      A.rays.forEach(function(r,k){r.material.opacity=(.07+.05*Math.sin(t*.5+k*1.8))*day});
      A.clouds.forEach(function(c){var m=1-.65*S.night;c.material.color.setRGB(Math.min(1,(.8+S.bot[0]*.3)*m),Math.min(1,(.85+S.bot[1]*.25)*m),Math.min(1,(.9+S.bot[2]*.2)*(1-.3*S.night)))});
      /* life */
      A.bf.forEach(function(b,k){var an=t*b.sp+b.ph,x=b.cx+Math.cos(an)*b.rx,z=b.cz+Math.sin(an*1.3)*b.rz,fl=Math.sin(t*14+k*2)*.9;b.g.position.set(x,b.by+Math.sin(t*2+k)*.35,z);b.g.rotation.y=-Math.atan2(Math.cos(an*1.3)*1.3*b.rz,-Math.sin(an)*b.rx);b.lw.rotation.x=fl;b.rw.rotation.x=-fl;b.g.scale.setScalar(day>.15?1:0)});
      A.ff.forEach(function(f,fi){var pa=f.pa;for(var q=0;q<45;q++){pa[q*3]+=Math.sin(t*.6+q*1.7+fi)*dt*.7;pa[q*3+1]+=Math.sin(t*.9+q*2.3)*dt*.45;pa[q*3+2]+=Math.cos(t*.5+q*1.1)*dt*.6}f.gm.attributes.position.needsUpdate=true;f.pt.material.opacity=(S.night*.95+.1*(1-S.night)*(S.sc[0]>.9&&p>.5?1:0))*(.45+.55*Math.max(0,Math.sin(t*1.8+f.ph*2)))});
      A.ducks.forEach(function(d,k){var an=t*d.sp+d.ph,x=d.cx+Math.cos(an)*d.rx,z=d.cz+Math.sin(an)*d.rz;d.g.position.set(x,.06+Math.sin(t*1.6+k)*.03,z);d.g.rotation.y=-Math.atan2(Math.cos(an)*d.rz,-Math.sin(an)*d.rx);d.g.rotation.z=Math.sin(t*1.3+k)*.04});
      var dc=(t%9)/9,dip=dc>.25&&dc<.7?Math.sin((dc-.25)/.45*Math.PI):0;A.neck.rotation.z=-1.05*dip+Math.sin(t*.6)*.04;A.deerTail.rotation.z=Math.sin(t*5)*.3*(Math.sin(t*.4)>.6?1:.2);
      var J=A.jf;J.wait-=dt;if(J.u<0&&J.wait<=0){J.u=0;J.x=(Math.random()-.5)*8;J.z=-6+Math.random()*7;J.g.visible=true;J.rl=0}
      if(J.u>=0){J.u+=dt/.95;var u=J.u;if(u>=1){J.u=-1;J.g.visible=false;J.wait=5+Math.random()*6;J.rl=0}else{J.g.position.set(J.x+u*2.2,.05+2.6*Math.sin(Math.PI*u),J.z);J.g.rotation.z=Math.cos(Math.PI*u)*.9;J.g.rotation.y=0}}
      if(J.rl<1.4){J.rl+=dt;J.ring.position.set(J.u<0?J.x+2.2:J.x,.08,J.z);var rr=.2+J.rl*1.9;J.ring.scale.set(rr,1,rr);J.ring.material.opacity=Math.max(0,.8*(1-J.rl/1.4))}else J.ring.material.opacity=0;
      A.lan.forEach(function(l){var f=.82+.18*Math.sin(t*7+l.ph)*Math.sin(t*2.3+l.ph);l.gl.material.opacity=S.night*.9*f;l.lp.material.color.setRGB(1,.82-.1*S.night,.48+.2*day)});
      for(i=0;i<A.lvN;i++){A.lv[i*3]+=Math.sin(t*1.2+i)*dt*.9+dt*.5;A.lv[i*3+1]-=dt*(.5+.3*hs(i,7));A.lv[i*3+2]+=Math.cos(t*.9+i)*dt*.4;if(A.lv[i*3+1]<.2){A.lv[i*3]=(Math.random()-.5)*28;A.lv[i*3+1]=12+Math.random()*3;A.lv[i*3+2]=-9+Math.random()*13}}A.lvg.attributes.position.needsUpdate=true;
      A.gf.forEach(function(g){g.position.x+=g.userData.v*dt;if(g.position.x>16)g.position.x=-16;g.material.opacity=.08+.1*S.night+.05*(1-day)})
      A.clouds.forEach(function(c){c.position.x+=c.userData.v*dt;if(c.position.x>75)c.position.x=-75});
      A.pads.forEach(function(p,k){p.position.y=.05+Math.sin(t*1.1+k*2)*.02;p.rotation.y=Math.sin(t*.3+k)*.2});
      if(A.frog)A.frog.position.y=.14+(((t*.7)%4)<.25?.2*Math.sin(((t*.7)%4)/.25*Math.PI):0);
      A.fish.forEach(function(f,k){var an=t*f.sp+f.ph,x=f.cx+Math.cos(an)*f.rx,z=f.cz-2+Math.sin(an)*f.rz,dx=-Math.sin(an)*f.rx,dz=Math.cos(an)*f.rz;
        f.g.position.set(x,f.y+Math.sin(t*1.3+k)*.12,z);f.g.rotation.y=-Math.atan2(dz,dx);f.tl.rotation.y=Math.sin(t*8+k)*.5});
      A.gulls.forEach(function(b,k){var an=t*b.sp+b.ph,x=b.cx+Math.cos(an)*b.rx,z=b.cz+Math.sin(an)*b.rz,dx=-Math.sin(an)*b.rx,dz=Math.cos(an)*b.rz,fl=Math.sin(t*6+k)*.6;
        b.g.position.set(x,b.cy+Math.sin(an*1.3)*1.2,z);b.g.rotation.y=-Math.atan2(dz,dx);b.w1.rotation.x=fl;b.w2.rotation.x=-fl});
      rd.setRenderTarget(A.rt);rd.render(sc,cam);rd.setRenderTarget(null);rd.render(A.qs,A.qc);
    }
    var last=0;
    function loop(now){if(!run)return;var dt=Math.min(.05,(now-last)/1000);last=now;resize();frame((now-t0)/1000+2,dt);raf=requestAnimationFrame(loop)}
    function start(){if(!init())return;resize();if(run)return;run=true;t0=last=performance.now();raf=requestAnimationFrame(loop)}
    function stop(){run=false;cancelAnimationFrame(raf)}
    function still(){if(!init())return;resize();frame(3,.016);frame(3.03,.016)}
    return obj;
  })();
  function FX(){return scene3d.init()?scene3d:deskFx}
  var deskFx=(function(){
    function mk(){return document.createElement('canvas')}
    var cv=$('dscene'),g=cv.getContext('2d'),skyC=mk(),wallC=mk(),fgC=mk(),sc=skyC.getContext('2d'),wc2=wallC.getContext('2d'),fc=fgC.getContext('2d'),
        W=0,H=0,raf=0,t0=0,last=0,run=false,mist=[],drops=[],rip=[],bub=[],streaks=[],koi=[],school={},drag=[],fly=[],leavesF=[],pads=[],gulls=[],far=[],fall=[],G={};
    function nz(i){var v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v)}
    function R(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
    function disc(c,cx,cy,r,col){for(var dy=-r;dy<=r;dy++){var w=Math.floor(Math.sqrt(r*r-dy*dy+.5));R(c,cx-w,cy+dy,w*2+1,1,col)}}
    function leafCol(v){return v>1.1?'#9be85e':v>.9?'#6fcb48':v>.7?'#3f9a3e':v>.5?'#27703a':v>.32?'#185231':'#0f3824'}
    function skyL(y){return G.sl0+(G.fx0-G.sl0)*Math.min(1,y/G.lip)}
    function boulder(c,cx,cy,rx,ry,seed,dark){
      for(var dy=-ry;dy<=ry;dy++){
        var w=Math.floor(rx*Math.sqrt(Math.max(0,1-(dy/ry)*(dy/ry))));
        for(var dx=-w;dx<=w;dx++){
          var nx=dx/rx,ny=dy/ry,lt=(-nx*.5-ny*.7)+.5+nz(seed+dx*3.1+dy*7.7)*.28-(dark?.55:0),col;
          col=lt>1?'#c4a068':lt>.75?'#a88458':lt>.5?'#8a6a44':lt>.3?'#6a4e30':'#4a3622';
          if(dark)col=lt>.5?'#4a5a48':lt>.25?'#34483c':'#24342a';
          if(ny<-.5&&nz(seed+dx*5+dy)>.35)col=nz(seed+dx)>.5?'#58b840':'#3f9a3e';
          if(Math.abs(dx)===w||dy===ry)col=dark?'#1a2620':'#3a2a1a';
          R(c,cx+dx,cy+dy,1,1,col);
        }
      }
    }
    function size(){
      var r=cv.getBoundingClientRect(),k=3,i,x,y,q;
      W=Math.max(100,Math.round(r.width/k));H=Math.max(76,Math.round(r.height/k));
      [cv,skyC,wallC,fgC].forEach(function(c){c.width=W;c.height=H});
      G={fx0:Math.round(W*.5),fx1:Math.round(W*.72),lip:Math.round(H*.24),pond:Math.round(H*.74),sl0:Math.round(W*.34)};
      G.cx=Math.round((G.fx0+G.fx1)/2);G.pill=G.fx0+Math.round((G.fx1-G.fx0)*.3);G.pillH=G.lip+Math.round((G.pond-G.lip)*.5);G.skyR=G.fx1+1;G.skyRf=function(y){return G.fx1+1+Math.round(Math.max(0,G.lip-y)*.1+nz(y*1.7)*2)};
      /* sky */
      for(y=0;y<G.pond;y++){q=y/G.pond;R(sc,0,y,W,1,'rgb('+Math.round(110+120*q)+','+Math.round(184+60*q)+','+Math.round(244+8*q)+')')}
      var hz=G.lip-Math.round(H*.1);
      for(x=0;x<W;x++){var hh2=Math.round(hz-3-3*Math.sin(x*.09)-2*Math.sin(x*.23+1));R(sc,x,hh2,1,hz-hh2+2,'#a8d4c0');var h3=Math.round(hz-1-2*Math.sin(x*.13+2));R(sc,x,h3,1,hz-h3+2,'#7cb8a0')}
      for(i=0;i<26;i++){var tx3=Math.round(G.fx0+nz(i*3)*(G.fx1-G.fx0)),ty3=hz-Math.round(nz(i*5)*3);R(sc,tx3,ty3-2,2,3,'#5aa088');R(sc,tx3,ty3,1,2,'#3a6a58')}
      /* gorge walls */
      for(y=0;y<G.pond;y++)for(x=0;x<W;x++){
        var dist,L,left=x<W/2;
        if(y<G.lip){var sl=skyL(y);var srr=G.skyRf(y);if(x>=sl&&x<=srr)continue;dist=x<sl?sl-x:x-srr;
          L=left?Math.max(0,1-dist/26)*.95+.12*Math.max(0,1-x/(W*.4)):Math.max(0,1-dist/16)*.8*(1-y/(G.lip+H*.1))}
        else{if(x>=G.fx0&&x<=G.fx1){R(wc2,x,y,1,1,'#1f4a58');continue}dist=x<G.fx0?G.fx0-x:x-G.fx1;
          L=left?Math.max(0,.4*(1-(y-G.lip)/(H*.22)))+.05:Math.max(0,.3*(1-(y-G.lip)/(H*.15)))+.02}
        var n=nz(x*7.1+y*13.3),col;
        if(L>.5)col=leafCol(n*.4+L);
        else{
          var v=n*.22+L*.9+.18*(1-y/G.pond),rk=Math.sin(x*.085+Math.sin(y*.06)*2)+Math.sin(y*.1+x*.03);
          col=v>.62?'#1e5440':v>.46?'#184638':v>.3?'#12382f':'#0c2a26';
          if(rk>.8&&y>G.lip*.6){var st=nz(Math.floor((y+Math.sin(x*.2)*2)/3)*9.7+Math.floor(x/5)*1.3)*.5+nz(Math.floor(y/3)*4.1)*.5;col=st>.66?'#76644a':st>.33?'#5e4f3c':'#4a4034';if(nz(x*4.1+y*2.3)>.86)col='#2f6a40'}
          else if(n>.93)col='#2f6a40';
        }
        R(wc2,x,y,1,1,col);
      }
      /* tan cliff face on the left and a dark outcrop by the fall */
      for(y=Math.round(G.pond-H*.2);y<G.pond;y++)for(x=Math.round(G.fx1+1);x<=G.fx1+W*.16;x++){
        var e3=Math.pow((x-(G.fx1+W*.07))/(W*.09),2)+Math.pow((y-(G.pond-H*.1))/(H*.1),2),n3=nz(x*4.1+y*6.3);
        if(e3<.7+n3*.3&&e3<1)R(wc2,x,y,1,1,n3>.6?'#34483c':'#27382e');
      }
      /* the pool */
      for(y=G.pond;y<H;y++){q=(y-G.pond)/(H-G.pond);R(wc2,0,y,W,1,'rgb('+Math.round(120-86*q)+','+Math.round(222-72*q)+','+Math.round(228-48*q)+')')}
      var eg=wc2.createLinearGradient(0,0,W*.16,0);eg.addColorStop(0,'rgba(8,48,40,.4)');eg.addColorStop(1,'rgba(8,48,40,0)');wc2.fillStyle=eg;wc2.fillRect(0,G.pond,W*.16,H-G.pond);
      eg=wc2.createLinearGradient(W,0,W*.84,0);eg.addColorStop(0,'rgba(8,48,40,.4)');eg.addColorStop(1,'rgba(8,48,40,0)');wc2.fillStyle=eg;wc2.fillRect(W*.84,G.pond,W*.16,H-G.pond);
      for(i=0;i<5;i++){var ux=W*(.3+.4*nz(i*3)),uy=G.pond+(H-G.pond)*(.45+.4*nz(i*7));g.globalAlpha=1;disc(wc2,Math.round(ux),Math.round(uy),3+Math.round(nz(i)*3),'rgba(20,110,130,.35)')}
      /* ---- foreground: slope bushes, tree, rocks ---- */
      for(x=0;x<W*.2;x++){var ty=Math.round(H*.7+x*.45);for(y=ty;y<H;y++){var vv=nz(x*5.3+y*9.1)*.4+.5*(1-(y-ty)/(H*.25));R(fc,x,y,1,1,vv>.85?'#58b840':vv>.6?'#2f8a3e':vv>.4?'#1f6a36':'#14502c')}}
      for(x=Math.round(W*.84);x<W;x++){var ty2=Math.round(H*.78-(x-W*.84)*.15);for(y=ty2;y<H;y++){var v2=nz(x*5.3+y*9.1)*.4+.45*(1-(y-ty2)/(H*.2));R(fc,x,y,1,1,v2>.8?'#3f9a3e':v2>.5?'#27703a':'#185231')}}
      /* small tree on the right bank */
      var stx=Math.round(W*.83),sty=G.pond-1;R(fc,stx-1,sty-12,3,13,'#4a3422');R(fc,stx,sty-12,1,13,'#2a1c10');
      disc(fc,stx,sty-16,7,'#2f8a3e');disc(fc,stx-2,sty-17,5,'#58b840');disc(fc,stx-3,sty-18,3,'#8ee05a');disc(fc,stx+5,sty-13,4,'#27703a');
      /* the great tree on the right */
      leavesF=[];
      for(y=0;y<H;y++){var xc=W*.935+W*.045*Math.sin(y/H*2.4)-(1-y/H)*W*.02,wd=Math.max(4,Math.round(W*.048*(1-y/H*.35)));
        for(x=Math.round(xc-wd/2);x<=Math.round(xc+wd/2);x++){var ft=(x-(xc-wd/2))/wd,cb=nz(x*3+y*5)>.78?'#2a1c12':ft<.3?'#5a4228':ft<.7?'#3e2c1c':'#241a10';R(fc,x,y,1,1,cb)}}
      for(var s2=0;s2<=1;s2+=.04){var bx=W*.93-s2*W*.2,by=H*.2-s2*H*.17+Math.sin(s2*3)*3,th=Math.max(2,Math.round(4-s2*2.4));R(fc,bx,by,th+1,th,'#3e2c1c');R(fc,bx,by,th+1,1,'#5a4228');if(Math.round(s2*25)%7===0)leavesF.push({x:bx,y:by-2,r:3+Math.round(nz(s2*40)*3),ph:s2*7})}
      [[.9,.03,5],[.84,.08,4],[.97,.16,5]].forEach(function(p,pi){leavesF.push({x:W*p[0],y:H*p[1],r:p[2],ph:pi*1.3})});
      /* boulders */
      boulder(fc,G.fx0-2,G.lip+1,6,4,91,true);boulder(fc,G.fx1+3,G.lip+1,7,5,97,true);
      boulder(fc,G.cx-8,G.lip-Math.round(H*.05),2,1,101,true);boulder(fc,G.cx+9,G.lip-Math.round(H*.07),3,1,103,true);
      boulder(fc,Math.round(W*.03),Math.round(H*.93),Math.round(W*.1),Math.round(H*.12),11);
      boulder(fc,Math.round(W*.16),Math.round(H*.89),Math.round(W*.07),Math.round(H*.06),23);
      boulder(fc,Math.round(W*.255),Math.round(H*.835),Math.round(W*.045),Math.round(H*.035),37);
      boulder(fc,Math.round(W*.9),Math.round(H*.9),Math.round(W*.12),Math.round(H*.11),51);
      boulder(fc,Math.round(W*.775),Math.round(H*.845),Math.round(W*.065),Math.round(H*.05),63);
      boulder(fc,Math.round(W*.69),Math.round(H*.8),Math.round(W*.04),Math.round(H*.03),71);
      boulder(fc,Math.round(W*.46),Math.round(H*.915),Math.round(W*.04),Math.round(H*.028),83);
      /* ---- creatures and motion ---- */
      mist=[];drops=[];rip=[];bub=[];streaks=[];koi=[];drag=[];fly=[];gulls=[];far=[];pads=[];
      var cols=[['#ff7a2a','#ffffff'],['#ffffff','#e8501a'],['#ffb02a','#ffffff']];
      for(i=0;i<3;i++){var k0={x:W*(.36+.12*i),y:G.pond+(H-G.pond)*(.45+.3*nz(i)),ang:nz(i*3)*6.28,sp:7+nz(i*5)*5,segs:[],c:cols[i],ph:nz(i*9)*6};for(var sg=0;sg<8;sg++)k0.segs.push({x:k0.x-sg*2,y:k0.y});koi.push(k0)}
      school={x:W*.5,y:G.pond+(H-G.pond)*.7,ang:0,ph:1,fish:[]};for(i=0;i<9;i++)school.fish.push({x:school.x+nz(i)*8,y:school.y+nz(i+4)*5,ox:(nz(i*3)-.5)*14,oy:(nz(i*7)-.5)*8});
      drag.push({x:W*.4,y:G.pond-8,tx:W*.4,ty:G.pond-8,ph:0});
      for(i=0;i<2;i++)fly.push({bx:W*(.1+.1*i),by:H*(.46+.1*i),ph:nz(i*7)*6,c:i%2?'#ffd84a':'#ff9ac8'});
      for(i=0;i<3;i++)gulls.push({ph:i*2.1,sp:.45+i*.08,rx:W*(.07+.02*i),ry:H*(.07+.02*i)});
      for(i=0;i<3;i++)far.push({x:nz(i)*W,y:4+i*5,sp:4+i*2});
      pads=[{x:Math.round(W*.6),y:Math.round(G.pond+(H-G.pond)*.62),ph:0,lotus:1},{x:Math.round(W*.39),y:Math.round(G.pond+(H-G.pond)*.78),ph:1,lotus:0,frog:1}];
    }
    function wander(o,dt,t,lo,hi,yl,yh,spd){
      var out=o.x<lo||o.x>hi||o.y<yl||o.y>yh;
      if(out){var ta=Math.atan2((yl+yh)/2-o.y,(lo+hi)/2-o.x),d=ta-o.ang;d=Math.atan2(Math.sin(d),Math.cos(d));o.ang+=d*Math.min(1,dt*3)}
      else o.ang+=Math.sin(t*.7+o.ph*3)*dt*1.4;
      o.x+=Math.cos(o.ang)*spd*dt;o.y+=Math.sin(o.ang)*spd*dt*.6;
    }
    function frame(now){
      if(!run)return;
      var t=(now-t0)/1000,dt=Math.min(.05,(now-last)/1000);last=now;
      var fx0=G.fx0,fx1=G.fx1,lip=G.lip,pond=G.pond,cx=G.cx,i,x,y,k,c;
      g.drawImage(skyC,0,0);
      /* drifting clouds in the gap */
      [[.36,3,34],[.5,10,26],[.62,2,30]].forEach(function(p,ci){var cxp=W*.34+(((p[0]-.34)*W+t*(1.4+ci*.5))%(W*.42+40))-20;g.globalAlpha=.92;R(g,cxp,p[1],p[2],5,'#fff');R(g,cxp+4,p[1]-3,p[2]-10,3,'#fff');R(g,cxp+8,p[1]-5,p[2]-18,2,'#fff');R(g,cxp+2,p[1]+5,p[2]-6,2,'#dcecfa');g.globalAlpha=1});
      far.forEach(function(bd){bd.x=(bd.x+bd.sp*dt)%(W+10);var fl=Math.floor(t*4+bd.sp)%2;R(g,bd.x,bd.y+fl,1,1,'#3a5a6a');R(g,bd.x-1,bd.y+1-fl,1,1,'#3a5a6a');R(g,bd.x+1,bd.y+1-fl,1,1,'#3a5a6a')});
      g.drawImage(wallC,0,0);
      /* the river above the lip, narrowing into the distance */
      var Hr=Math.round(H*.1);
      for(y=lip-Hr;y<lip;y++){
        var qr=(y-(lip-Hr))/Hr,half=((fx1-fx0)/2)*(.3+.7*qr);
        for(x=Math.round(cx-half);x<=Math.round(cx+half);x++){
          var ur=y*1.1-t*(5+qr*16)+nz(x*2.3)*6,vr=Math.sin(ur)+.5*Math.sin(x*.6+t*2+y*.4),ex2=(x<=Math.round(cx-half)+0||x>=Math.round(cx+half));
          R(g,x,y,1,1,ex2?'#8fc0e0':vr>.7?'#ffffff':vr>-.1?'#e4f3fc':'#bfe0f2');
        }
      }
      for(i=0;i<7;i++){var rx2=cx-(fx1-fx0)*.4+nz(i*9)*(fx1-fx0)*.8,ry2=lip-1-nz(i*4)*Hr*.9;if(Math.sin(t*2+i*2)>-.3)R(g,rx2,ry2,2+nz(i)*2,1,'#ffffff')}
      /* rock pillar dividing the fall */
      R(g,G.pill,lip,3,G.pillH-lip,'#3e3426');R(g,G.pill,lip,1,G.pillH-lip,'#5a4a34');
      for(y=lip;y<G.pillH;y+=3)if(nz(y)>.4)R(g,G.pill+1,y,1,1,'#58b840');
      /* the two falls */
      for(x=fx0;x<=fx1;x++){
        if(x>=G.pill&&x<G.pill+3){}
        var sp=26+(x%3)*9+nz(x)*8,yEnd=pond,ed=(x===fx0||x===fx1||x===G.pill-1||x===G.pill+3);
        if(x>=G.pill&&x<G.pill+3){if(G.pillH>=pond)continue;}
        for(y=lip;y<yEnd;y++){
          if(x>=G.pill&&x<G.pill+3&&y<G.pillH)continue;
          if((x<=fx0+1||x>=fx1-1)&&nz(y*3.3+x)>.72)continue;
          if(y<lip+2+Math.round(Math.sin(x*.5+t*3)*1.2))continue;
          var u=(y-t*sp)*.3+nz(x*3)*6.28,v=Math.sin(u)+.6*Math.sin((y-t*sp*1.4)*.7+x*.8),cl;
          cl=v>1?'#f4fbff':v>.2?'#d6eaf8':v>-.6?'#a8d0ec':'#86b8e0';
          if(ed)cl=v>0?'#bcdcf2':'#6fa4d0';
          R(g,x,y,1,1,cl);
        }
      }
      for(x=fx0;x<=fx1;x++){var cr2=Math.round(1+nz(x*2.1+Math.floor(t*8))*2+Math.sin(x*.5+t*3)*.8);for(y=lip-1;y<lip+cr2;y++)R(g,x,y,1,1,y<lip?'#ffffff':'#eaf6ff')}
      /* turquoise pool: glints, reflections, foam */
      for(i=0;i<54;i++){var gx=((nz(i*5)*W+t*(2+i%3))%W),gy=pond+2+nz(i*9)*(H-pond-3);g.globalAlpha=.55*(.5+.5*Math.sin(t*2+i));R(g,gx,gy,3+nz(i)*5,1,i%3?'#ffffff':'#bff4f8')}g.globalAlpha=1;
      /* plunge pool: churning white water where the fall lands */
      var py0=pond+Math.round((H-pond)*.16),prx=(fx1-fx0)*.82,pry=(H-pond)*.34;
      for(y=pond;y<=pond+(H-pond)*.7;y++)for(x=Math.round(cx-prx-4);x<=cx+prx+4;x++){
        var ddx=(x-cx)/prx,ddy=(y-py0)/pry,dd2=ddx*ddx+ddy*ddy;if(dd2>1)continue;
        if(nz(x*1.7+y*3.1+Math.floor(t*6))<dd2*.85)continue;
        var vv=Math.sin(x*.55+t*4.2)+Math.sin(y*1.4-t*3.1)+Math.sin((x+y)*.38+t*2.4)+(1-dd2)*.9;
        var cc2=vv>1.6?'#ffffff':vv>.7?'#e2f7fb':vv>-.2?'#a4e6ee':null;if(cc2)R(g,x,y,1,1,cc2);
      }
      /* light column of aerated water under the fall, with bubbles */
      for(y=pond+2;y<pond+(H-pond)*.75;y++){g.globalAlpha=.22*(1-(y-pond)/((H-pond)*.75));for(x=fx0+2;x<fx1-1;x++)if(Math.sin(x*.9+y*.7-t*3)>-.1)R(g,x,y,1,1,'#e6fbff')}g.globalAlpha=1;
      if(Math.random()<dt*22)bub.push({x:fx0+Math.random()*(fx1-fx0),y:pond+4+Math.random()*(H-pond)*.5,vy:-(5+Math.random()*6)});
      for(i=bub.length-1;i>=0;i--){var bb=bub[i];bb.y+=bb.vy*dt;bb.x+=Math.sin(t*4+i)*dt*3;if(bb.y<pond+1){bub.splice(i,1);continue}g.globalAlpha=.75;R(g,bb.x,bb.y,1,1,'#ffffff');g.globalAlpha=1}
      /* foam streaks racing outward over the surface */
      if(Math.random()<dt*14){var fxs=cx+(Math.random()-.5)*(fx1-fx0)*.8;streaks.push({x:fxs,y:pond+2+Math.random()*(H-pond)*.4,vx:(fxs>=cx?1:-1)*(9+Math.random()*12),l:0,m:1+Math.random()*1.2,w:3+Math.random()*6})}
      for(i=streaks.length-1;i>=0;i--){var st2=streaks[i];st2.l+=dt;if(st2.l>st2.m){streaks.splice(i,1);continue}st2.x+=st2.vx*dt;g.globalAlpha=.9*(1-st2.l/st2.m);R(g,st2.x,st2.y,st2.w,1,'#ffffff');g.globalAlpha=1}
      /* life under the surface */
      koi.forEach(function(f){
        wander(f,dt,t,W*.2,W*.78,pond+8,H-10,f.sp);
        f.segs[0].x=f.x;f.segs[0].y=f.y;
        for(var sg=1;sg<f.segs.length;sg++){var pa=f.segs[sg-1],sa=f.segs[sg],dx=pa.x-sa.x,dy=pa.y-sa.y,dd=Math.sqrt(dx*dx+dy*dy)||1;if(dd>2.1){sa.x+=dx*(dd-2.1)/dd;sa.y+=dy*(dd-2.1)/dd}}
        for(sg=f.segs.length-1;sg>=0;sg--){var s3=f.segs[sg],wag=Math.round(Math.sin(t*6+f.ph-sg*.7)*(sg>4?1.2:0));var cc=sg===0?'#2a2a30':(sg%3===1?f.c[1]:f.c[0]);g.globalAlpha=.94;R(g,s3.x-1,s3.y+wag-(sg<5?1:0),sg<5?3:2,sg<5?2:1,cc)}
        var tl=f.segs[f.segs.length-1];R(g,tl.x-2,tl.y-1+Math.round(Math.sin(t*7+f.ph)),1,3,f.c[0]);g.globalAlpha=1;
      });
      var sc2=school;wander(sc2,dt,t,W*.25,W*.75,pond+10,H-12,11);
      sc2.fish.forEach(function(sf,si){sf.x+=(sc2.x+sf.ox-sf.x)*Math.min(1,dt*2.4);sf.y+=(sc2.y+sf.oy-sf.y)*Math.min(1,dt*2.4);var dir=Math.cos(sc2.ang)>=0?1:-1;g.globalAlpha=.92;R(g,sf.x,sf.y,2,1,'#f4fbff');R(g,sf.x-dir,sf.y+(Math.floor(t*8+si)%2?0:-1),1,1,'#bfe4f0');g.globalAlpha=1});
      pads.forEach(function(p){
        var py=p.y+Math.round(Math.sin(t*1.1+p.ph)*.6);
        R(g,p.x-5,py,11,1,'#3aa84a');R(g,p.x-4,py-1,9,1,'#58c85a');R(g,p.x-4,py+1,9,1,'#2f8a3c');R(g,p.x+1,py,3,1,'#78dee4');
        g.globalAlpha=.4;R(g,p.x-7,py+2,15,1,'#ffffff');g.globalAlpha=1;
        if(p.lotus){R(g,p.x-3,py-3,2,2,'#ffb8d0');R(g,p.x+1,py-3,2,2,'#ffb8d0');R(g,p.x-1,py-5,2,4,'#ff8fb8');R(g,p.x-1,py-3,2,1,'#ffe07a')}
        if(p.frog){var bl=(t%5)<.18;R(g,p.x+1,py-3,4,2,'#58c040');R(g,p.x+1,py-4,1,1,'#58c040');R(g,p.x+4,py-4,1,1,'#58c040');if(!bl){R(g,p.x+1,py-4,1,1,'#fff');R(g,p.x+4,py-4,1,1,'#fff')}R(g,p.x+2,py-2,2,1,'#9be870')}
      });
      /* billowing mist */
      if(Math.random()<dt*18)mist.push({x:fx0-6+Math.random()*(fx1-fx0+12),y:pond-1+Math.random()*3,r:5+Math.random()*7,vx:(Math.random()-.55)*9,vy:-(2+Math.random()*4),l:0,m:4+Math.random()*3});
      for(i=mist.length-1;i>=0;i--){var m=mist[i];m.l+=dt;if(m.l>m.m){mist.splice(i,1);continue}m.x+=m.vx*dt;m.y+=m.vy*dt;m.r+=dt*1.2;g.globalAlpha=.26*Math.sin(Math.PI*m.l/m.m);disc(g,Math.round(m.x),Math.round(m.y),Math.round(m.r),'#e6f2fb')}
      g.globalAlpha=.3+.05*Math.sin(t);disc(g,cx-8,pond-3,13,'#eef7fd');disc(g,cx+9,pond-2,15,'#eef7fd');disc(g,cx+1,pond-6,11,'#f4fbff');g.globalAlpha=1;
      for(x=fx0;x<=fx1;x++)for(y=pond-14;y<pond+2;y++){var fd=(y-(pond-14))/16;if(nz(x*3.7+y*5.1+Math.floor(t*18))<fd*.7)R(g,x,y,1,1,nz(x+y)>.5?'#ffffff':'#e2f7fb')}
      /* ripples and splash */
      if(Math.random()<dt*5)rip.push({x:cx+(Math.random()-.5)*(fx1-fx0),y:pond+3+Math.random()*5,l:0});
      for(i=rip.length-1;i>=0;i--){var rp=rip[i];rp.l+=dt;if(rp.l>2.3){rip.splice(i,1);continue}var rr=rp.l*15;g.globalAlpha=(1-rp.l/2.3)*.9;for(var a2=0;a2<44;a2++){var an=a2*.1428;R(g,rp.x+Math.cos(an)*rr,rp.y+Math.sin(an)*rr*.3,2,1,'#ffffff')}g.globalAlpha=1}
      if(Math.random()<dt*90){var big=Math.random()<.25;drops.push({x:fx0-3+Math.random()*(fx1-fx0+6),y:pond+Math.random()*2,vx:(Math.random()-.5)*34,vy:-(26+Math.random()*(big?60:40)),big:big})}
      for(i=drops.length-1;i>=0;i--){var dp=drops[i];dp.vy+=120*dt;dp.x+=dp.vx*dt;dp.y+=dp.vy*dt;if(dp.y>pond+1&&dp.vy>0){drops.splice(i,1);continue}R(g,dp.x,dp.y,dp.big?2:1,dp.big?2:1,'#ffffff')}
      /* things that fly */
      gulls.forEach(function(gl){
        var an=t*gl.sp+gl.ph,gx=cx+Math.cos(an)*gl.rx,gy=lip+(pond-lip)*.42+Math.sin(an*1.3)*gl.ry,fl=Math.floor(t*5+gl.ph*3)%2,d2=-Math.sin(an)>=0?1:-1;
        R(g,gx-1,gy,3,1,'#ffffff');R(g,gx+d2*2,gy,1,1,'#f0f0f0');R(g,gx-3,gy-1+fl*2,2,1,'#ffffff');R(g,gx+2,gy-1+fl*2,2,1,'#ffffff');R(g,gx+d2*3,gy,1,1,'#f4a050');
      });
      drag.forEach(function(d){
        var dx=d.tx-d.x,dy=d.ty-d.y,dl=Math.sqrt(dx*dx+dy*dy);
        if(dl<2){d.tx=W*(.3+.45*Math.random());d.ty=pond-14+Math.random()*16}
        else{d.x+=dx/dl*34*dt;d.y+=dy/dl*34*dt+Math.sin(t*9+d.ph)*.2}
        var wf=Math.floor(t*30)%2,dir=dx>=0?1:-1;
        R(g,d.x-dir*2,d.y,4,1,'#1fb8e8');R(g,d.x+dir*2,d.y,1,1,'#176a9a');R(g,d.x-1,d.y-1-wf,2,1,'#ffffff');R(g,d.x-1,d.y+1+wf,2,1,'#ffffff');
      });
      fly.forEach(function(f2){var bx=f2.bx+Math.sin(t*.45+f2.ph)*20,by=f2.by+Math.sin(t*.8+f2.ph*2)*7,fl=Math.floor(t*8+f2.ph)%2;R(g,bx,by,1,2,'#3a2a2a');R(g,bx-2,by-fl,2,2-fl,f2.c);R(g,bx+1,by-fl,2,2-fl,f2.c)});
      /* foreground: slope bushes, the great tree and boulders */
      g.drawImage(fgC,0,0);
      leavesF.forEach(function(lf2,li){var sw=Math.round(Math.sin(t*.9+lf2.ph)*.9),sx=Math.round(lf2.x)+sw,sy=Math.round(lf2.y);disc(g,sx,sy,lf2.r,'#27703a');disc(g,sx-1,sy-1,Math.max(1,lf2.r-2),'#58b840');if(lf2.r>3)disc(g,sx-2,sy-2,Math.max(1,lf2.r-4),'#9be85e')});
      /* falling leaves */
      if(Math.random()<dt*1.4&&leavesF.length){var lv=leavesF[Math.floor(Math.random()*leavesF.length)];mist.push({x:lv.x,y:lv.y,r:0,vx:-2,vy:4,l:0,m:3,leaf:1})}
      for(i=mist.length-1;i>=0;i--){var ml=mist[i];if(!ml.leaf)continue;ml.vx+=Math.sin(t*3+i)*dt*8;if(ml.y>pond+2){mist.splice(i,1);continue}R(g,ml.x,ml.y,1,1,'#9be85e')}
      /* sunbeams from the gap, then a gorge-dark vignette */
      for(i=0;i<4;i++){var sx2=W*(.4+.07*i)+Math.sin(t*.3+i)*2;g.globalAlpha=.06+.035*Math.sin(t*.6+i*1.7);g.fillStyle='#fffbe0';g.beginPath();g.moveTo(sx2,0);g.lineTo(sx2+8,0);g.lineTo(sx2+8-H*.3,H);g.lineTo(sx2-H*.3,H);g.closePath();g.fill()}
      g.globalAlpha=1;
      var vg=g.createRadialGradient(W/2,H*.55,H*.4,W/2,H*.55,W*.62);vg.addColorStop(0,'rgba(0,30,20,0)');vg.addColorStop(1,'rgba(0,30,20,.34)');g.fillStyle=vg;g.fillRect(0,0,W,H);
      raf=requestAnimationFrame(frame);
    }
    return{
      start:function(){size();if(run)return;run=true;t0=last=performance.now();raf=requestAnimationFrame(frame)},
      stop:function(){run=false;cancelAnimationFrame(raf)},
      still:function(){size();run=true;t0=last=performance.now();frame(t0+500);run=false;cancelAnimationFrame(raf)}
    };
  })();
  (function(){
    var ct=$('contact'),op=$('navDc'),from=null,tdc=$('tDc'),pop=$('dcPop'),dk=ct.querySelector('.desk');
    function clock(){var d=new Date(),h=d.getHours(),m=d.getMinutes();$('tClock').textContent=(h<10?'0':'')+h+':'+(m<10?'0':'')+m}
    function popShut(){pop.hidden=true;tdc.setAttribute('aria-expanded','false')}
    function open(){from=document.activeElement;sfx.portal();clock();popShut();ct.hidden=false;var fx=FX();if(reduce)fx.still();else fx.start();$('contactClose').focus()}
    function shut(){popShut();ct.hidden=true;deskFx.stop();scene3d.stop();if(from&&from.focus)from.focus()}
    op.addEventListener('click',open);
    $('contactClose').addEventListener('click',shut);
    ct.addEventListener('click',function(e){if(e.target===ct)shut();else if(!pop.hidden&&!pop.contains(e.target)&&!tdc.contains(e.target))popShut()});
    tdc.addEventListener('click',function(e){
      e.stopPropagation();return;var o=pop.hidden;
      if(o){var l=tdc.getBoundingClientRect().left-dk.getBoundingClientRect().left-8,mx=dk.clientWidth-pop.offsetWidth-12;pop.style.left=Math.max(12,Math.min(l,Math.max(12,mx)))+'px'}
      pop.hidden=!o;tdc.setAttribute('aria-expanded',o?'true':'false');
    });
    document.addEventListener('keydown',function(e){
      if(ct.hidden)return;
      if(e.key==='Escape'){if(!pop.hidden){popShut();tdc.focus()}else shut();return}
      if(e.key==='Tab'){
        var f=Array.prototype.filter.call(ct.querySelectorAll('a,button'),function(n){return n.offsetParent!==null}),first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    });
  })();
  var pb=$('navRealm');
  gate.addEventListener('click',function(e){if(e.target===gate)closeGate()});
  $('gateStay').addEventListener('click',function(){closeGate()});
  document.addEventListener('keydown',function(e){
    if(gate.hidden)return;
    if(e.key==='Escape'){closeGate();return}
    if(e.key==='Tab'){
      var f=gate.querySelectorAll('button');
      var first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  });
  /* ---- teleport animation: a pixel-art simulation per destination ---- */
  var wc=$('warpc'),wx=wc.getContext('2d'),wBusy=false;
  var BY=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  function wCl(v,a,b){return v<a?a:v>b?b:v}
  function wEase(x){x=wCl(x,0,1);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}
  function wS(t,a,b){return wEase((t-a)/(b-a))}
  function wR(i){var s=Math.sin(i*127.1)*43758.5453;return s-Math.floor(s)}
  function warpPlay(to,done){
    if(wBusy){done();return}
    if(to!=='dejavu'){
      /* going to the smithy: heavy iron doors slide shut, hold, and slide open (pure CSS, so it never depends on frame callbacks) */
      var fd=$('forgeDoor'),fin=false;wBusy=true;
      function swapD(){if(!fin){fin=true;done()}}
      fd.classList.remove('go');void fd.offsetWidth;fd.classList.add('go');
      setTimeout(swapD,2100);
      setTimeout(function(){swapD();fd.classList.remove('go');wBusy=false},3300);
      return;
    }
    wBusy=true;var dj=to==='dejavu',px=dj?6:8;
    var W=Math.max(40,Math.ceil(innerWidth/px)),H=Math.max(40,Math.ceil(innerHeight/px));
    wc.width=W;wc.height=H;wc.style.display='block';
    var img=wx.createImageData(W,H),d=img.data;
    var SW=dj?1.95:2.1,T=dj?3.7:3.9,sw=false,t0=performance.now(),last=t0,acc=0,i,x,y,k;
    var heat=new Float32Array(W*H),emb=[],TH=new Float32Array(W*H),CD=new Float32Array(W);
    for(x=0;x<W;x++)CD[x]=.5+1*wR(x*3.31)+.3*Math.sin(x*.21);
    var cx=W/2,cy=H*.45,Wd=W*.4,Hm=Math.min(H*.24,Wd*.5);
    for(y=0;y<H;y++)for(x=0;x<W;x++){
      var rr=Math.sqrt(Math.pow((x-cx)/(W*.6),2)+Math.pow((y-cy)/(H*.6),2));
      TH[y*W+x]=Math.min(1,rr)*.55+(BY[(y&3)*4+(x&3)]/16)*.45;
    }
    function swap(){if(!sw){sw=true;done()}}
    function finish(){swap();wc.style.display='none';wc.style.transform='';wBusy=false}
    function put(k,r,g,b,a){d[k]=r;d[k+1]=g;d[k+2]=b;d[k+3]=a}
    var SP=[],SM=new Float32Array(W*H),HD=[0,0,0,0],lastHit=-9,AX=Math.round(W/2),AY=Math.round(H*.7),GR=150;
    function strike(idx,t){
      HD[idx]=1;lastHit=t;
      var cnt=30+Math.floor(Math.random()*16),j,an,sp,yy,xx,dd;
      for(j=0;j<cnt;j++){an=-Math.PI/2+(Math.random()-.5)*2.3;sp=35+Math.random()*80;SP.push({x:AX+(Math.random()-.5)*5,y:AY,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,l:0,m:1.1+Math.random()*.9})}
      for(yy=-7;yy<=7;yy++)for(xx=-9;xx<=9;xx++){
        var px2=AX+xx,py2=AY+yy;if(px2<0||px2>=W||py2<0||py2>=H)continue;
        dd=Math.sqrt(xx*xx/1.6+yy*yy*1.6)/8;if(dd<1)heat[py2*W+px2]=Math.max(heat[py2*W+px2],.95*(1-dd));
      }
    }
    function mix(c,ca2,r2,g2,b2,a2){var ao=ca2+a2*(1-ca2);if(ao<=0)return;c[0]=(c[0]*ca2+r2*a2*(1-ca2))/ao;c[1]=(c[1]*ca2+g2*a2*(1-ca2))/ao;c[2]=(c[2]*ca2+b2*a2*(1-ca2))/ao;c[3]=ao}
    var CC=[0,0,0,0];
    function forge(t,dt){
      var lvl=(t>.15&&t<SW+.1)?1:0,n=0,dec=1/(H*1.55),r,xs,v,hq,a,cov,q,cd,i,e,sa;
      var bel=.8+.2*Math.sin(t*5.2+Math.sin(t*1.7)*1.6),wind=Math.sin(t*1.3)*.5+Math.sin(t*3.7)*.3;
      acc+=dt;
      while(acc>=1/70&&n++<4){
        acc-=1/70;
        for(x=0;x<W;x++)heat[(H-1)*W+x]=lvl?Math.min(1,(.85+Math.random()*.3)*bel*wCl((t-.15)*1.6-.9*wR(x*1.7),0,1)):heat[(H-1)*W+x]*.6;
        for(y=0;y<H-1;y++)for(x=0;x<W;x++){
          r=Math.random();xs=x+(r<.12-wind*.07?-1:r>.88-wind*.07?1:0);
          if(xs<0)xs=0;if(xs>=W)xs=W-1;
          cd=CD[x]*(1+.3*Math.sin(x*.4+t*3.3));
          v=heat[(y+1)*W+xs]-dec*cd*(.3+1.4*Math.random());
          heat[y*W+x]=v>0?v:0;
          var sv=SM[(y+1)*W+xs]*.985;
          if(v>.03&&v<.16&&Math.random()<.18)sv+=.12;
          SM[y*W+x]=sv>1?1:sv;
        }
      }
      if(acc>.1)acc=0;
      for(i=0;i<4;i++)if(!HD[i]&&t>=HAMMER[i])strike(i,t);
      var fl=Math.max(0,1-(t-lastHit)/.14);
      wc.style.transform=fl>0.02?'translate('+((Math.random()-.5)*7*fl).toFixed(1)+'px,'+((Math.random()-.5)*7*fl).toFixed(1)+'px) scale(1.02)':'';
      cov=t<SW-.5?0:t<SW?(t-(SW-.5))/.5:t<SW+.2?1:Math.max(0,1-(t-SW-.2)/.6);
      d.fill(0);
      for(y=0;y<H;y++){
        var lf=(.62+.55*(y/H)*bel)*(1+.25*fl);
        for(x=0;x<W;x++){
          k=(y*W+x)*4;hq=Math.round(Math.min(1,heat[y*W+x]+fl*.05)*12)/12;
          var fr=0,fg=0,fb=0;
          if(hq<.05){a=0}
          else{
            a=Math.min(1,(hq-.05)/.16);
            if(hq<.25){q=hq/.25;fr=70+110*q;fg=8+22*q;fb=4}
            else if(hq<.5){q=(hq-.25)/.25;fr=180+60*q;fg=30+80*q;fb=4+10*q}
            else if(hq<.75){q=(hq-.5)/.25;fr=240+15*q;fg=110+85*q;fb=14+40*q}
            else{q=(hq-.75)/.25;fr=255;fg=195+50*q;fb=54+140*q}
          }
          CC[0]=58*lf;CC[1]=13*lf;CC[2]=5*lf;CC[3]=cov;
          sa=Math.round(Math.min(.55,SM[y*W+x]*.8)*8)/8;
          if(sa>0&&lvl)mix(CC,CC[3],62,58,66,sa);
          if(a>0)mix(CC,CC[3],fr,fg,fb,a);
          if(CC[3]>0)put(k,CC[0],CC[1],CC[2],CC[3]*255);
        }
      }
      if(lvl&&Math.random()<.9)for(i=0;i<3;i++)emb.push({x:Math.random()*W,y:H-1,vx:(Math.random()-.5)*10+wind*8,vy:-(25+Math.random()*50),l:0,m:1+Math.random()*1.4});
      for(i=emb.length-1;i>=0;i--){
        e=emb[i];e.l+=dt;
        if(e.l>e.m){emb.splice(i,1);continue}
        e.x+=e.vx*dt+Math.sin(t*6+i)*.2+wind*dt*6;e.y+=e.vy*dt;
        var ex=e.x|0,ey=e.y|0;
        if(ex>=0&&ex<W&&ey>=0&&ey<H)put((ey*W+ex)*4,255,e.l<e.m*.6?220:150,e.l<e.m*.6?120:50,255);
      }
      /* hammer sparks: ballistic, gravity, bounce, cooling colour */
      for(i=SP.length-1;i>=0;i--){
        e=SP[i];e.l+=dt;
        if(e.l>e.m){SP.splice(i,1);continue}
        var px0=e.x,py0=e.y;
        e.vy+=GR*dt;e.vx*=1-.5*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;
        if(e.y>=H-1){e.y=H-1;e.vy=-e.vy*.35;e.vx*=.7;if(Math.abs(e.vy)<10)e.vy=0}
        var tq=e.l/e.m,cr=255,cg,cb,al=255*(1-tq*tq);
        if(tq<.15){cg=250;cb=220}else if(tq<.45){cg=205;cb=110}else if(tq<.75){cg=130;cb=40}else{cr=200;cg=50;cb=15}
        for(var st=0;st<3;st++){
          var sx=Math.round(px0+(e.x-px0)*st/2),sy=Math.round(py0+(e.y-py0)*st/2);
          if(sx>=0&&sx<W&&sy>=0&&sy<H)put((sy*W+sx)*4,cr,cg,cb,al*(st===2?1:.55));
        }
      }
    }
    function S(t,a,b){return wS(t,a,b)}
    function doors(t,dt,lbl,lc){
      lbl=lbl===undefined?'FAMILIAR BAR':lbl;lc=lc||[255,140,196];
      var close=wS(t,0,.85),open=wS(t,2.1,3.1),kk=close*(1-open),half=W/2,pw=Math.round(half*kk),fl=.92+.08*Math.sin(t*9);
      var xp,pl,ix,f,r,g,b,inL,inR,band,yy,flash=t>.85&&t<.97?60*(1-(t-.85)/.12):0;
      d.fill(0);
      for(y=0;y<H;y++){
        yy=(y-H/2)/(H/2);f=(.62+.38*(1-yy*yy))*fl;
        band=(y>=Math.round(H*.2)&&y<Math.round(H*.2)+3)||(y>=Math.round(H*.78)&&y<Math.round(H*.78)+3);
        for(x=0;x<W;x++){
          inL=x<pw;inR=x>=W-pw;
          if(!inL&&!inR){
            /* warm light spilling through the opening gap */
            if(open>0&&kk>0&&(x<pw+12&&x>=pw||x>=W-pw-12&&x<W-pw)){
              var dd2=x<half?(x-pw):(W-pw-1-x);
              put((y*W+x)*4,255,190,100,Math.max(0,60*(1-dd2/12)));
            }
            continue;
          }
          k=(y*W+x)*4;
          xp=inL?x+(half-pw):(W-1-x)+(half-pw);
          pl=Math.floor(xp/9);ix=xp%9;
          r=[74,66,80][pl%3];g=[42,36,46][pl%3];b=[22,16,26][pl%3];
          if(ix===0){r=26;g=14;b=8}
          else if(ix===1){r+=14;g+=8;b+=4}
          if(wR(xp*7+y*3)<.07){r*=.7;g*=.7;b*=.7}
          if(band){r=29;g=21;b=17;if(y===Math.round(H*.2)+1||y===Math.round(H*.78)+1){if(xp%8===3){r=217;g=164;b=65}}}
          if(xp>=half-2){r=138;g=90;b=50}
          var hx=xp-(half-7),hy=y-H/2,hd=Math.sqrt(hx*hx+hy*hy);
          if(xp>=half-6&&xp<=half-4&&Math.abs(hy)<=4){r=201;g=149;b=58}
          if(hd>=1.8&&hd<=3.4&&xp<half-4){r=231;g=183;b=104}
          put(k,Math.min(255,r*f+flash),Math.min(255,g*f+flash),Math.min(255,b*f+flash),255);
        }
      }
      if(kk>.97&&lbl){
        var on=t>.95&&t<2.25&&wR(Math.floor(t*14))>.12,s=Math.max(1,Math.floor(W/84)),x0=Math.round((W-(lbl.length*6-1)*s)/2),y0=Math.round(H*.33-3.5*s);
        glyphs(lbl,function(gx,gy){
          var bx,by;
          for(by=0;by<s;by++)for(bx=0;bx<s;bx++){
            var px2=x0+gx*s+bx,py2=y0+gy*s+by;
            if(px2>=0&&px2<W&&py2>=0&&py2<H)put((py2*W+px2)*4,on?lc[0]:lc[0]*.35,on?lc[1]:lc[1]*.23,on?lc[2]:lc[2]*.33,255);
          }
        });
      }
      if(t>1&&t<3.4&&Math.random()<.5)emb.push({x:Math.random()*W,y:H*.3+Math.random()*H*.5,vx:(Math.random()-.5)*4,vy:-(2+Math.random()*5),l:0,m:1.2+Math.random()});
      for(i=emb.length-1;i>=0;i--){
        var m=emb[i];m.l+=dt;if(m.l>m.m){emb.splice(i,1);continue}
        m.x+=m.vx*dt;m.y+=m.vy*dt;
        var mx=m.x|0,my=m.y|0;
        if(mx>=0&&mx<W&&my>=0&&my<H)put((my*W+mx)*4,255,220,150,200*(1-m.l/m.m));
      }
    }
    /* going to the smithy: a glowing steel bar on an anvil is smashed by a heavy hammer, the last blow shatters the screen */
    function smash(t,dt){
      var u=Math.max(1,Math.min(W/105,H/80)),ox=0,oy=0,i,j,x,y,k,e,sh=0,ns=0,ls=-9,ia,fi;
      for(i=0;i<4;i++){if(t>=HAMMER[i]){ns++;ls=HAMMER[i];if(!SK[i]){SK[i]=1;hit(i)}}}
      for(i=0;i<4;i++){var dtt=t-HAMMER[i];if(dtt>=0&&dtt<.35)sh=Math.max(sh,(i===3?5:2.5)*Math.exp(-dtt*11))}
      if(reduce)sh=0;ox=Math.round((wR(Math.floor(t*60)*3.1)-.5)*2*sh);oy=Math.round((wR(Math.floor(t*60)*5.7)-.5)*2*sh);
      var hot=ns===0?.8:.5+.5*Math.exp(-(t-ls)*3.2),ga=wS(t,0,.28)*(1-wS(t,2.7,3.95)),fl=wS(t,1.85,2.6)*(reduce?.55:1);
      var cx=Math.round(W/2),AY0=Math.round(H*.68);
      d.fill(0);
      /* smoky dark smithy, with a hearth glow rising from below and a flash at each blow */
      var gl=0;for(i=0;i<4;i++){var d2=t-HAMMER[i];if(d2>=0&&d2<.5)gl=Math.max(gl,Math.exp(-d2*6))}
      for(y=0;y<H;y++)for(x=0;x<W;x++){
        var rx=(x-W/2)/(W*.6),ry=(y-AY0)/(H*.7),rr=Math.sqrt(rx*rx+ry*ry),b=Math.max(0,1-rr),n=wR(x*13.7+y*7.3+Math.floor(t*10)*.31),sm=.5+.5*Math.sin(x*.09+y*.07+t*.8);
        var gv=(b*b*(.55+gl*.9)+(y/H)*.18*hot)*(.8+.2*n);
        k=(y*W+x)*4;put(k,Math.min(255,16+gv*230*(.9+.1*sm)),Math.min(255,9+gv*105),Math.min(255,8+gv*34),255);
      }
      function rc(x0,y0,w,h,r,g,b){x0=Math.round(x0)+ox;y0=Math.round(y0)+oy;w=Math.round(w);h=Math.round(h);for(var yy=Math.max(0,y0);yy<Math.min(H,y0+h);yy++)for(var xx=Math.max(0,x0);xx<Math.min(W,x0+w);xx++)put((yy*W+xx)*4,r,g,b,255)}
      function rot(px0,py0,len,wid,ang,cb){
        var ca=Math.cos(ang),sa=Math.sin(ang),rad=Math.ceil(Math.sqrt(len*len+wid*wid)/2)+1,xx,yy,dx,dy,lu,lw,c;
        for(yy=Math.floor(py0-rad);yy<=py0+rad;yy++)for(xx=Math.floor(px0-rad);xx<=px0+rad;xx++){
          dx=xx-px0;dy=yy-py0;lu=dx*ca+dy*sa;lw=-dx*sa+dy*ca;
          if(Math.abs(lu)<=len/2&&Math.abs(lw)<=wid/2){c=cb(lu/len+.5,lw/wid+.5);var X=xx+ox,Y=yy+oy;if(c&&X>=0&&X<W&&Y>=0&&Y<H)put((Y*W+X)*4,c[0],c[1],c[2],255)}
        }
      }
      function hc(q){q=q<0?0:q>1?1:q;if(q<.25)return[70+110*q/.25,8+22*q/.25,4];if(q<.5){q=(q-.25)/.25;return[180+60*q,30+80*q,4+10*q]}if(q<.75){q=(q-.5)/.25;return[240+15*q,110+85*q,14+40*q]}q=(q-.75)/.25;return[255,195+50*q,54+140*q]}
      /* anvil */
      rc(cx-15*u,AY0+12*u,30*u,5*u,44,42,50);rc(cx-15*u,AY0+12*u,30*u,u,86,84,96);
      rc(cx-9*u,AY0+4*u,18*u,8.5*u,56,54,64);rc(cx-9*u,AY0+4*u,2*u,8.5*u,84,82,94);rc(cx+7*u,AY0+4*u,2*u,8.5*u,34,32,40);
      rc(cx-23*u,AY0,46*u,4*u,78,76,88);rc(cx-23*u,AY0,46*u,u,150,148,164);rc(cx+10*u,AY0+u,13*u,3*u,56,54,64);
      for(i=1;i<7;i++)rc(cx-23*u-i*1.6*u,AY0,1.6*u,Math.max(1,(4-i*.55)*u),i%2?70:64,i%2?68:62,i%2?80:74);
      /* the steel: flattens with each blow, glows from white-gold down to red */
      var th=3.2*u*(1-.16*ns),wd=27*u*(1+.09*ns),bx=cx-wd/2;
      for(x=0;x<wd;x++){var tq=hot*(1-.28*Math.abs(x/wd-.5)*2)*(.92+.08*wR(x*3.3+Math.floor(t*14)));var c=hc(tq);rc(bx+x,AY0-th,1,th,c[0],c[1],c[2]);rc(bx+x,AY0-th,1,1,Math.min(255,c[0]+30),Math.min(255,c[1]+40),Math.min(255,c[2]+50))}
      /* shimmer and embers rising off the hot steel */
      for(i=0;i<14;i++){var sp=((t*.9+wR(i*5.1))%1),sx=bx+wR(i*2.7)*wd+Math.sin(t*3+i)*2*u,sy=AY0-th-sp*16*u,a=(1-sp)*hot;if(a>.08)rc(sx,sy,i%3?1:2,1,255,200-120*sp,90-60*sp)}
      /* the hammer: swings up behind, then falls with all its weight */
      var Px=cx+30*u,Py=AY0-22*u,R0=33.5*u,psi0=Math.atan2(15,-30),rest=3.65,psi=rest;
      for(i=0;i<4;i++){
        var h=HAMMER[i],a0=h-.34;
        if(t>=a0&&t<h){var q=(t-a0)/.34;psi=q<.62?rest+(4.15-rest)*(1-Math.pow(1-q/.62,2)):4.15+(psi0-4.15)*Math.pow((q-.62)/.38,2.2)}
        else if(t>=h&&t<h+.26&&!(i<3&&t>=HAMMER[i+1]-.34)){var q2=(t-h)/.26;psi=psi0+(rest-psi0)*(1-Math.pow(1-q2,2))}
      }
      var hx=Px+Math.cos(psi)*R0,hy=Py+Math.sin(psi)*R0,hang=psi+Math.PI/2;
      rot((Px+hx)/2,(Py+hy)/2,R0+4*u,2.2*u,psi,function(a,b){return b<.3?[150,98,52]:b>.75?[70,42,22]:[108,70,36]});
      rot(hx,hy,13*u,10*u,psi,function(a,b){var edge=a<.1||a>.9||b<.12||b>.88;return edge?[30,30,38]:b<.4?[150,152,170]:[84,86,100]});
      rot(Px,Py,3*u,3*u,psi,function(){return[40,26,16]});
      /* sparks */
      for(i=SP.length-1;i>=0;i--){
        e=SP[i];e.l+=dt;if(e.l>e.m){SP.splice(i,1);continue}
        var ppx=e.x,ppy=e.y;e.vy+=GR*dt;e.vx*=1-.4*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;
        if(e.y>=H-1){e.y=H-1;e.vy=-e.vy*.35;e.vx*=.7}
        var tq2=e.l/e.m,cr=255,cg,cb;if(tq2<.15){cg=250;cb=220}else if(tq2<.45){cg=205;cb=110}else if(tq2<.75){cg=130;cb=40}else{cr=200;cg=50;cb=15}
        for(var st=0;st<3;st++){var sx2=Math.round(ppx+(e.x-ppx)*st/2),sy2=Math.round(ppy+(e.y-ppy)*st/2);if(sx2>=0&&sx2<W&&sy2>=0&&sy2<H)put((sy2*W+sx2)*4,cr,cg,cb,255)}
      }
      /* shockwave rings from each blow */
      for(i=0;i<4;i++){var d3=t-HAMMER[i];if(d3>=0&&d3<.45){var rr2=d3*W*(i===3?1.1:.6),al=1-d3/.45;for(j=0;j<90;j++){var an=j*.0698,qx=Math.round(cx+Math.cos(an)*rr2+ox),qy=Math.round(AY0-th+Math.sin(an)*rr2*.45+oy);if(qx>=0&&qx<W&&qy>=0&&qy<H)put((qy*W+qx)*4,255,200*al+40,90*al,255)}}}
      /* final blow: cracks race across the screen, then everything flares white-gold */
      if(t>=HAMMER[3]){var cl=(t-HAMMER[3])*W*1.7;for(i=0;i<16;i++){var ang=i*.3927+wR(i*9.1)*.3,len=cl*(.6+.6*wR(i*4.3)),ix=cx,iy=AY0-th;for(j=0;j<len;j+=1){var jx=Math.round(ix+Math.cos(ang)*j+Math.sin(j*.7+i)*1.2+ox),jy=Math.round(iy+Math.sin(ang)*j*.75+Math.cos(j*.5+i)+oy);if(jx>=0&&jx<W&&jy>=0&&jy<H)put((jy*W+jx)*4,255,230-j/len*120,140-j/len*100,255)}}}
      if(fl>0){for(i=0;i<d.length;i+=4){d[i]+=(255-d[i])*fl;d[i+1]+=(238-d[i+1])*fl;d[i+2]+=(190-d[i+2])*fl;d[i+3]=255}}
      if(ga<1)for(i=3;i<d.length;i+=4)d[i]=d[i]*ga;
    }
    var SK=[0,0,0,0];
    function hit(i){
      var cnt=i===3?90:46,j,an,sp,u2=Math.max(1,Math.min(W/105,H/80));
      for(j=0;j<cnt;j++){an=-Math.PI/2+(Math.random()-.5)*(i===3?3.1:2.3);sp=(i===3?55:35)+Math.random()*(i===3?110:80);SP.push({x:W/2+(Math.random()-.5)*14*u2,y:Math.round(H*.68)-3*u2,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,l:0,m:1+Math.random()*1.1})}
    }
    /* going to the bar: a drink is poured, amber liquid fills the screen, foam on top, then it drains away */
    function pour(t,dt){
      var kk=wS(t,0,.95)*(1-wS(t,2.1,3.1)),surf,r,g,b,dep,hl,fo,bu,sx2,sy2;
      d.fill(0);
      for(x=0;x<W;x++){
        surf=H-kk*(H+8)+Math.sin(x*.16+t*5)*1.6+Math.sin(x*.07-t*3)*1.2;
        for(y=0;y<H;y++){
          k=(y*W+x)*4;
          /* the stream coming down at the start */
          if(t<1.05&&Math.abs(x-W/2)<=2+Math.sin(y*.3+t*9)*.6&&y<surf){
            put(k,236,150,32,255);if(x<W/2-1)put(k,255,205,90,255);continue;
          }
          if(y<surf)continue;
          dep=Math.min(1,(y-surf)/H);
          r=214-dep*70;g=118-dep*58;b=22-dep*10;
          hl=(x%34)<3||((x+17)%61)<2;
          if(hl){r+=34;g+=36;b+=24}
          fo=y-surf;
          if(fo<5){
            r=250-fo*4;g=236-fo*8;b=196-fo*12;
            if(wR(x*3+y*7+Math.floor(t*6))<.12){r-=26;g-=30;b-=40}
          }
          bu=((x*53)%23)<2;
          if(bu){
            sy2=H-((t*(18+((x*29)%24))+x*19)%(H+10));
            if(Math.abs(y-sy2)<1.5&&y>surf+4){r=255;g=210;b=120}
          }
          put(k,Math.min(255,r),Math.min(255,g),Math.min(255,b),255);
        }
      }
      /* splash droplets at the surface while filling */
      if(t>.1&&t<1.1&&Math.random()<.8){
        var sy0=H-wS(t,0,.95)*(H+8);
        emb.push({x:W/2+(Math.random()-.5)*6,y:sy0,vx:(Math.random()-.5)*22,vy:-(8+Math.random()*16),l:0,m:.5+Math.random()*.4});
      }
      for(i=emb.length-1;i>=0;i--){
        var m=emb[i];m.l+=dt;if(m.l>m.m){emb.splice(i,1);continue}
        m.vy+=40*dt;m.x+=m.vx*dt;m.y+=m.vy*dt;
        var mx=m.x|0,my=m.y|0;
        if(mx>=0&&mx<W&&my>=0&&my<H)put((my*W+mx)*4,255,214,120,230*(1-m.l/m.m));
      }
    }
    function frame(now){
      var t=(now-t0)/1000,dt=Math.min(.05,(now-last)/1000);last=now;
      if(!sw&&t>=SW)swap();
      try{if(dj)pour(t,dt);else doors(t,dt,'')}catch(err){finish();return}
      wx.putImageData(img,0,0);
      lastDraw=performance.now();
      if(t>=T)finish();
    }
    var lastDraw=0;
    function raf(now){if(!wBusy)return;frame(now);if(wBusy)requestAnimationFrame(raf)}
    requestAnimationFrame(raf);
    /* fallback: if the browser pauses animation frames, keep the warp running from a timer */
    var tm=setInterval(function(){if(!wBusy){clearInterval(tm);return}if(performance.now()-lastDraw>70)frame(performance.now())},33);
    setTimeout(swap,(SW+.6)*1000);
    setTimeout(function(){if(wBusy)finish()},(T+1)*1000);
  }
  function travel(to){
    closeGate(false);
    sfx.warp(to);
    function go(){
      location.hash=(to==='dejavu'?'familiar-bar':'forge');
      if(realm!==to)applyRealm(to);
      sfx.arrive(to);
      pb.focus({preventScroll:true});
    }
    warpPlay(to,go);
  }
  Array.prototype.forEach.call(gate.querySelectorAll('.dest'),function(b){
    b.addEventListener('click',function(){
      var to=b.getAttribute('data-realm');
      if(to===realm){closeGate();return}
      travel(to);
    });
  });

/* ======================= BROKK THE DWARF ======================= */
  var LINES_BAR=[
    "Ehh... a new customer? Well, welcome! Come and join in the fun.",
    "My name? You can call me Deja. I am the eternal customer here. Actually, we are adventurers who went deep into the darkness. If you want to join us in exploring the deepest night, I might have to test your ability, hahaha.",
    "Oh, the bartender has been missing for some time. It should be... hmm, let me think... yeah, I remember now. It has been three days since he went missing, and this bar is without an owner. So we decided to help him out by looking after the bar until he comes back...",
    "What if he never comes back? Well, actually, given the bartender's ability and knowledge, we don't think anything can harm him, except for...",
    "Hahaha, why did we even think of him never coming back? Wouldn't it be better to wish for him to come back sooner?",
    "Looking after his bar takes a lot of time away from our adventures. Anyway, join us and let's drink to our hearts' content! As the saying goes, without fighting, how can we get to know each other? Hahaha, let's drink!!!"
  ];
  var LINES_FORGE=[
    "Oh, look. Fresh meat... er, adventurer. Welcome to town. Try not to bleed on the cobblestones; the council charges a cleaning fee.",
    "I\u2019m Spey. Strongest smith in town. Self-proclaimed, sure, mostly because the last guy who argued with me vanished, though honestly, he probably just moved. People move all the time. Usually without packing.",
    "You\u2019re asking about the town? Don\u2019t. Just mind your own business, buy a shovel, and don\u2019t look under the floorboards. That\u2019s my only reminder.",
    "Hahahaha! Everyone these days wants to dig into things that aren\u2019t theirs. Tell me, do you like digging? Because the things in the walls really hate being disturbed.",
    "Not here to commission a blade? Shame. My steel can cleave armor, bone, and the occasional bad decision. Still, one last piece of advice before you go: keep your eyes open when night falls."
  ];
  var LINES=LINES_BAR;
  var tkI=0,tkPos=0,tkTimer=null,talkEl=$('talk'),talkTxt=$('talkText'),npcBtn=$('npcBtn');
  /* A voice for each speaker: every spoken letter becomes a short vowel-shaped buzz through two formant filters, so it sounds like muttered speech instead of a beep. */
  var VOICE='spey',VOWELS={a:[800,1200],e:[520,1900],i:[320,2300],o:[500,900],u:[340,800],y:[330,2100]},lastV='a',VOX={spey:{f0:104,rasp:3,gain:.085,range:.34},brokk:{f0:78,rasp:5,gain:.095,range:.22}};
  function voice(ch,L,pos){
    if(!A.on||!A.ctx||!A.sfx)return;
    var c=A.ctx,lo=ch.toLowerCase(),isV=!!VOWELS[lo],isLetter=/[a-z]/.test(lo);
    if(!isLetter)return;
    var skip=!isV&&(pos%3!==0);
    if(skip&&!/[sfhkt]/.test(lo))return;
    try{
      var P=VOX[VOICE],t=c.currentTime+.005;
      if(isV)lastV=lo;
      /* consonants: a tiny breath or click of noise */
      if(/[sfhkpt]/.test(lo))noise(t,.045,.05,'highpass',lo==='s'||lo==='f'?5200:2600,A.sfx);
      if(skip)return;
      var vf=VOWELS[isV?lo:lastV]||VOWELS.a;
      /* pitch follows the sentence: lifts toward a question, sinks at a full stop, and wobbles word to word */
      var rest=L.length-pos,q=L.indexOf('?')>-1&&rest<14?1+(14-rest)*.012:1,fall=/[.!]\s*$/.test(L)&&rest<10?1-(10-rest)*.012:1;
      var word=1+Math.sin(pos*1.7)*P.range*.35+(Math.sin(pos*.37)*.5)*P.range*.3;
      var f=P.f0*word*q*fall*(lo==='a'||lo==='o'?1:1.06),dur=isV?.085:.055;
      var out=c.createGain(),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;
      out.gain.setValueAtTime(.0001,t);out.gain.exponentialRampToValueAtTime(P.gain,t+.012);out.gain.exponentialRampToValueAtTime(.0001,t+dur);
      [0,P.rasp].forEach(function(det,k){
        var o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(f+det,t);o.frequency.linearRampToValueAtTime(f*(.97+.05*Math.sin(pos)),t+dur);
        var g=c.createGain();g.gain.value=k?.5:1;o.connect(g);
        vf.forEach(function(fr,i){var bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fr*(.95+.1*Math.sin(pos*.9+i));bp.Q.value=i?7:5;var bg=c.createGain();bg.gain.value=i?.5:1;g.connect(bp);bp.connect(bg);bg.connect(lp)});
        o.start(t);o.stop(t+dur+.02);
      });
      lp.connect(out);out.connect(A.sfx);
    }catch(e){}
  }
  function talkLine(){
    clearTimeout(tkTimer);tkPos=0;npc.typing=true;talkEl.classList.add('typing');npc.pause=false;talkTxt.textContent='';
    var L=LINES[tkI];
    if(reduce){talkTxt.textContent=L;npc.typing=false;talkEl.classList.remove('typing');return}
    (function step(){
      tkPos++;talkTxt.textContent=L.slice(0,tkPos);
      var ch=L.charAt(tkPos-1),nx=L.charAt(tkPos);
      voice(ch,L,tkPos);
      if(tkPos>=L.length){npc.typing=false;talkEl.classList.remove('typing');npc.pause=false;return}
      if(ch==='!'&&nx!=='!'){talkEl.classList.remove('shout');void talkEl.offsetWidth;talkEl.classList.add('shout')}
      /* human timing: quick through words, a beat at commas, a longer breath at the end of a sentence */
      var d=30+Math.random()*18;
      if(ch===' ')d-=6;
      if(/[,;:]/.test(ch))d+=170;
      else if(/[.!?]/.test(ch)&&!/[.!?]/.test(nx)){d+=nx===' '||nx===''?360:60}
      else if(ch==='.'&&nx==='.')d+=70;
      else if(ch==='—')d+=130;
      npc.pause=d>150;
      tkTimer=setTimeout(step,d);
    })();
  }
  function talkClose(){clearTimeout(tkTimer);npc.open=false;npc.typing=false;talkEl.classList.remove('typing');npc.pause=false;talkEl.classList.remove('shout');talkEl.hidden=true}
  function talkAdvance(){
    if(!npc.open){npc.open=true;tkI=0;LINES=realm==='dejavu'?LINES_BAR:LINES_FORGE;VOICE=realm==='dejavu'?'brokk':'spey';talkEl.querySelector('.who').textContent=realm==='dejavu'?'Deja':'Spey';talkEl.hidden=false;if(A.on)sfx.blip();talkLine();return}
    if(npc.typing){clearTimeout(tkTimer);npc.typing=false;talkEl.classList.remove('typing');npc.pause=false;talkTxt.textContent=LINES[tkI];return}
    tkI++;
    if(tkI>=LINES.length){talkClose();return}
    if(A.on)sfx.blip();
    talkLine();
  }
  npcBtn.addEventListener('click',function(e){e.stopPropagation();talkAdvance()});
  talkEl.addEventListener('click',function(e){e.stopPropagation();talkAdvance()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&npc.open)talkClose()});

/* ======================= SOUND WIRING ======================= */
  var PREF='venerable-forge-music';
  function getPref(){try{return localStorage.getItem(PREF)}catch(e){return null}}
  function setPref(v){try{localStorage.setItem(PREF,v)}catch(e){}}
  var sb=$('sndBtn');
  var armed=true;
  /* Browsers only allow audio after a tap, so music starts on the first click. */
  function tapTarget(e){return e.target&&e.target.closest?e.target.closest('a,button'):null}
  function kick(e){
    if(!armed)return;
    if(e&&e.target&&e.target.closest&&e.target.closest('#sndBtn'))return;
    armed=false;
    setSound(true);
    var t=e&&tapTarget(e);
    if(t)(t.tagName==='A'?sfx.clink:sfx.blip)();
  }
  ['pointerup','touchend','keydown','mousedown'].forEach(function(n){document.addEventListener(n,kick,true)});
  /* Try to autoplay right away; if the browser refuses, stay armed for the first interaction. */
  if(armed){
    try{
      setSound(true);
      setTimeout(function(){
        if(A.ctx&&A.ctx.state==='running'){armed=false;return}
        A.on=false;
        if(A.timer){clearInterval(A.timer);A.timer=null}
        fireSoundSync();
        sb.textContent='Play music';sb.setAttribute('aria-pressed','false');A.touched=false;
      },400);
    }catch(e){}
  }
  sb.addEventListener('click',function(){
    armed=false;
    var on=!A.on;
    setSound(on);setPref(on?'on':'off');
    if(A.on)sfx.blip();
  });
  function press(t){if(!t||t.id==='sndBtn')return;if(t.tagName==='A')sfx.clink();else sfx.blip()}
  document.addEventListener('pointerdown',function(e){if(e.button>0)return;press(tapTarget(e))});
  document.addEventListener('click',function(e){if(e.detail===0)press(tapTarget(e))});

  /* ======================= INVENTORY ======================= */
  function pool(){return items.filter(function(it){return it.realm===realm})}
  function smiths(){
    var seen={},out=[];
    pool().forEach(function(it){if(!seen[it.smith]){seen[it.smith]=1;out.push(it.smith)}});
    return out.sort(function(a,b){return a.localeCompare(b)});
  }

  function render(){
    var list=smiths();
    $('nCreations').textContent=pool().length;
    $('nSmiths').textContent=list.length;

    renderGrid();
  }

  function visible(){
    return pool().filter(function(){return true;
    }).sort(function(a,b){return (b.updatedAt-a.updatedAt)||a.name.localeCompare(b.name)});
  }

  /* Category headers. Give a creation a `category` and it is grouped under that header. List names here to fix their order. */
  var CATEGORIES=[];
  function renderGrid(){
    var gd=$('grid');gd.textContent='';$('catBar').textContent='';
    if(!loaded){
      gd.appendChild(h('div',{class:'empty'},h('h2',{text:'Stoking the fire'}),h('p',{text:'The hall is quiet for a moment. Creations appear here as soon as the forge answers.'})));
      return;
    }
    if(!pool().length){
      gd.appendChild(h('div',{class:'empty'},h('h2',{text:realm==='dejavu'?'The taps are dry':'The racks are empty'}),h('p',{text:COPY[realm].empty})));
      return;
    }
    var vis=visible(),groups={},order=[],loose=[];
    vis.forEach(function(it){
      if(!it.category){loose.push(it);return}
      var k=it.category.toLowerCase();
      if(!groups[k]){groups[k]={name:it.category,items:[]};order.push(k)}
      groups[k].items.push(it);
    });
    var tabs=[];
    function head(n,id){var e=h('h2',{class:'cat-head',id:id,text:n});gd.appendChild(e);tabs.push([n,id])}
    loose.forEach(function(it){gd.appendChild(card(it))});
    order.sort(function(a,b){var ia=CATEGORIES.indexOf(groups[a].name),ib=CATEGORIES.indexOf(groups[b].name);if(ia<0)ia=999;if(ib<0)ib=999;return (ia-ib)||groups[a].name.localeCompare(groups[b].name)});
    order.forEach(function(k,n){
      head(groups[k].name,'cat-'+(n+1));
      groups[k].items.forEach(function(it){gd.appendChild(card(it))});
    });
    var cb=$('catBar');cb.textContent='';
    tabs.forEach(function(t){
      var bt=h('button',{class:'cat-tab',type:'button',text:t[0]});
      bt.addEventListener('click',function(){var el=document.getElementById(t[1]);if(el)el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'})});
      cb.appendChild(bt);
    });

  }

  $('navHome').addEventListener('click',function(){window.scrollTo({top:0,behavior:reduce?'auto':'smooth'})});
  var LANGS={javascript:['JS','js'],typescript:['TS','ts'],kotlin:['KT','kt'],html:['H5','html'],css:['CS','css'],python:['PY','py'],'c#':['C#','cs'],java:['JV','java'],go:['GO','go'],rust:['RS','rs'],php:['PH','php'],swift:['SW','swift'],multi:['**','multi']};
  function langTag(it){
    if(!it.lang)return null;
    var k=it.lang.toLowerCase(),L=LANGS[k]||[it.lang.slice(0,2).toUpperCase(),'other'];
    return h('span',{class:'lang l-'+L[1],title:'Language: '+it.lang},h('i',{text:L[0]}),h('span',{text:it.lang}));
  }
  function starBox(it){
    if(it.stars==null)return null;
    return h('span',{class:'stat',title:it.stars+' star'+(it.stars===1?'':'s')+' on GitHub'},h('em',{text:'Stars'}),h('b',{text:String(it.stars)}));
  }
  function card(it){
    var link=safeLink(it.link);
    var acts=link?h('a',{class:'btn sm visit',href:link,target:'_blank',rel:'noopener','aria-label':'Visit '+it.name},'Visit',h('i',{text:'\u2197'})):null,lt=langTag(it);
    return h('article',{class:'card','data-status':it.status,style:it.color?'--c:'+it.color:null},
      h('div',{class:'slot'},icon(it.icon||it.kind)),
      h('div',{class:'body'},
        h('div',{class:'row'},h('h3',{text:it.name}),it.stars!=null?starBox(it):h('span',{class:'badge'},h('i'),STATUS[it.status])),
        it.blurb?h('p',{class:'blurb',text:it.blurb}):null,
        (lt||acts)?h('div',{class:'cfoot'},lt||h('span'),acts):null));
  }

  applyRealm(realmFromHash());
  (async function boot(){
    var db=null;
    try{db=await (window.claude&&window.claude.use?window.claude.use('db'):null)}catch(e){db=null}
    if(!db){
      loaded=true;
      if(window.__SEED&&window.__SEED.creations){items=window.__SEED.creations.map(function(o){return norm(o)});note('')}
      else note('The hall could not be opened in this view.');
      render();
      return;
    }
    var timer=setTimeout(function(){note('The forge is slow to answer. What you see may be out of date.')},10000);
    db.collection('creations').onSnapshot(function(snap){
      if(!snap.metadata.fromCache){clearTimeout(timer);note('')}
      items=snap.docs.map(function(d){var o=d.data()||{};o.id=d.id;return norm(o)});
      loaded=true;render();
    },function(e){
      clearTimeout(timer);
      loaded=true;
      note(e&&e.code==='revoked'?'Access to this forge changed. Reopen the page to continue.':'The forge could not be reached.');
      render();
    });
  })();
})();
