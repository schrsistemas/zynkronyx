#!/usr/bin/env node
const crypto=require('node:crypto');
const scenarios=new Set(['normal','duplicate','out-of-order','delayed','offline','invalid-payload','unauthorized','retry','clock-skew']);
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,v]=x.replace(/^--/,'').split('=');return [k,v??true];}));
const profile=args.profile||'simulator', scenario=args.scenario||'normal', count=Math.min(Number(args.count||1),1000), seed=Number(args.seed||42);
if(!scenarios.has(scenario)) throw new Error('unknown scenario');
let state=seed;
function rnd(){state=(state*1664525+1013904223)>>>0;return state/4294967296;}
const events=[];
for(let i=0;i<count;i++){const id=crypto.randomUUID();events.push({event_id:scenario==='duplicate'&&i>0?events[0].event_id:id,device_id:`${profile}-001`,device_type:profile,protocol_version:1,timestamp:new Date(Date.UTC(2026,8,18,19,0,i)).toISOString(),sequence:scenario==='out-of-order'?count-i:i,payload:{value:Number((rnd()*100).toFixed(3)),scenario}});}
if(scenario==='invalid-payload') events[0].payload=undefined;
if(scenario==='offline') console.log(JSON.stringify({offline:true,queued:events.length,events},null,2)); else console.log(JSON.stringify({profile,scenario,seed,events},null,2));
