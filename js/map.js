/**
 * Leaflet Map Integration with OpenStreetMap & Nominatim Geocoding
 * Default Location: Iligan City, Philippines (8.2280, 124.2452)
 * Free mapping API with zero keys required
 */

const MapModule = (function() {
  let mainMap = null;
  let markersLayer = null;
  let markersMap = new Map(); // id -> L.marker
  let realtorPickerMap = null;
  let realtorPickerMarker = null;
  let detailMap = null;
  let detailMarker = null;

  // Iligan City default coordinates
  const ILIGAN_DEFAULT_LAT = 8.2280;
  const ILIGAN_DEFAULT_LNG = 124.2452;

  // Format price for markers in Philippine Peso (₱8.5M, ₱4.9M, ₱22k/mo)
  function formatMarkerPrice(price, listingType) {
    if (listingType === 'rent') {
      if (price >= 1000) {
        return `₱${(price / 1000).toFixed(0)}k/mo`;
      }
      return `₱${price}/mo`;
    } else {
      if (price >= 1000000) {
        return `₱${(price / 1000000).toFixed(2).replace('.00', '')}M`;
      } else if (price >= 1000) {
        return `₱${Math.round(price / 1000)}k`;
      }
      return `₱${price}`;
    }
  }

  // Initialize main listing exploration map centered on Iligan City
  function initMainMap(containerId = 'mainMap', onMarkerSelect = null) {
    if (mainMap) {
      mainMap.remove();
      mainMap = null;
    }

    // Default center over Iligan City, Philippines
    mainMap = L.map(containerId, {
      zoomControl: false,
      attributionControl: false
    }).setView([ILIGAN_DEFAULT_LAT, ILIGAN_DEFAULT_LNG], 13);

    // Add zoom controls to top-right
    L.control.zoom({ position: 'topright' }).addTo(mainMap);

    // OpenStreetMap free tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(mainMap);

    // Attribution at bottom right
    L.control.attribution({ position: 'bottomright' }).addTo(mainMap);

    markersLayer = L.layerGroup().addTo(mainMap);

    return mainMap;
  }

  // Render property markers on main map
  function updateMarkers(listings, onCardSelect) {
    if (!mainMap || !markersLayer) return;

    markersLayer.clearLayers();
    markersMap.clear();

    const bounds = [];

    listings.forEach(item => {
      if (!item.lat || !item.lng) return;

      const priceLabel = formatMarkerPrice(item.price, item.listingType);
      const isRent = item.listingType === 'rent';

      // Custom HTML Marker Pill
      const customIcon = L.divIcon({
        className: 'custom-price-marker',
        html: `<div class="marker-pill ${isRent ? 'rent' : ''}" id="marker-${item.id}">${priceLabel}</div>`,
        iconSize: [85, 30],
        iconAnchor: [42, 30],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([item.lat, item.lng], { icon: customIcon });

      // Custom Popup Card
      const popupContent = `
        <div class="overflow-hidden bg-white text-slate-900 rounded-xl cursor-pointer" onclick="window.MLSApp.openDetailModal('${item.id}')">
          <div class="relative h-28 w-full overflow-hidden bg-slate-100">
            <img src="${item.images[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'}" 
                 alt="${item.title}" 
                 class="w-full h-full object-cover transition-transform duration-300 hover:scale-105">
            <span class="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold uppercase rounded-md shadow-sm ${item.listingType === 'rent' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-white'}">
              ${item.listingType === 'rent' ? 'For Rent' : 'For Sale'}
            </span>
          </div>
          <div class="p-3">
            <div class="text-base font-bold text-slate-900 leading-tight">
              ${item.listingType === 'rent' ? `₱${item.price.toLocaleString()}/mo` : `₱${item.price.toLocaleString()}`}
            </div>
            <div class="text-xs font-semibold text-slate-800 line-clamp-1 mt-0.5">${item.title}</div>
            <div class="text-xs text-slate-500 line-clamp-1 mt-0.5">${item.address}, ${item.city}</div>
            <div class="flex items-center gap-3 text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100">
              <span><i class="fa-solid fa-bed text-slate-400 mr-1"></i>${item.beds} bds</span>
              <span><i class="fa-solid fa-bath text-slate-400 mr-1"></i>${item.baths} ba</span>
              <span><i class="fa-solid fa-ruler-combined text-slate-400 mr-1"></i>${item.sqft} sqm</span>
            </div>
            <button class="w-full mt-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition">
              View House Details
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 260 });

      marker.on('click', () => {
        highlightMarker(item.id);
        if (onCardSelect) onCardSelect(item.id);
      });

      marker.addTo(markersLayer);
      markersMap.set(item.id, marker);
      bounds.push([item.lat, item.lng]);
    });
  }

  // Highlight marker when card is hovered or clicked
  function highlightMarker(id) {
    document.querySelectorAll('.marker-pill').forEach(el => el.classList.remove('active'));
    const pill = document.getElementById(`marker-${id}`);
    if (pill) {
      pill.classList.add('active');
    }
    const marker = markersMap.get(id);
    if (marker && mainMap) {
      mainMap.panTo(marker.getLatLng(), { animate: true, duration: 0.6 });
      marker.openPopup();
    }
  }

  // Intelligent GPS Coordinate Parser
  // Supports decimal ("8.2280, 124.2452"), Google Maps formats ("8.2280,124.2452", "@8.2280,124.2452"), and DMS
  function parseCoordinates(input) {
    if (!input || typeof input !== 'string') return null;
    const str = input.trim();

    // Check for Google Maps URL or @lat,lng format
    const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Standard Decimal Degrees: "8.2280, 124.2452" or "8.2280 124.2452" or "8.2280;124.2452"
    const decMatch = str.match(/(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)/);
    if (decMatch) {
      const lat = parseFloat(decMatch[1]);
      const lng = parseFloat(decMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }

    // DMS Format: e.g. 8°13'40.8"N 124°14'42.7"E
    const dmsRegex = /([0-9.]+)[°\s]+([0-9.]+)?['\s]*([0-9.]+)?["\s]*([NSEW])/gi;
    const matches = [...str.matchAll(dmsRegex)];
    if (matches.length >= 2) {
      function dmsToDec(m) {
        const deg = parseFloat(m[1]) || 0;
        const min = parseFloat(m[2]) || 0;
        const sec = parseFloat(m[3]) || 0;
        const dir = (m[4] || '').toUpperCase();
        let dec = deg + (min / 60) + (sec / 3600);
        if (dir === 'S' || dir === 'W') dec = -dec;
        return dec;
      }
      return { lat: dmsToDec(matches[0]), lng: dmsToDec(matches[1]) };
    }

    return null;
  }

  // Free OpenStreetMap Nominatim Reverse Geocoding (GPS Lat/Lng -> Address Details)
  async function reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Reverse geocoding failed');
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        
        // Extract road, subdivision, or village/barangay
        const streetOrBarangay = addr.road || addr.subdivision || addr.neighbourhood || addr.suburb || addr.village || addr.quarter || '';
        const barangay = addr.suburb || addr.village || addr.neighbourhood || '';
        const city = addr.city || addr.municipality || addr.town || 'Iligan City';
        const province = addr.state || addr.province || addr.region || 'Lanao del Norte';
        const zip = addr.postcode || '9200';
        const displayName = data.display_name || '';

        // Formulate clean address string
        let cleanAddress = streetOrBarangay;
        if (barangay && barangay !== streetOrBarangay && !cleanAddress.toLowerCase().includes(barangay.toLowerCase())) {
          cleanAddress = cleanAddress ? `${cleanAddress}, Brgy. ${barangay}` : `Brgy. ${barangay}`;
        } else if (!cleanAddress && barangay) {
          cleanAddress = `Brgy. ${barangay}`;
        }

        return {
          address: cleanAddress || 'Iligan City Area',
          city: city,
          state: province,
          zip: zip,
          displayName: displayName,
          rawAddress: addr
        };
      }
      return null;
    } catch (err) {
      console.error('Nominatim Reverse Geocoding Error:', err);
      return null;
    }
  }

  // Free OpenStreetMap Nominatim Geocoding with Philippines context
  async function geocodeAddress(query) {
    try {
      let searchQuery = query;
      if (!searchQuery.toLowerCase().includes('philippines')) {
        searchQuery = `${searchQuery}, Philippines`;
      }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=ph&limit=1`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Geocoding request failed');
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
      }
      return null;
    } catch (err) {
      console.error('Nominatim Geocoding Error:', err);
      return null;
    }
  }

  // Search main map address/city and fly to location
  async function searchAndFlyMainMap(query) {
    if (!query || !mainMap) return false;
    const result = await geocodeAddress(query);
    if (result) {
      mainMap.flyTo([result.lat, result.lng], 14, { duration: 1.2 });
      return result;
    }
    return null;
  }

  // Realtor Add/Edit Modal: Location Picker Map (Defaults to Iligan City)
  function initRealtorPickerMap(containerId = 'realtorMapPicker', initialLat = ILIGAN_DEFAULT_LAT, initialLng = ILIGAN_DEFAULT_LNG, onLocationChange = null) {
    if (realtorPickerMap) {
      realtorPickerMap.remove();
      realtorPickerMap = null;
    }

    const mapElem = document.getElementById(containerId);
    if (!mapElem) return;

    realtorPickerMap = L.map(containerId, {
      attributionControl: false
    }).setView([initialLat, initialLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(realtorPickerMap);

    // Draggable Pin
    realtorPickerMarker = L.marker([initialLat, initialLng], {
      draggable: true
    }).addTo(realtorPickerMap);

    // When marker is dragged
    realtorPickerMarker.on('dragend', function() {
      const pos = realtorPickerMarker.getLatLng();
      if (onLocationChange) onLocationChange(pos.lat, pos.lng);
    });

    // When user clicks anywhere on the picker map
    realtorPickerMap.on('click', function(e) {
      realtorPickerMarker.setLatLng(e.latlng);
      if (onLocationChange) onLocationChange(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => {
      if (realtorPickerMap) realtorPickerMap.invalidateSize();
    }, 250);

    return realtorPickerMap;
  }

  // Update position of realtor picker marker
  function setPickerLocation(lat, lng, zoom = 15) {
    if (realtorPickerMap && realtorPickerMarker) {
      const pos = [lat, lng];
      realtorPickerMarker.setLatLng(pos);
      realtorPickerMap.setView(pos, zoom);
      setTimeout(() => realtorPickerMap.invalidateSize(), 200);
    }
  }

  // Detail Modal Mini Map
  function initDetailMiniMap(containerId = 'propertyDetailMap', lat, lng, title = 'Property Location') {
    if (detailMap) {
      detailMap.remove();
      detailMap = null;
    }

    const elem = document.getElementById(containerId);
    if (!elem) return;

    detailMap = L.map(containerId, {
      attributionControl: false,
      zoomControl: false,
      dragging: !L.Browser.mobile,
      scrollWheelZoom: false
    }).setView([lat, lng], 14);

    L.control.zoom({ position: 'topright' }).addTo(detailMap);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(detailMap);

    detailMarker = L.marker([lat, lng]).addTo(detailMap);
    detailMarker.bindPopup(`<strong class="text-xs text-slate-800">${title}</strong>`).openPopup();

    setTimeout(() => {
      if (detailMap) detailMap.invalidateSize();
    }, 300);
  }

  // Trigger leaflet recalculation when view toggles
  function refreshSize() {
    setTimeout(() => {
      if (mainMap) mainMap.invalidateSize();
    }, 200);
  }

  return {
    ILIGAN_DEFAULT_LAT,
    ILIGAN_DEFAULT_LNG,
    initMainMap,
    updateMarkers,
    highlightMarker,
    geocodeAddress,
    searchAndFlyMainMap,
    parseCoordinates,
    reverseGeocode,
    initRealtorPickerMap,
    setPickerLocation,
    initDetailMiniMap,
    refreshSize
  };
})();

window.MapModule = MapModule;
