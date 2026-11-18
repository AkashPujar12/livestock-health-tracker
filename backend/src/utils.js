// Returns a GeoJSON point or undefined if lat/lng are not valid numbers
exports.validLoc = (lat, lng) => {
  const la = Number(lat), ln = Number(lng);
  if (lat === undefined || lat === null || lat === '' || lng === undefined || lng === null || lng === '') return undefined;
  if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return undefined;
  return { type: 'Point', coordinates: [ln, la] };
};
exports.within = (coords, km) => ({ $geoWithin: { $centerSphere: [coords, km / 6378.1] } });
exports.haversineKm = ([lng1, lat1], [lng2, lat2]) => {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};
