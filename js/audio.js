// All sound is synthesized with WebAudio (no external assets)
export class Audio{
  constructor(){this.ctx=null;this.muted=false;this.listener=null;}
  start(){if(this.ctx){this.ctx.resume();return;}const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const c=this.ctx=new AC();
    this.master=c.createGain();this.master.gain.value=this.muted?0:.9;
    const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;this.master.connect(comp);comp.connect(c.destination);
    const len=c.sampleRate*3;const buf=c.createBuffer(1,len,c.sampleRate);const d=buf.getChannelData(0);let b=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b=(b+.02*w)/1.02;d[i]=w*.6+b*3;}
    this.noise=buf;
    // wind
    const wn=c.createBufferSource();wn.buffer=buf;wn.loop=true;const wf=c.createBiquadFilter();wf.type='bandpass';wf.frequency.value=500;wf.Q.value=.6;
    this.windGain=c.createGain();this.windGain.gain.value=.12;wn.connect(wf);wf.connect(this.windGain);this.windGain.connect(this.master);wn.start();
    const lfo=c.createOscillator();lfo.frequency.value=.07;const lg=c.createGain();lg.gain.value=280;lfo.connect(lg);lg.connect(wf.frequency);lfo.start();
    const lfo2=c.createOscillator();lfo2.frequency.value=.11;const lg2=c.createGain();lg2.gain.value=.05;lfo2.connect(lg2);lg2.connect(this.windGain.gain);lfo2.start();
    // drone
    this.droneGain=c.createGain();this.droneGain.gain.value=.05;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;lp.connect(this.droneGain);this.droneGain.connect(this.master);
    for(const [f,g] of [[55,.5],[82.41,.35],[110.3,.25],[164.8,.12],[54.6,.4]]){const o=c.createOscillator();o.type=f>100?'triangle':'sine';o.frequency.value=f;const og=c.createGain();og.gain.value=g;o.connect(og);og.connect(lp);o.start();
      const t=c.createOscillator();t.frequency.value=.05+Math.random()*.1;const tg=c.createGain();tg.gain.value=g*.4;t.connect(tg);tg.connect(og.gain);t.start();}
  }
  setMuted(m){this.muted=m;if(this.master)this.master.gain.setTargetAtTime(m?0:.9,this.ctx.currentTime,.05);}
  setAmbience(night,distToGiants){if(!this.ctx)return;const t=this.ctx.currentTime;this.windGain.gain.setTargetAtTime(.1+(1-night)*.04,t,1);this.droneGain.gain.setTargetAtTime(.035+night*.03+Math.max(0,1-distToGiants/1500)*.06,t,1);}
  burst({dur=.1,freq=800,type='lowpass',q=1,gain=.3,delay=0,attack=.005,decay}){const c=this.ctx;const s=c.createBufferSource();s.buffer=this.noise;const f=c.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;
    const g=c.createGain();const t0=c.currentTime+delay;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain,t0+attack);g.gain.exponentialRampToValueAtTime(.0001,t0+(decay||dur));
    s.connect(f);f.connect(g);g.connect(this.master);s.start(t0,Math.random()*2);s.stop(t0+(decay||dur)+.1);return f;}
  step(intensity=.5,pos,wet){if(!this.ctx||this.muted)return;if(wet)this.burst({dur:.18,freq:1400,type:'bandpass',q:.8,gain:.12*intensity+.05});
    else this.burst({dur:.09,freq:500+Math.random()*300,type:'lowpass',q:1.5,gain:.10+.12*intensity});}
  jump(){if(!this.ctx||this.muted)return;this.burst({dur:.12,freq:900,type:'bandpass',gain:.06});}
  impact(dist){if(!this.ctx)return;const c=this.ctx;const att=1/(1+dist/450);const delay=Math.min(3.5,dist/500);const t0=c.currentTime+delay;
    const o=c.createOscillator();o.type='sine';o.frequency.setValueAtTime(70,t0);o.frequency.exponentialRampToValueAtTime(24,t0+1.6);
    const g=c.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(1.0*att+.08,t0+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+2.4);o.connect(g);g.connect(this.master);o.start(t0);o.stop(t0+2.5);
    this.burst({dur:3.5,freq:160,type:'lowpass',q:.7,gain:.9*att+.06,delay,attack:.03,decay:4});
    if(dist<900)this.burst({dur:.6,freq:2500,type:'bandpass',q:.5,gain:.35*att,delay});
    return delay;}
  whoosh(dist){if(!this.ctx)return;const f=this.burst({dur:2,freq:300,type:'bandpass',q:2,gain:.06+.12/(1+dist/800),attack:1.4,decay:2.2});f.frequency.linearRampToValueAtTime(1400,this.ctx.currentTime+1.8);}
  roar(dist,delay=0){if(!this.ctx)return;const c=this.ctx;const att=1/(1+dist/500);const t0=c.currentTime+delay+.35;const out=c.createGain();
    out.gain.setValueAtTime(0,t0);out.gain.linearRampToValueAtTime(.55*att+.03,t0+.5);out.gain.setValueAtTime(.5*att+.03,t0+1.6);out.gain.exponentialRampToValueAtTime(.0001,t0+3.6);
    const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900-Math.min(600,dist*.3);out.connect(lp);lp.connect(this.master);
    for(const [f,ty] of [[48,'sawtooth'],[71,'sawtooth'],[96,'square']]){const o=c.createOscillator();o.type=ty;o.frequency.setValueAtTime(f*1.2,t0);o.frequency.linearRampToValueAtTime(f,t0+2.5);
      const v=c.createOscillator();v.frequency.value=7+Math.random()*4;const vg=c.createGain();vg.gain.value=f*.08;v.connect(vg);vg.connect(o.frequency);
      const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=f*4;bp.Q.value=1.2;const og=c.createGain();og.gain.value=.35;o.connect(bp);bp.connect(og);og.connect(out);o.start(t0);o.stop(t0+3.8);v.start(t0);v.stop(t0+3.8);}
    const s=c.createBufferSource();s.buffer=this.noise;const nf=c.createBiquadFilter();nf.type='bandpass';nf.frequency.value=380;nf.Q.value=.8;s.connect(nf);nf.connect(out);s.start(t0);s.stop(t0+3.8);}
  chime(){if(!this.ctx||this.muted)return;const c=this.ctx;for(const [f,d] of [[659,0],[988,.12],[1319,.24]]){const o=c.createOscillator();o.type='sine';o.frequency.value=f;const g=c.createGain();const t0=c.currentTime+d;
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.12,t0+.01);g.gain.exponentialRampToValueAtTime(.0001,t0+1.6);o.connect(g);g.connect(this.master);o.start(t0);o.stop(t0+1.7);}}
  blip(){if(!this.ctx||this.muted)return;const c=this.ctx;const o=c.createOscillator();o.frequency.value=520;const g=c.createGain();const t0=c.currentTime;g.gain.setValueAtTime(.05,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+.12);o.connect(g);g.connect(this.master);o.start();o.stop(t0+.15);}
}
