/**
 * spec booth-map M1–M7: the map page that runs inside a WebView (phones) or an iframe (web). Leaflet + marker clustering,
 * pinned versions. The app sends booths/colours by message; the page sends taps back. Battery and speed (owner: "make sure
 * it won't burn the mobile"): the page loads once, pins are re-drawn only when the data or the colour mode changes,
 * clustering keeps the pin count low, nothing animates or polls while the map is idle, tiles are cached by the WebView.
 */
export type MapMsgIn =
  | { type: 'set'; pins: MapPin[]; fit: boolean; cluster?: ClusterRule | null }
  | { type: 'focus'; no: number }
  | { type: 'fit' }
  | { type: 'me'; lat: number; lng: number }
  | { type: 'pick'; on: boolean }
  | { type: 'layer'; satellite: boolean };
export type MapMsgOut = { type: 'ready' } | { type: 'tap'; no: number } | { type: 'picked'; lat: number; lng: number };
export interface MapPin { no: number; lat: number; lng: number; color: string; dark: boolean; o?: number; r?: number }
/** spec map-results M2: colour a cluster by adding up our and the main rival's votes inside it. */
export interface ClusterRule { margin: number; won: string; close: string; lost: string }

const LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist';
const CLUSTER = 'https://cdn.jsdelivr.net/npm/leaflet.markercluster@1.5.3/dist';

import { mapColors as C } from '@/design/tokens';

export function mapHtml(o: { bridge: 'rn' | 'parent'; accent: string; fitLabel: string }) {
  const send = o.bridge === 'rn'
    ? 'function send(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}'
    : 'function send(m){parent.postMessage(JSON.stringify(Object.assign({__elvoteMap:1},m)),"*")}';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${LEAFLET}/leaflet.css"><link rel="stylesheet" href="${CLUSTER}/MarkerCluster.css">
<style>
html,body,#m{margin:0;height:100%;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,sans-serif}
.pin{display:flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 4px;box-sizing:border-box;border-radius:13px;border:2px solid ${C.pinBorder};font:600 11px/1 sans-serif;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.pin.sel{transform:scale(1.25);box-shadow:0 0 0 3px ${o.accent}}
.cl{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:19px;background:${C.cluster};color:${C.pinTextDark};border:3px solid ${C.pinBorder};font:700 13px/1 sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.me{width:14px;height:14px;border-radius:7px;background:${C.me};border:3px solid ${C.pinBorder};box-shadow:0 0 0 6px rgba(26,115,232,.25)}
.pick .leaflet-container{cursor:crosshair}
</style></head><body><div id="m"></div>
<script src="${LEAFLET}/leaflet.js"></script><script src="${CLUSTER}/leaflet.markercluster.js"></script>
<script>
${send}
var map=L.map('m',{zoomControl:false,attributionControl:true,preferCanvas:true,tap:true}).setView([22.5,79],5);
var street=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© Esri, HERE, Garmin, © OpenStreetMap',keepBuffer:1,updateWhenIdle:true}).addTo(map);
var sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'© Esri',keepBuffer:1,updateWhenIdle:true});
var group=L.markerClusterGroup({showCoverageOnHover:false,spiderfyOnMaxZoom:true,disableClusteringAtZoom:16,maxClusterRadius:45,chunkedLoading:true,removeOutsideVisibleBounds:true,animate:false,
  iconCreateFunction:function(c){var bg='',fg='';if(rule){var o=0,r=0,n=0;c.getAllChildMarkers().forEach(function(mk){if(mk.__p&&mk.__p.o!=null){o+=mk.__p.o;r+=mk.__p.r;n++}});if(n){var d=o-r;bg=d>=rule.margin?rule.won:d<-rule.margin?rule.lost:rule.close;fg=d>=rule.margin||d<-rule.margin?'${C.pinTextDark}':'${C.pinTextLight}'}}
    return L.divIcon({html:'<div class="cl"'+(bg?' style="background:'+bg+';color:'+fg+'"':'')+'>'+c.getChildCount()+'</div>',className:'',iconSize:[38,38]})}});
var rule=null;
map.addLayer(group);
var byNo={},sel=null,me=null,picking=false,bounds=null;
function icon(p,s){return L.divIcon({className:'',iconSize:null,iconAnchor:[13,13],html:'<div class="pin'+(s?' sel':'')+'" style="background:'+p.color+';color:'+(p.dark?'${C.pinTextDark}':'${C.pinTextLight}')+'">'+p.no+'</div>'})}
function setPins(pins,fit){group.clearLayers();byNo={};var ms=[];
  pins.forEach(function(p){var mk=L.marker([p.lat,p.lng],{icon:icon(p,false),keyboard:false});mk.__p=p;mk.on('click',function(){select(p.no);send({type:'tap',no:p.no})});byNo[p.no]=mk;ms.push(mk)});
  group.addLayers(ms);if(pins.length){bounds=L.latLngBounds(pins.map(function(p){return[p.lat,p.lng]}));if(fit)map.fitBounds(bounds,{padding:[30,30],maxZoom:15})}}
function select(no){if(sel&&byNo[sel])byNo[sel].setIcon(icon(byNo[sel].__p,false));sel=no;if(byNo[no])byNo[no].setIcon(icon(byNo[no].__p,true))}
function onMsg(raw){var m;try{m=typeof raw==='string'?JSON.parse(raw):raw}catch(e){return}if(!m||!m.type)return;
  if(m.type==='set'){rule=m.cluster||null;setPins(m.pins,m.fit)}
  else if(m.type==='focus'&&byNo[m.no]){group.zoomToShowLayer(byNo[m.no],function(){map.setView(byNo[m.no].getLatLng(),Math.max(map.getZoom(),16));select(m.no)})}
  else if(m.type==='fit'&&bounds)map.fitBounds(bounds,{padding:[30,30],maxZoom:15});
  else if(m.type==='me'){var ll=[m.lat,m.lng];if(me)me.setLatLng(ll);else me=L.marker(ll,{icon:L.divIcon({className:'',html:'<div class="me"></div>',iconSize:[14,14]}),interactive:false}).addTo(map);map.setView(ll,Math.max(map.getZoom(),15))}
  else if(m.type==='pick'){picking=m.on;document.body.classList.toggle('pick',m.on)}
  else if(m.type==='layer'){if(m.satellite){map.removeLayer(street);sat.addTo(map)}else{map.removeLayer(sat);street.addTo(map)}}}
map.on('click',function(e){if(picking)send({type:'picked',lat:e.latlng.lat,lng:e.latlng.lng})});
document.addEventListener('message',function(e){onMsg(e.data)});window.addEventListener('message',function(e){onMsg(e.data)});
send({type:'ready'});
</script></body></html>`;
}
