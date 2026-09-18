import { useEffect, useRef } from "react";

export default function RadarMap({ devices, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      if (instanceRef.current) instanceRef.current.remove();

      const map = L.map(mapRef.current, { worldCopyJump:true, zoomControl:true }).setView(
        [Number(devices[0]?.LAST_LATITUDE || 0), Number(devices[0]?.LAST_LONGITUDE || 0)], devices.length === 1 ? 13 : 3
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap contributors",
        maxZoom:19
      }).addTo(map);

      const bounds=[];
      devices.forEach(device => {
        const lat=Number(device.LAST_LATITUDE), lon=Number(device.LAST_LONGITUDE);
        if(!Number.isFinite(lat)||!Number.isFinite(lon)) return;
        bounds.push([lat,lon]);
        const marker=L.circleMarker([lat,lon], {
          radius: selectedId===device.DEVICE_ID ? 10 : 7,
          weight:2,
          fillOpacity:.8
        }).addTo(map);
        marker.bindPopup(
          "<strong>"+escapeHtml(device.DEVICE_ID)+"</strong><br/>"+
          escapeHtml(device.DEVICE_TYPE||"device")+"<br/>"+
          "Último sinal: "+escapeHtml(device.LAST_SEEN||"—")+"<br/>"+
          "Localização: "+escapeHtml(device.LOCATION_UPDATED_AT||"—")
        );
        marker.on("click",()=>onSelect(device));
      });
      if(bounds.length>1) map.fitBounds(bounds,{padding:[30,30],maxZoom:14});
      instanceRef.current=map;
    }
    init();
    return ()=>{cancelled=true;if(instanceRef.current){instanceRef.current.remove();instanceRef.current=null;}};
  }, [devices,selectedId,onSelect]);

  return <div className="radarMap leafletMap" ref={mapRef}/>;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch]));
}
