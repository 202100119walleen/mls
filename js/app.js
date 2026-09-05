/**
 * MLS Real Estate Platform - Main Application Logic (Iligan City, Philippines)
 * Buyer/Renter Search & Filtering, Property Details, Realtor Admin Portal & Editing
 */

const MLSApp = (function() {
  // State
  const REALTOR_PASSCODE = 'admin010211';
  let isRealtorAuthenticated = (sessionStorage.getItem('realtor_logged_in') === 'true');
  let listings = [];
  let filteredListings = [];
  let currentDetailListing = null;
  let isRealtorMode = false;
  let viewMode = 'split'; // 'split', 'grid', 'map'
  let savedListingIds = new Set();
  
  // Inquiries & Leads State
  let inquiries = [];
  let knownInquiryIds = new Set();
  let activeInquiryFilter = 'all'; // 'all' | 'new' | 'contacted' | 'closed'
  let inquirySearchQuery = '';
  let isInitialInquirySync = true;
  
  // Current Realtor Editor Form State (Defaults to Iligan City)
  let editingId = null;
  let editorImages = [];
  let editorLat = 8.2280;
  let editorLng = 124.2452;

  // Active public filters
  const filters = {
    searchQuery: '',
    listingType: 'all', // 'all', 'sale', 'rent'
    minPrice: null,
    maxPrice: null,
    beds: 'any',
    baths: 'any',
    propertyType: 'all',
    amenities: [],
    sortBy: 'newest'
  };

  // Initialize Application
  function init() {
    loadSavedFavorites();
    loadData();
    loadInquiries();
    setupEventListeners();
    initMap();
    applyFilters();
    updateRealtorStats();
    updateInquiryBadges();
  }

  function loadInquiries() {
    inquiries = MLSStore.getInquiries();
    inquiries.forEach(i => knownInquiryIds.add(i.id));
  }

  // Load favorites from localStorage
  function loadSavedFavorites() {
    try {
      const saved = localStorage.getItem('mls_favorites_iligan');
      if (saved) {
        savedListingIds = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  }

  function toggleFavorite(id, event) {
    if (event) event.stopPropagation();
    if (savedListingIds.has(id)) {
      savedListingIds.delete(id);
      showToast('Removed from saved homes', 'info');
    } else {
      savedListingIds.add(id);
      showToast('Added to saved homes!', 'success');
    }
    localStorage.setItem('mls_favorites_iligan', JSON.stringify([...savedListingIds]));
    renderListings();
  }

  // Load listings from store
  function loadData() {
    listings = MLSStore.getListings();
  }

  // Initialize the main Leaflet map centered on Iligan City
  function initMap() {
    MapModule.initMainMap('mainMap', (selectedId) => {
      scrollToListingCard(selectedId);
    });
  }

  // Filter listings based on current state
  function applyFilters() {
    filteredListings = listings.filter(item => {
      // 1. Search Query (Title, address, city, barangay, zip)
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesAddress = (item.address || '').toLowerCase().includes(query);
        const matchesCity = (item.city || '').toLowerCase().includes(query);
        const matchesTitle = (item.title || '').toLowerCase().includes(query);
        const matchesZip = (item.zip || '').includes(query);
        const matchesType = (item.type || '').toLowerCase().includes(query);
        if (!matchesAddress && !matchesCity && !matchesTitle && !matchesZip && !matchesType) {
          return false;
        }
      }

      // 2. Listing Type (Sale vs Rent)
      if (filters.listingType !== 'all') {
        if (item.listingType !== filters.listingType) return false;
      }

      // 3. Price Range (in PHP)
      if (filters.minPrice !== null && item.price < filters.minPrice) return false;
      if (filters.maxPrice !== null && item.price > filters.maxPrice) return false;

      // 4. Bedrooms
      if (filters.beds !== 'any') {
        const minBeds = parseInt(filters.beds, 10);
        if (item.beds < minBeds) return false;
      }

      // 5. Bathrooms
      if (filters.baths !== 'any') {
        const minBaths = parseFloat(filters.baths);
        if (item.baths < minBaths) return false;
      }

      // 6. Property Type
      if (filters.propertyType !== 'all') {
        if (item.type !== filters.propertyType) return false;
      }

      // 7. Amenities
      if (filters.amenities.length > 0) {
        const hasAllAmenities = filters.amenities.every(amenity => 
          (item.amenities || []).includes(amenity)
        );
        if (!hasAllAmenities) return false;
      }

      return true;
    });

    sortListings();
    renderListings();
    MapModule.updateMarkers(filteredListings, (id) => {
      scrollToListingCard(id);
    });
    updateResultCount();
  }

  function sortListings() {
    switch (filters.sortBy) {
      case 'price-asc':
        filteredListings.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredListings.sort((a, b) => b.price - a.price);
        break;
      case 'beds':
        filteredListings.sort((a, b) => b.beds - a.beds);
        break;
      case 'sqft':
        filteredListings.sort((a, b) => b.sqft - a.sqft);
        break;
      case 'newest':
      default:
        filteredListings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
    }
  }

  function updateResultCount() {
    const countEl = document.getElementById('resultsCount');
    if (countEl) {
      countEl.innerText = `${filteredListings.length} ${filteredListings.length === 1 ? 'Property' : 'Properties'} in Iligan City`;
    }
  }

  function scrollToListingCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-2', 'ring-blue-600', 'bg-blue-50/40');
      setTimeout(() => {
        card.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50/40');
      }, 1800);
    }
  }

  // Render property cards with Philippine Peso (₱) and sqm
  function renderListings() {
    const container = document.getElementById('propertyGrid');
    if (!container) return;

    // 1. Database has zero listings (clean start)
    if (listings.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            <i class="fa-solid fa-house-chimney-medical"></i>
          </div>
          <h3 class="text-xl font-extrabold text-slate-900 mb-2">No Properties in Database Yet</h3>
          <p class="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            All static and sample data have been deleted. Your Iligan City MLS is connected to Firebase Cloud Firestore and ready to publish your real properties!
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onclick="MLSApp.openAddModal()" class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
              <i class="fa-solid fa-plus"></i> Add First Property
            </button>
            <button onclick="MLSApp.promptRealtorLogin()" class="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
              <i class="fa-solid fa-user-tie text-blue-600"></i> Open Realtor Portal
            </button>
          </div>
        </div>
      `;
      return;
    }

    // 2. Filter criteria matched zero properties
    if (filteredListings.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            <i class="fa-solid fa-filter-circle-xmark"></i>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">No matching properties found</h3>
          <p class="text-sm text-slate-500 max-w-md mx-auto mb-5">
            Try adjusting your search filters or explore other barangays across Iligan City on the map.
          </p>
          <button onclick="MLSApp.resetFilters()" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition">
            Reset Filters
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredListings.map(item => {
      const isFavorite = savedListingIds.has(item.id);
      const isRent = item.listingType === 'rent';
      const formattedPrice = isRent 
        ? `₱${item.price.toLocaleString()}<span class="text-sm font-normal text-slate-500">/mo</span>` 
        : `₱${item.price.toLocaleString()}`;

      const primaryImg = item.images && item.images.length > 0 
        ? item.images[0] 
        : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';

      return `
        <div id="card-${item.id}" 
             class="property-card group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
             onmouseenter="MapModule.highlightMarker('${item.id}')"
             onclick="MLSApp.openDetailModal('${item.id}')">
          
          <!-- Image Banner -->
          <div class="relative h-56 w-full overflow-hidden bg-slate-100">
            <img src="${primaryImg}" 
                 alt="${item.title}" 
                 loading="lazy" 
                 class="card-img w-full h-full object-cover">
            
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20"></div>

            <!-- Top Badges -->
            <div class="absolute top-3 left-3 flex gap-2">
              <span class="px-3 py-1 text-xs font-extrabold uppercase rounded-full shadow-md tracking-wider ${isRent ? 'bg-sky-600 text-white' : 'bg-slate-950 text-white'}">
                ${isRent ? 'For Rent' : 'For Sale'}
              </span>
              ${item.featured ? '<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500 text-white shadow-md flex items-center gap-1"><i class="fa-solid fa-star text-[10px]"></i> Featured</span>' : ''}
            </div>

            <!-- Favorite Button -->
            <button onclick="MLSApp.toggleFavorite('${item.id}', event)" 
                    class="absolute top-3 right-3 w-9 h-9 rounded-full glass-pill flex items-center justify-center text-slate-700 hover:text-rose-600 transition shadow hover:scale-110">
              <i class="${isFavorite ? 'fa-solid fa-heart text-rose-600' : 'fa-regular fa-heart'} text-base"></i>
            </button>

            <!-- Price in image corner for quick scanning -->
            <div class="absolute bottom-3 left-3 text-white drop-shadow-md">
              <div class="text-2xl font-black">${formattedPrice}</div>
            </div>

            <!-- Photos Count -->
            <div class="absolute bottom-3 right-3 px-2 py-1 rounded-md glass-pill text-xs font-semibold text-slate-800 flex items-center gap-1 shadow">
              <i class="fa-regular fa-image"></i> ${item.images ? item.images.length : 1}
            </div>
          </div>

          <!-- Card Content -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  ${item.type}
                </span>
                <span class="text-xs font-mono text-slate-400 font-medium">${item.id}</span>
              </div>
              
              <h4 class="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition line-clamp-1 mb-1">
                ${item.title}
              </h4>
              
              <p class="text-xs text-slate-500 line-clamp-1 flex items-center gap-1 mb-3">
                <i class="fa-solid fa-location-dot text-slate-400"></i> ${item.address}, ${item.city}
              </p>

              <!-- Specs Grid (in SQM) -->
              <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-slate-700 text-xs font-semibold">
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-bed text-blue-500"></i>
                  <span>${item.beds} <span class="text-slate-400 font-normal">Beds</span></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-bath text-blue-500"></i>
                  <span>${item.baths} <span class="text-slate-400 font-normal">Baths</span></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <i class="fa-solid fa-ruler-combined text-blue-500"></i>
                  <span>${item.sqft} <span class="text-slate-400 font-normal">sqm</span></span>
                </div>
              </div>
            </div>

            <!-- Realtor Info & Actions -->
            <div class="mt-4 pt-3 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <img src="${item.realtor ? item.realtor.avatar : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=128&q=80'}" 
                     class="w-7 h-7 rounded-full object-cover border border-slate-200">
                <span class="text-xs font-medium text-slate-600 truncate max-w-[130px]">
                  ${item.realtor ? item.realtor.name : 'Engr. Alex Vance, REB'}
                </span>
              </div>

              <!-- Realtor Action Buttons if Admin Mode is active -->
              ${isRealtorMode ? `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                  <button onclick="MLSApp.openEditModal('${item.id}')" 
                          class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                  </button>
                  <button onclick="MLSApp.confirmDeleteListing('${item.id}')" 
                          class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              ` : `
                <div class="flex items-center gap-1.5" onclick="event.stopPropagation()">
                  <button onclick="MLSApp.initiateCall('${item.realtor ? item.realtor.phone : '+63 917 555 2890'}', '${item.realtor ? item.realtor.name.replace(/'/g, "\\'") : 'Broker Alex Vance'}', '${item.title.replace(/'/g, "\\'")}', 'Listing Broker')" 
                          class="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition shadow-2xs"
                          title="Call Broker">
                    <i class="fa-solid fa-phone text-xs"></i>
                  </button>
                  <button onclick="MLSApp.initiateEmail('${item.realtor ? item.realtor.email : 'broker@iliganmls.ph'}', '${item.realtor ? item.realtor.name.replace(/'/g, "\\'") : 'Broker Alex Vance'}', '${item.title.replace(/'/g, "\\'")}', '${item.id}')" 
                          class="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white flex items-center justify-center transition shadow-2xs"
                          title="Email Broker">
                    <i class="fa-solid fa-envelope text-xs"></i>
                  </button>
                  <button onclick="MLSApp.openDetailModal('${item.id}')" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 ml-1">
                    Details <i class="fa-solid fa-arrow-right text-[10px] transition-transform group-hover:translate-x-0.5"></i>
                  </button>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Open Property Detail Modal
  function openDetailModal(id) {
    const listing = listings.find(item => item.id === id);
    if (!listing) return;
    currentDetailListing = listing;

    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailModalContent');
    if (!modal || !content) return;

    const isRent = listing.listingType === 'rent';
    const formattedPrice = isRent 
      ? `₱${listing.price.toLocaleString()}<span class="text-base font-normal text-slate-500">/mo</span>` 
      : `₱${listing.price.toLocaleString()}`;

    const isFav = savedListingIds.has(listing.id);

    const images = listing.images && listing.images.length > 0 
      ? listing.images 
      : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'];

    const thumbnailsHtml = images.map((imgUrl, idx) => `
      <button onclick="MLSApp.switchDetailImage('${imgUrl}')" 
              class="h-16 w-24 rounded-lg overflow-hidden border-2 transition hover:opacity-100 flex-shrink-0 ${idx === 0 ? 'border-blue-600 opacity-100' : 'border-transparent opacity-70'}">
        <img src="${imgUrl}" class="w-full h-full object-cover">
      </button>
    `).join('');

    const amenitiesHtml = (listing.amenities || []).map(am => `
      <span class="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5">
        <i class="fa-solid fa-check text-blue-600"></i> ${am}
      </span>
    `).join('');

    content.innerHTML = `
      <div class="relative bg-white rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col animate-modal">
        
        <!-- Header Bar -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 text-xs font-extrabold uppercase rounded-full tracking-wider ${isRent ? 'bg-sky-600 text-white' : 'bg-slate-900 text-white'}">
              ${isRent ? 'For Rent' : 'For Sale'}
            </span>
            <span class="text-xs font-mono text-slate-400">${listing.id}</span>
            <span class="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Iligan City MLS
            </span>
          </div>

          <div class="flex items-center gap-2">
            ${isRealtorMode ? `
              <button onclick="MLSApp.openEditModal('${listing.id}')" 
                      class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <i class="fa-solid fa-pen-to-square"></i> Edit Info
              </button>
            ` : ''}

            <button onclick="MLSApp.toggleFavorite('${listing.id}')" 
                    class="w-9 h-9 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition">
              <i class="${isFav ? 'fa-solid fa-heart text-rose-600' : 'fa-regular fa-heart'}"></i>
            </button>
            <button onclick="MLSApp.closeDetailModal()" 
                    class="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="overflow-y-auto p-6 space-y-6 flex-1">
          
          <!-- Main Hero Gallery -->
          <div>
            <div class="relative rounded-2xl overflow-hidden bg-slate-950 hero-gallery-main mb-3 shadow-inner">
              <img id="detailHeroImage" 
                   src="${images[0]}" 
                   class="w-full h-full object-cover transition-opacity duration-300">
            </div>
            <div class="flex gap-2 overflow-x-auto pb-2">
              ${thumbnailsHtml}
            </div>
          </div>

          <!-- Price & Title Section -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div class="text-3xl font-black text-slate-900">${formattedPrice}</div>
              <h2 class="text-xl font-bold text-slate-800 mt-1">${listing.title}</h2>
              <p class="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <i class="fa-solid fa-location-dot text-blue-600"></i> ${listing.address}, ${listing.city}, Philippines
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="MLSApp.openTourModal('${listing.id}')" 
                      class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center gap-2">
                <i class="fa-regular fa-calendar-check"></i> Schedule Site Viewing
              </button>
            </div>
          </div>

          <!-- Core Key Specs (SQM) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span class="text-xs text-slate-400 font-semibold uppercase">Bedrooms</span>
              <div class="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <i class="fa-solid fa-bed text-blue-500"></i> ${listing.beds}
              </div>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span class="text-xs text-slate-400 font-semibold uppercase">Bathrooms</span>
              <div class="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <i class="fa-solid fa-bath text-blue-500"></i> ${listing.baths}
              </div>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span class="text-xs text-slate-400 font-semibold uppercase">Floor Area</span>
              <div class="text-xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <i class="fa-solid fa-ruler-combined text-blue-500"></i> ${listing.sqft} sqm
              </div>
            </div>
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <span class="text-xs text-slate-400 font-semibold uppercase">Property Type</span>
              <div class="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                <i class="fa-solid fa-building text-blue-500"></i> ${listing.type}
              </div>
            </div>
          </div>

          <!-- Description -->
          <div>
            <h4 class="text-base font-bold text-slate-900 mb-2">About this Property</h4>
            <p class="text-sm text-slate-600 leading-relaxed">
              ${listing.description || 'No description available for this property.'}
            </p>
          </div>

          <!-- Key Features & Amenities -->
          <div>
            <h4 class="text-base font-bold text-slate-900 mb-3">Amenities & Features</h4>
            <div class="flex flex-wrap gap-2">
              ${amenitiesHtml}
            </div>
          </div>

          <!-- Additional Property Specifications -->
          <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <h4 class="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Property Details</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-xs">
              <div>
                <span class="text-slate-400">Year Built:</span>
                <span class="font-bold text-slate-800 ml-1">${listing.yearBuilt || '2023'}</span>
              </div>
              <div>
                <span class="text-slate-400">Lot Area:</span>
                <span class="font-bold text-slate-800 ml-1">${listing.lotSize || 'N/A'}</span>
              </div>
              <div>
                <span class="text-slate-400">Subdivision Dues:</span>
                <span class="font-bold text-slate-800 ml-1">${listing.hoa ? `₱${listing.hoa.toLocaleString()}/mo` : 'None'}</span>
              </div>
              <div>
                <span class="text-slate-400">MLS ID:</span>
                <span class="font-mono font-bold text-slate-800 ml-1">${listing.id}</span>
              </div>
              <div>
                <span class="text-slate-400">Price/sqm:</span>
                <span class="font-bold text-slate-800 ml-1">${listing.sqft ? `₱${Math.round(listing.price / listing.sqft).toLocaleString()}` : 'N/A'}</span>
              </div>
              <div>
                <span class="text-slate-400">Status:</span>
                <span class="font-bold text-emerald-600 ml-1 uppercase">${listing.status || 'Active'}</span>
              </div>
            </div>
          </div>

          <!-- Interactive Location Map (Iligan City) -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-base font-bold text-slate-900">Map & Barangay Location</h4>
              <span class="text-xs text-slate-500 font-mono">${listing.lat.toFixed(4)}, ${listing.lng.toFixed(4)} (Iligan City)</span>
            </div>
            <div id="propertyDetailMap" class="shadow-inner border border-slate-200"></div>
          </div>

          <!-- Philippine Bank / Pag-IBIG Loan Estimator -->
          ${!isRent ? `
            <div class="bg-gradient-to-r from-blue-50/80 to-indigo-50/50 rounded-2xl p-5 border border-blue-200/80 shadow-sm">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h4 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <i class="fa-solid fa-calculator text-blue-600"></i> Philippine Bank / Pag-IBIG Loan & Interest Estimator
                  </h4>
                  <span class="text-[11px] text-slate-500">Live amortization for ${listing.title}</span>
                </div>
                <div class="text-left sm:text-right">
                  <span class="text-[10px] text-slate-500 uppercase font-semibold block">Est. Monthly Amortization:</span>
                  <div id="calcEstimatedMonthly" class="text-2xl font-black text-blue-600 font-mono">₱0/mo</div>
                </div>
              </div>

              <!-- Input Controls -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div>
                  <label class="font-semibold text-slate-700 block mb-1">Down Payment (%)</label>
                  <input type="number" id="calcDownPayment" value="20" min="5" max="50" step="5" class="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 font-mono" oninput="MLSApp.recalculateMortgage()">
                </div>
                <div>
                  <label class="font-semibold text-slate-700 block mb-1">Interest Rate (% p.a.)</label>
                  <input type="number" id="calcInterestRate" value="7.0" step="0.25" min="4" max="15" class="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 font-mono" oninput="MLSApp.recalculateMortgage()">
                </div>
                <div>
                  <label class="font-semibold text-slate-700 block mb-1">Loan Tenure</label>
                  <select id="calcLoanTerm" class="w-full px-3 py-2 bg-white rounded-lg border border-slate-200" onchange="MLSApp.recalculateMortgage()">
                    <option value="30">30 Years (Pag-IBIG Loan)</option>
                    <option value="20" selected>20 Years (Bank Loan)</option>
                    <option value="15">15 Years (Bank Loan)</option>
                    <option value="10">10 Years (Short Term)</option>
                  </select>
                </div>
              </div>

              <!-- Metrics Breakdown Row -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-3 border-t border-blue-100">
                <div class="bg-white p-2 rounded-xl border border-blue-100">
                  <span class="text-[10px] text-slate-400 uppercase block">Down Payment</span>
                  <strong id="detailCalcDownAmount" class="text-slate-800 font-mono text-xs">₱0</strong>
                </div>
                <div class="bg-white p-2 rounded-xl border border-blue-100">
                  <span class="text-[10px] text-slate-400 uppercase block">Loan Amount</span>
                  <strong id="detailCalcLoanAmount" class="text-blue-700 font-mono text-xs">₱0</strong>
                </div>
                <div class="bg-white p-2 rounded-xl border border-blue-100">
                  <span class="text-[10px] text-slate-400 uppercase block">Total Interest</span>
                  <strong id="detailCalcTotalInterest" class="text-amber-600 font-mono text-xs">₱0</strong>
                </div>
                <div class="bg-white p-2 rounded-xl border border-blue-100">
                  <span class="text-[10px] text-slate-400 uppercase block">Req. Monthly Income</span>
                  <strong id="detailCalcReqIncome" class="text-emerald-700 font-mono text-xs">₱0/mo</strong>
                </div>
              </div>

              <!-- Open Full Calculator Button -->
              <div class="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-xs">
                <span class="text-slate-500 text-[11px]">Want to customize or compare terms?</span>
                <button type="button" onclick="MLSApp.openCalculatorModal(${listing.price})" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-sm">
                  <i class="fa-solid fa-calculator"></i> Full Interest & Loan Calculator
                </button>
              </div>

            </div>
          ` : ''}

          <!-- Realtor Contact Card -->
          <div class="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl">
            <div class="flex items-center gap-3">
              <img src="${listing.realtor ? listing.realtor.avatar : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=128&q=80'}" 
                   class="w-12 h-12 rounded-full object-cover border-2 border-slate-700">
              <div>
                <div class="text-sm font-bold">${listing.realtor ? listing.realtor.name : 'Engr. Alex Vance, REB'}</div>
                <div class="text-xs text-slate-400">${listing.realtor ? listing.realtor.agency : 'Iligan Premier Realty & Associates'}</div>
                <div class="text-xs text-amber-400 font-medium">${listing.realtor ? (listing.realtor.prcNo || 'Licensed Real Estate Broker') : 'Licensed Real Estate Broker'}</div>
                <div class="text-xs text-blue-400 font-mono mt-0.5">${listing.realtor ? listing.realtor.phone : '+63 917 555 2890'}</div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="MLSApp.initiateCall('${listing.realtor ? listing.realtor.phone : '+63 917 555 2890'}', '${listing.realtor ? listing.realtor.name.replace(/'/g, "\\'") : 'Engr. Alex Vance'}', '${listing.title.replace(/'/g, "\\'")}', 'Realtor Broker')" 
                      class="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-phone"></i> Call Broker
              </button>
              <button onclick="MLSApp.initiateEmail('${listing.realtor ? listing.realtor.email : 'broker@iliganmls.ph'}', '${listing.realtor ? listing.realtor.name.replace(/'/g, "\\'") : 'Engr. Alex Vance'}', '${listing.title.replace(/'/g, "\\'")}', '${listing.id}')" 
                      class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-envelope"></i> Email
              </button>
              <button onclick="MLSApp.openTourModal('${listing.id}')" 
                      class="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                <i class="fa-regular fa-calendar-check"></i> Inquire Now
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Initialize the detail mini map
    setTimeout(() => {
      MapModule.initDetailMiniMap('propertyDetailMap', listing.lat, listing.lng, listing.title);
      if (!isRent) recalculateMortgage();
    }, 100);
  }

  function switchDetailImage(src) {
    const heroImg = document.getElementById('detailHeroImage');
    if (heroImg) {
      heroImg.style.opacity = '0.3';
      setTimeout(() => {
        heroImg.src = src;
        heroImg.style.opacity = '1';
      }, 150);
    }
  }

  // Philippine Peso Monthly Amortization Calculation
  function recalculateMortgage() {
    if (!currentDetailListing || currentDetailListing.listingType === 'rent') return;
    const price = currentDetailListing.price;
    const downPaymentPercent = parseFloat(document.getElementById('calcDownPayment')?.value || 20);
    const annualInterestRate = parseFloat(document.getElementById('calcInterestRate')?.value || 7.0);
    const loanYears = parseInt(document.getElementById('calcLoanTerm')?.value || 20, 10);

    const downPayment = Math.round((downPaymentPercent / 100) * price);
    const principal = Math.max(0, price - downPayment);
    const metrics = computeLoanMetrics(principal, annualInterestRate, loanYears);

    const hoa = currentDetailListing.hoa || 0;
    const totalMonthly = Math.round(metrics.monthly + hoa);

    const calcEl = document.getElementById('calcEstimatedMonthly');
    if (calcEl) {
      calcEl.innerText = `₱${totalMonthly.toLocaleString()}/mo`;
    }

    const downEl = document.getElementById('detailCalcDownAmount');
    if (downEl) {
      downEl.innerText = `₱${downPayment.toLocaleString()} (${downPaymentPercent}%)`;
    }

    const loanEl = document.getElementById('detailCalcLoanAmount');
    if (loanEl) {
      loanEl.innerText = `₱${principal.toLocaleString()}`;
    }

    const interestEl = document.getElementById('detailCalcTotalInterest');
    if (interestEl) {
      interestEl.innerText = `₱${metrics.totalInterest.toLocaleString()}`;
    }

    const reqIncEl = document.getElementById('detailCalcReqIncome');
    if (reqIncEl) {
      reqIncEl.innerText = `₱${metrics.requiredIncome.toLocaleString()}/mo`;
    }
  }

  function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    currentDetailListing = null;
  }

  // ==========================================
  // COMPREHENSIVE INTEREST & LOAN ESTIMATOR
  // ==========================================
  
  // Calculate Standard Philippine Amortization
  function computeLoanMetrics(principal, annualRatePercent, years) {
    if (principal <= 0) return { monthly: 0, totalInterest: 0, totalPayment: 0, requiredIncome: 0 };
    const monthlyRate = (annualRatePercent / 100) / 12;
    const numPayments = years * 12;
    
    let monthly = 0;
    if (monthlyRate > 0) {
      monthly = (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      monthly = principal / numPayments;
    }

    const totalPayment = monthly * numPayments;
    const totalInterest = Math.max(0, totalPayment - principal);
    // Standard Philippine Bank rule: Monthly amortization should not exceed 35% of gross monthly income
    const requiredIncome = monthly / 0.35;

    return {
      monthly: Math.round(monthly),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      requiredIncome: Math.round(requiredIncome),
      principal: Math.round(principal),
      numPayments
    };
  }

  // Live Interest Estimator in Realtor Add/Edit Modal
  function updateRealtorPriceEstimator() {
    const priceInput = document.getElementById('editPrice');
    const typeSelect = document.getElementById('editListingType');
    const container = document.getElementById('realtorLoanEstimatorCard');
    if (!priceInput || !container) return;

    const isRent = typeSelect && typeSelect.value === 'rent';
    if (isRent) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    const price = parseFloat(priceInput.value) || 0;
    if (price <= 0) {
      container.classList.add('hidden');
      return;
    }

    const downPercent = parseFloat(document.getElementById('realtorDownPercent')?.value || 20);
    const ratePercent = parseFloat(document.getElementById('realtorInterestRate')?.value || 7.0);
    const years = parseInt(document.getElementById('realtorLoanTerm')?.value || 20, 10);

    const downAmount = Math.round((downPercent / 100) * price);
    const principal = price - downAmount;
    const metrics = computeLoanMetrics(principal, ratePercent, years);

    // Update readouts in the Realtor form
    const downEl = document.getElementById('realtorDownAmountReadout');
    const loanableEl = document.getElementById('realtorLoanableReadout');
    const monthlyEl = document.getElementById('realtorMonthlyAmortReadout');
    const interestEl = document.getElementById('realtorTotalInterestReadout');
    const incomeEl = document.getElementById('realtorRequiredIncomeReadout');

    if (downEl) downEl.innerText = `₱${downAmount.toLocaleString()} (${downPercent}%)`;
    if (loanableEl) loanableEl.innerText = `₱${principal.toLocaleString()}`;
    if (monthlyEl) monthlyEl.innerText = `₱${metrics.monthly.toLocaleString()}/mo`;
    if (interestEl) interestEl.innerText = `₱${metrics.totalInterest.toLocaleString()}`;
    if (incomeEl) incomeEl.innerText = `₱${metrics.requiredIncome.toLocaleString()}/mo`;
  }

  // Dedicated Standalone Loan & Interest Estimator Modal
  function openCalculatorModal(customPrice = null) {
    const modal = document.getElementById('loanCalculatorModal');
    if (!modal) return;

    let price = 4500000;
    if (customPrice && typeof customPrice === 'number') {
      price = customPrice;
    } else if (currentDetailListing && currentDetailListing.listingType === 'sale') {
      price = currentDetailListing.price;
    }

    const priceInput = document.getElementById('calcModalPrice');
    if (priceInput) priceInput.value = price;

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    recalculateStandaloneLoan();
  }

  function closeCalculatorModal() {
    const modal = document.getElementById('loanCalculatorModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function recalculateStandaloneLoan() {
    const price = parseFloat(document.getElementById('calcModalPrice')?.value || 4500000);
    const downPercent = parseFloat(document.getElementById('calcModalDownPercent')?.value || 20);
    const ratePercent = parseFloat(document.getElementById('calcModalRate')?.value || 7.0);
    const years = parseInt(document.getElementById('calcModalYears')?.value || 20, 10);

    const downAmount = Math.round((downPercent / 100) * price);
    const principal = Math.max(0, price - downAmount);
    const metrics = computeLoanMetrics(principal, ratePercent, years);

    // Update Sliders / Inputs text readouts
    const downPctDisplay = document.getElementById('calcModalDownPercentDisplay');
    const downAmtDisplay = document.getElementById('calcModalDownAmountDisplay');
    const rateDisplay = document.getElementById('calcModalRateDisplay');
    const yearsDisplay = document.getElementById('calcModalYearsDisplay');

    if (downPctDisplay) downPctDisplay.innerText = `${downPercent}%`;
    if (downAmtDisplay) downAmtDisplay.innerText = `₱${downAmount.toLocaleString()}`;
    if (rateDisplay) rateDisplay.innerText = `${ratePercent.toFixed(1)}% p.a.`;
    if (yearsDisplay) yearsDisplay.innerText = `${years} Years (${years * 12} mos)`;

    // Main Results Cards
    const monthlyMain = document.getElementById('calcResultMonthly');
    const incomeMain = document.getElementById('calcResultIncome');
    const principalMain = document.getElementById('calcResultPrincipal');
    const interestMain = document.getElementById('calcResultInterest');
    const totalPaymentMain = document.getElementById('calcResultTotalPayment');
    const principalBar = document.getElementById('calcBarPrincipal');
    const interestBar = document.getElementById('calcBarInterest');

    if (monthlyMain) monthlyMain.innerText = `₱${metrics.monthly.toLocaleString()}`;
    if (incomeMain) incomeMain.innerText = `₱${metrics.requiredIncome.toLocaleString()}/mo`;
    if (principalMain) principalMain.innerText = `₱${principal.toLocaleString()}`;
    if (interestMain) interestMain.innerText = `₱${metrics.totalInterest.toLocaleString()}`;
    if (totalPaymentMain) totalPaymentMain.innerText = `₱${metrics.totalPayment.toLocaleString()}`;

    // Update visual ratio bar (Principal vs Interest)
    if (principalBar && interestBar && metrics.totalPayment > 0) {
      const pPct = Math.round((principal / metrics.totalPayment) * 100);
      const iPct = 100 - pPct;
      principalBar.style.width = `${pPct}%`;
      interestBar.style.width = `${iPct}%`;
      principalBar.title = `Principal: ${pPct}%`;
      interestBar.title = `Total Interest: ${iPct}%`;
    }

    // Term Comparison Table (10, 15, 20, 30 Years)
    const tableBody = document.getElementById('calcComparisonTableBody');
    if (tableBody) {
      const terms = [
        { termYears: 10, label: 'Short Term (10 Yrs)', rate: Math.max(4, ratePercent - 0.5) },
        { termYears: 15, label: 'Standard Bank (15 Yrs)', rate: ratePercent },
        { termYears: 20, label: 'Standard Bank (20 Yrs)', rate: ratePercent },
        { termYears: 30, label: 'Pag-IBIG Housing Loan (30 Yrs)', rate: 6.25 }
      ];

      tableBody.innerHTML = terms.map(t => {
        const m = computeLoanMetrics(principal, t.rate, t.termYears);
        const isCurrent = t.termYears === years;
        return `
          <tr class="border-b border-slate-100 ${isCurrent ? 'bg-blue-50/70 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'}">
            <td class="py-2.5 px-3">
              ${t.label} ${isCurrent ? '<span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded ml-1">Current</span>' : ''}
            </td>
            <td class="py-2.5 px-3 text-right font-mono">${t.rate.toFixed(2)}%</td>
            <td class="py-2.5 px-3 text-right font-mono font-bold text-blue-600">₱${m.monthly.toLocaleString()}/mo</td>
            <td class="py-2.5 px-3 text-right font-mono text-amber-600">₱${m.totalInterest.toLocaleString()}</td>
            <td class="py-2.5 px-3 text-right font-mono text-slate-500">₱${m.requiredIncome.toLocaleString()}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function applyLoanPreset(years, rate) {
    const yearsInput = document.getElementById('calcModalYears');
    const rateInput = document.getElementById('calcModalRate');
    if (yearsInput) yearsInput.value = years;
    if (rateInput) rateInput.value = rate;
    recalculateStandaloneLoan();
  }

  // ==========================================
  // REALTOR ADMIN AUTHENTICATION & PORTAL FLOW
  // ==========================================

  function promptRealtorLogin() {
    if (isRealtorMode) {
      lockRealtorMode();
    } else {
      openAdminAuthModal();
    }
  }

  function openAdminAuthModal() {
    const modal = document.getElementById('adminAuthModal');
    const input = document.getElementById('adminPasswordInput');
    const errorEl = document.getElementById('adminAuthError');
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.classList.remove('flex');
    }
    if (input) {
      input.value = '';
      input.classList.remove('border-rose-500', 'bg-rose-50', 'animate-shake');
    }
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => input?.focus(), 150);
    }
  }

  function closeAdminAuthModal() {
    const modal = document.getElementById('adminAuthModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function togglePasswordVisibility() {
    const input = document.getElementById('adminPasswordInput');
    const icon = document.getElementById('passwordEyeIcon');
    if (!input || !icon) return;
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  function handleAdminLogin(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('adminPasswordInput');
    const errorEl = document.getElementById('adminAuthError');
    const entered = input ? input.value.trim() : '';

    if (entered === REALTOR_PASSCODE) {
      isRealtorAuthenticated = true;
      sessionStorage.setItem('realtor_logged_in', 'true');
      closeAdminAuthModal();
      
      // Activate Realtor Mode
      isRealtorMode = true;
      syncRealtorModeUI();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('Welcome, Realtor! Admin privileges unlocked.', 'success');
    } else {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        errorEl.classList.add('flex');
      }
      if (input) {
        input.classList.add('border-rose-500', 'bg-rose-50', 'animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
        input.focus();
        input.select();
      }
      showToast('Incorrect passcode. Access denied.', 'error');
    }
  }

  function lockRealtorMode() {
    isRealtorAuthenticated = false;
    isRealtorMode = false;
    sessionStorage.removeItem('realtor_logged_in');
    syncRealtorModeUI();
    showToast('Realtor Portal locked. Passcode required for future access.', 'info');
  }

  function toggleRealtorMode() {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      return;
    }
    isRealtorMode = !isRealtorMode;
    syncRealtorModeUI();
    if (isRealtorMode) {
      showToast('Realtor Admin Mode Active! You can now add, edit, or delete listings.', 'info');
    } else {
      showToast('Realtor Admin Mode Paused.', 'info');
    }
  }

  function syncRealtorModeUI() {
    const realtorBar = document.getElementById('realtorAdminBar');
    const badge = document.getElementById('realtorModeBadge');
    const toggleBtn = document.getElementById('toggleRealtorBtn');
    const navBadge = document.getElementById('navRealtorActiveBadge');

    if (isRealtorMode) {
      if (realtorBar) realtorBar.classList.remove('hidden');
      if (badge) badge.classList.remove('hidden');
      if (navBadge) {
        navBadge.classList.remove('hidden');
        navBadge.classList.add('inline-flex');
      }
      if (toggleBtn) {
        toggleBtn.classList.add('bg-amber-500', 'text-white', 'border-amber-600');
        toggleBtn.classList.remove('bg-slate-800', 'text-slate-300');
        toggleBtn.innerHTML = '<i class="fa-solid fa-lock-open text-white"></i> <span>Realtor Active (Unlocked)</span>';
      }
    } else {
      if (realtorBar) realtorBar.classList.add('hidden');
      if (badge) badge.classList.add('hidden');
      if (navBadge) {
        navBadge.classList.add('hidden');
        navBadge.classList.remove('inline-flex');
      }
      if (toggleBtn) {
        toggleBtn.classList.remove('bg-amber-500', 'text-white', 'border-amber-600');
        toggleBtn.classList.add('bg-slate-800', 'text-slate-300');
        toggleBtn.innerHTML = '<i class="fa-solid fa-user-tie text-blue-400"></i> <span>Realtor Portal</span>';
      }
    }

    renderListings();
    updateRealtorStats();
  }

  function updateRealtorStats() {
    const totalEl = document.getElementById('realtorTotalListings');
    const saleEl = document.getElementById('realtorSaleCount');
    const rentEl = document.getElementById('realtorRentCount');
    const valueEl = document.getElementById('realtorPortfolioValue');

    if (totalEl) totalEl.innerText = listings.length;
    if (saleEl) saleEl.innerText = listings.filter(i => i.listingType === 'sale').length;
    if (rentEl) rentEl.innerText = listings.filter(i => i.listingType === 'rent').length;
    
    if (valueEl) {
      const totalValue = listings.reduce((sum, item) => sum + (item.listingType === 'sale' ? item.price : item.price * 12), 0);
      if (totalValue >= 1000000) {
        valueEl.innerText = `₱${(totalValue / 1000000).toFixed(1)}M`;
      } else {
        valueEl.innerText = `₱${Math.round(totalValue / 1000)}k`;
      }
    }
  }

  // Open Add/Edit Listing Modal for Realtor (Defaults to Iligan City)
  function openAddModal() {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      showToast('Realtor passcode required to add listings.', 'warning');
      return;
    }

    editingId = null;
    editorImages = [];
    editorLat = MapModule.ILIGAN_DEFAULT_LAT;
    editorLng = MapModule.ILIGAN_DEFAULT_LNG;

    document.getElementById('editModalTitle').innerText = 'Add New Property in Iligan City';
    document.getElementById('editListingForm').reset();
    document.getElementById('editListingId').value = '';
    
    // Reset realtor fields
    if (document.getElementById('editRealtorName')) document.getElementById('editRealtorName').value = '';
    if (document.getElementById('editRealtorAgency')) document.getElementById('editRealtorAgency').value = '';
    if (document.getElementById('editRealtorPhone')) document.getElementById('editRealtorPhone').value = '';
    if (document.getElementById('editRealtorEmail')) document.getElementById('editRealtorEmail').value = '';
    if (document.getElementById('editRealtorPrc')) document.getElementById('editRealtorPrc').value = '';
    
    // Set default Iligan City values
    document.getElementById('editCity').value = 'Iligan City';
    document.getElementById('editState').value = 'Lanao del Norte';
    document.getElementById('editZip').value = '9200';
    document.getElementById('editLotSize').value = '250 sqm';
    document.getElementById('editLat').value = editorLat.toFixed(5);
    document.getElementById('editLng').value = editorLng.toFixed(5);
    const gpsPaste = document.getElementById('editGpsPasteInput');
    if (gpsPaste) gpsPaste.value = `${editorLat.toFixed(5)}, ${editorLng.toFixed(5)}`;

    renderEditorImages();
    openEditModalWindow();

    setTimeout(() => {
      MapModule.initRealtorPickerMap('realtorMapPicker', editorLat, editorLng, (lat, lng) => {
        editorLat = lat;
        editorLng = lng;
        document.getElementById('editLat').value = lat.toFixed(5);
        document.getElementById('editLng').value = lng.toFixed(5);
        const gpsInput = document.getElementById('editGpsPasteInput');
        if (gpsInput) gpsInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      });
      updateRealtorPriceEstimator();
    }, 150);
  }

  function openEditModal(id) {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      showToast('Realtor passcode required to edit listings.', 'warning');
      return;
    }

    const listing = listings.find(item => item.id === id);
    if (!listing) return;
    editingId = id;

    document.getElementById('editModalTitle').innerText = `Edit Property (${listing.id})`;
    document.getElementById('editListingId').value = listing.id;
    document.getElementById('editTitle').value = listing.title || '';
    document.getElementById('editType').value = listing.type || 'Single Family';
    document.getElementById('editListingType').value = listing.listingType || 'sale';
    document.getElementById('editStatus').value = listing.status || 'active';
    document.getElementById('editPrice').value = listing.price || '';
    document.getElementById('editAddress').value = listing.address || '';
    document.getElementById('editCity').value = listing.city || 'Iligan City';
    document.getElementById('editState').value = listing.state || 'Lanao del Norte';
    document.getElementById('editZip').value = listing.zip || '9200';
    
    editorLat = listing.lat || MapModule.ILIGAN_DEFAULT_LAT;
    editorLng = listing.lng || MapModule.ILIGAN_DEFAULT_LNG;
    document.getElementById('editLat').value = editorLat.toFixed(5);
    document.getElementById('editLng').value = editorLng.toFixed(5);
    const gpsPaste = document.getElementById('editGpsPasteInput');
    if (gpsPaste) gpsPaste.value = `${editorLat.toFixed(5)}, ${editorLng.toFixed(5)}`;

    document.getElementById('editBeds').value = listing.beds || 3;
    document.getElementById('editBaths').value = listing.baths || 2;
    document.getElementById('editSqft').value = listing.sqft || 180;
    document.getElementById('editLotSize').value = listing.lotSize || '250 sqm';
    document.getElementById('editYearBuilt').value = listing.yearBuilt || 2022;
    document.getElementById('editHoa').value = listing.hoa || 0;
    document.getElementById('editFeatured').checked = !!listing.featured;
    document.getElementById('editDescription').value = listing.description || '';

    // Realtor contact fields
    const rInfo = listing.realtor || {};
    if (document.getElementById('editRealtorName')) document.getElementById('editRealtorName').value = rInfo.name || '';
    if (document.getElementById('editRealtorAgency')) document.getElementById('editRealtorAgency').value = rInfo.agency || '';
    if (document.getElementById('editRealtorPhone')) document.getElementById('editRealtorPhone').value = rInfo.phone || '';
    if (document.getElementById('editRealtorEmail')) document.getElementById('editRealtorEmail').value = rInfo.email || '';
    if (document.getElementById('editRealtorPrc')) document.getElementById('editRealtorPrc').value = rInfo.prcNo || '';

    // Amenities checkboxes
    document.querySelectorAll('.edit-amenity-checkbox').forEach(chk => {
      chk.checked = (listing.amenities || []).includes(chk.value);
    });

    editorImages = [...(listing.images || [])];
    if (editorImages.length === 0) {
      editorImages.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80');
    }
    renderEditorImages();

    openEditModalWindow();

    setTimeout(() => {
      MapModule.initRealtorPickerMap('realtorMapPicker', editorLat, editorLng, (lat, lng) => {
        editorLat = lat;
        editorLng = lng;
        document.getElementById('editLat').value = lat.toFixed(5);
        document.getElementById('editLng').value = lng.toFixed(5);
        const gpsInput = document.getElementById('editGpsPasteInput');
        if (gpsInput) gpsInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      });
      updateRealtorPriceEstimator();
    }, 150);
  }

  function openEditModalWindow() {
    closeDetailModal();
    const modal = document.getElementById('editListingModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('editListingModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    editingId = null;
  }

  // Realtor Form: Paste GPS Coordinates and Auto-fill Address & Location
  async function locateGpsAndAutoFillAddress(customInput = null) {
    const rawVal = customInput !== null 
      ? customInput 
      : document.getElementById('editGpsPasteInput')?.value.trim();

    if (!rawVal) {
      showToast('Please paste or enter GPS coordinates first (e.g. 8.2280, 124.2452).', 'warning');
      return;
    }

    const coords = MapModule.parseCoordinates(rawVal);
    if (!coords) {
      showToast('Could not recognize coordinate format. Try: 8.2280, 124.2452 or copy from Google Maps.', 'warning');
      return;
    }

    editorLat = coords.lat;
    editorLng = coords.lng;

    // Update GPS readout inputs
    const latInput = document.getElementById('editLat');
    const lngInput = document.getElementById('editLng');
    const gpsPasteInput = document.getElementById('editGpsPasteInput');
    
    if (latInput) latInput.value = coords.lat.toFixed(5);
    if (lngInput) lngInput.value = coords.lng.toFixed(5);
    if (gpsPasteInput) gpsPasteInput.value = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

    // Move pin and fly picker map
    MapModule.setPickerLocation(coords.lat, coords.lng, 16);

    showToast(`Pinpoint placed! Reverse geocoding address for ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}...`, 'info');

    // Call free OpenStreetMap reverse geocoding API
    const result = await MapModule.reverseGeocode(coords.lat, coords.lng);
    if (result) {
      const addressInput = document.getElementById('editAddress');
      const cityInput = document.getElementById('editCity');
      const stateInput = document.getElementById('editState');
      const zipInput = document.getElementById('editZip');

      if (addressInput && result.address) addressInput.value = result.address;
      if (cityInput && result.city) cityInput.value = result.city;
      if (stateInput && result.state) stateInput.value = result.state;
      if (zipInput && result.zip) zipInput.value = result.zip;

      showToast(`📍 Auto-filled: ${result.address}, ${result.city}!`, 'success');
    } else {
      showToast(`GPS pinned at ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}. Please verify street name.`, 'info');
    }
  }

  // Reverse geocode directly from the current marker pin location
  async function autoFillAddressFromPin() {
    if (!editorLat || !editorLng) return;
    const gpsPasteInput = document.getElementById('editGpsPasteInput');
    if (gpsPasteInput) gpsPasteInput.value = `${editorLat.toFixed(5)}, ${editorLng.toFixed(5)}`;
    await locateGpsAndAutoFillAddress(`${editorLat}, ${editorLng}`);
  }

  // Realtor Form: Geocode Address within Iligan City, Philippines
  async function searchAddressOnMap() {
    const address = document.getElementById('editAddress').value.trim();
    const city = document.getElementById('editCity').value.trim() || 'Iligan City';
    const state = document.getElementById('editState').value.trim() || 'Lanao del Norte';

    const fullQuery = [address, city, state, 'Philippines'].filter(Boolean).join(', ');
    if (!address) {
      showToast('Please enter an address or barangay in Iligan City first.', 'warning');
      return;
    }

    showToast(`Searching "${fullQuery}" on map...`, 'info');
    const result = await MapModule.geocodeAddress(fullQuery);
    if (result) {
      editorLat = result.lat;
      editorLng = result.lng;
      document.getElementById('editLat').value = result.lat.toFixed(5);
      document.getElementById('editLng').value = result.lng.toFixed(5);
      const gpsPaste = document.getElementById('editGpsPasteInput');
      if (gpsPaste) gpsPaste.value = `${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`;
      MapModule.setPickerLocation(result.lat, result.lng, 15);
      showToast(`Pinpoint updated: ${result.displayName.slice(0, 45)}...`, 'success');
    } else {
      showToast('Address not directly geocoded. You can drag the pin on the map to place it!', 'warning');
    }
  }

  // Realtor Form: Image Management
  function renderEditorImages() {
    const container = document.getElementById('editorImagesList');
    if (!container) return;

    if (editorImages.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-2">No images added yet. Add an image URL or upload photos below.</p>`;
      return;
    }

    container.innerHTML = editorImages.map((imgUrl, idx) => `
      <div class="relative group h-20 w-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
        <img src="${imgUrl}" class="w-full h-full object-cover">
        ${idx === 0 ? '<span class="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-600 text-white font-bold text-[9px] rounded uppercase shadow">Cover</span>' : ''}
        <div class="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
          ${idx !== 0 ? `
            <button type="button" onclick="MLSApp.makePrimaryImage(${idx})" title="Set as Cover" class="w-6 h-6 rounded-md bg-blue-600 text-white text-xs flex items-center justify-center hover:bg-blue-700">
              <i class="fa-solid fa-star"></i>
            </button>
          ` : ''}
          <button type="button" onclick="MLSApp.removeEditorImage(${idx})" title="Remove" class="w-6 h-6 rounded-md bg-rose-600 text-white text-xs flex items-center justify-center hover:bg-rose-700">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  }

  function addImageByUrl() {
    const input = document.getElementById('newImageUrl');
    const url = input?.value.trim();
    if (!url) return;
    editorImages.push(url);
    input.value = '';
    renderEditorImages();
    showToast('Image URL added', 'success');
  }

  function handleImageFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        editorImages.push(evt.target.result);
        renderEditorImages();
      };
      reader.readAsDataURL(file);
    });

    showToast(`${files.length} photo(s) uploaded successfully!`, 'success');
    e.target.value = '';
  }

  function makePrimaryImage(index) {
    if (index >= 0 && index < editorImages.length) {
      const selected = editorImages.splice(index, 1)[0];
      editorImages.unshift(selected);
      renderEditorImages();
      showToast('Updated cover photo', 'success');
    }
  }

  function removeEditorImage(index) {
    editorImages.splice(index, 1);
    renderEditorImages();
  }

  // Realtor Form: Save Listing (Create or Update)
  function handleSaveListing(e) {
    e.preventDefault();

    const title = document.getElementById('editTitle').value.trim();
    const type = document.getElementById('editType').value;
    const listingType = document.getElementById('editListingType').value;
    const status = document.getElementById('editStatus').value;
    const price = parseFloat(document.getElementById('editPrice').value);
    const address = document.getElementById('editAddress').value.trim();
    const city = document.getElementById('editCity').value.trim() || 'Iligan City';
    const state = document.getElementById('editState').value.trim() || 'Lanao del Norte';
    const zip = document.getElementById('editZip').value.trim() || '9200';
    const lat = parseFloat(document.getElementById('editLat').value) || editorLat;
    const lng = parseFloat(document.getElementById('editLng').value) || editorLng;

    const beds = parseInt(document.getElementById('editBeds').value, 10);
    const baths = parseFloat(document.getElementById('editBaths').value);
    const sqft = parseInt(document.getElementById('editSqft').value, 10);
    const lotSize = document.getElementById('editLotSize').value.trim() || 'N/A';
    const yearBuilt = parseInt(document.getElementById('editYearBuilt').value, 10) || 2023;
    const hoa = parseFloat(document.getElementById('editHoa').value) || 0;
    const featured = document.getElementById('editFeatured').checked;
    const description = document.getElementById('editDescription').value.trim();

    const amenities = [];
    document.querySelectorAll('.edit-amenity-checkbox:checked').forEach(chk => {
      amenities.push(chk.value);
    });

    if (editorImages.length === 0) {
      editorImages.push('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80');
    }

    const listingPayload = {
      id: editingId || null,
      title,
      type,
      listingType,
      status,
      price,
      pricePeriod: listingType === 'rent' ? '/mo' : '',
      address,
      city,
      state,
      zip,
      country: 'Philippines',
      lat,
      lng,
      beds,
      baths,
      sqft,
      lotSize,
      yearBuilt,
      hoa,
      featured,
      description,
      amenities,
      images: editorImages,
      realtor: {
        name: document.getElementById('editRealtorName')?.value.trim() || 'Licensed Broker / Agent',
        agency: document.getElementById('editRealtorAgency')?.value.trim() || 'Iligan Premier Realty Services',
        phone: document.getElementById('editRealtorPhone')?.value.trim() || '+63 917 555 2890',
        email: document.getElementById('editRealtorEmail')?.value.trim() || 'realtor@iliganmls.ph',
        prcNo: document.getElementById('editRealtorPrc')?.value.trim() || 'PRC / DHSUD Registered',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
      }
    };

    MLSStore.saveListing(listingPayload);
    loadData();
    applyFilters();
    updateRealtorStats();
    closeEditModal();

    showToast(editingId ? `Property ${editingId} updated successfully!` : 'New Property published to Iligan MLS!', 'success');
  }

  function confirmDeleteListing(id) {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      showToast('Realtor passcode required to delete listings.', 'warning');
      return;
    }
    if (confirm(`Are you sure you want to delete listing ${id}? This action cannot be undone.`)) {
      MLSStore.deleteListing(id);
      loadData();
      applyFilters();
      updateRealtorStats();
      closeDetailModal();
      showToast(`Listing ${id} was deleted`, 'info');
    }
  }

  async function clearAllData() {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      showToast('Realtor passcode required to clear data.', 'warning');
      return;
    }
    if (confirm('Are you sure you want to permanently delete ALL properties from Firestore and LocalStorage? This action cannot be undone.')) {
      await MLSStore.clearAllListings();
      loadData();
      applyFilters();
      updateRealtorStats();
      showToast('All property listings permanently cleared from database.', 'info');
    }
  }

  function resetDemoData() {
    return clearAllData();
  }

  // Site Viewing Inquiry Modal
  function openTourModal(id) {
    const listing = listings.find(item => item.id === id);
    if (!listing) return;

    const modal = document.getElementById('tourModal');
    if (!modal) return;

    document.getElementById('tourListingTitle').innerText = listing.title;
    document.getElementById('tourListingAddress').innerText = `${listing.address}, ${listing.city}`;
    document.getElementById('tourListingId').value = listing.id;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeTourModal() {
    const modal = document.getElementById('tourModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleTourSubmit(e) {
    e.preventDefault();
    const listingId = document.getElementById('tourListingId')?.value || '';
    const name = document.getElementById('tourName')?.value.trim() || '';
    const email = document.getElementById('tourEmail')?.value.trim() || '';
    const phone = document.getElementById('tourPhone')?.value.trim() || '';
    const date = document.getElementById('tourDate')?.value || '';
    const messageInput = document.querySelector('#tourForm textarea');
    const message = messageInput ? messageInput.value.trim() : '';

    const listing = listings.find(item => item.id === listingId);

    const inquiryData = {
      id: 'INQ-' + Date.now(),
      listingId,
      propertyTitle: listing ? listing.title : 'General Property Inquiry',
      propertyPrice: listing ? listing.price : null,
      propertyListingType: listing ? listing.listingType : 'sale',
      propertyAddress: listing ? `${listing.address}, ${listing.city}` : '',
      propertyImage: (listing && listing.images && listing.images[0]) || '',
      name,
      email,
      phone,
      date,
      message,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    // Save to Firebase Cloud Firestore and Local Cache
    MLSStore.saveViewingInquiry(inquiryData);

    closeTourModal();
    const form = document.getElementById('tourForm');
    if (form) form.reset();

    showToast(`Site viewing inquiry sent for ${name}! Broker will contact you at ${phone}.`, 'success');
  }

  // Melodic Web Audio notification chime (Pure JS, no external audio files required)
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.00, now + 0.12);
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.log('Notification chime audio notice:', e);
    }
  }

  // Request browser desktop push notifications
  function requestDesktopNotifications() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Desktop push notifications enabled! You will be alerted when new inquiries arrive.', 'success');
        } else {
          showToast('Desktop notifications were disabled or denied.', 'warning');
        }
      });
    } else {
      showToast('Browser notifications are not supported in this browser.', 'info');
    }
  }

  // Show high-priority in-app inquiry notification toast
  function showInquiryNotificationToast(inq, totalNew = 1) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto flex items-start gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/60 max-w-sm w-full transition-all duration-300 transform translate-y-4 opacity-0';
    toast.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-lg shadow-md">
        <i class="fa-solid fa-bell animate-pulse"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-blue-400">New Client Lead</span>
          <span class="text-[10px] text-slate-400">Just now</span>
        </div>
        <div class="font-extrabold text-sm text-white truncate mt-0.5">${inq.name || 'Anonymous Client'}</div>
        <div class="text-xs text-slate-300 truncate">${inq.propertyTitle || 'Property Inquiry'}</div>
        <div class="text-[11px] text-blue-300 font-mono mt-0.5">${inq.phone || inq.email || ''}</div>
        <div class="mt-2.5 flex items-center gap-2">
          <button onclick="MLSApp.openInquiriesModal(); this.closest('div.pointer-events-auto').remove()" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-sm">
            View Lead
          </button>
          <button onclick="this.closest('div.pointer-events-auto').remove()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition">
            Dismiss
          </button>
        </div>
      </div>
      <button onclick="this.closest('div.pointer-events-auto').remove()" class="text-slate-400 hover:text-white text-xs p-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    });

    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('opacity-0', 'translate-x-4');
        setTimeout(() => toast.remove(), 300);
      }
    }, 12000);
  }

  // Handle incoming inquiries from Cloud Firestore listener
  function handleInquiriesUpdate(cloudInquiries) {
    if (!Array.isArray(cloudInquiries)) return;

    if (!isInitialInquirySync) {
      const brandNew = [];
      cloudInquiries.forEach(inq => {
        if (!knownInquiryIds.has(inq.id)) {
          brandNew.push(inq);
        }
      });

      if (brandNew.length > 0) {
        playNotificationChime();
        const latest = brandNew[0];
        showInquiryNotificationToast(latest, brandNew.length);

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🔔 New Property Inquiry - Iligan MLS', {
              body: `${latest.name || 'Client'} (${latest.phone || ''}) inquired about ${latest.propertyTitle || 'a property'}!`,
              icon: latest.propertyImage || undefined
            });
          } catch(e) {}
        }
      }
    }

    isInitialInquirySync = false;
    inquiries = cloudInquiries;
    cloudInquiries.forEach(inq => knownInquiryIds.add(inq.id));

    MLSStore.saveAllInquiries(cloudInquiries);
    updateInquiryBadges();
    renderInquiriesList();
  }

  // Update badge counts in navbar, admin bar, and modal
  function updateInquiryBadges() {
    const newCount = inquiries.filter(i => i.status === 'new').length;
    
    // Navbar badge
    const navBadge = document.getElementById('navInquiryBadge');
    if (navBadge) {
      if (newCount > 0) {
        navBadge.innerText = newCount > 99 ? '99+' : newCount;
        navBadge.classList.remove('hidden');
        navBadge.classList.add('inline-flex', 'animate-pulse');
      } else {
        navBadge.classList.add('hidden');
        navBadge.classList.remove('inline-flex', 'animate-pulse');
      }
    }

    // Realtor Admin Bar badge
    const realtorBadge = document.getElementById('realtorInquiryBadge');
    if (realtorBadge) {
      if (newCount > 0) {
        realtorBadge.innerText = `${newCount} New`;
        realtorBadge.classList.remove('hidden');
      } else {
        realtorBadge.classList.add('hidden');
      }
    }

    // Modal unread pill
    const modalPill = document.getElementById('modalInquiryUnreadPill');
    if (modalPill) {
      if (newCount > 0) {
        modalPill.innerText = `${newCount} New`;
        modalPill.classList.remove('hidden');
      } else {
        modalPill.classList.add('hidden');
      }
    }

    // Tab counts
    const countAll = document.getElementById('countInqAll');
    const countNew = document.getElementById('countInqNew');
    const countContacted = document.getElementById('countInqContacted');
    const countClosed = document.getElementById('countInqClosed');

    if (countAll) countAll.innerText = inquiries.length;
    if (countNew) countNew.innerText = inquiries.filter(i => i.status === 'new').length;
    if (countContacted) countContacted.innerText = inquiries.filter(i => i.status === 'contacted').length;
    if (countClosed) countClosed.innerText = inquiries.filter(i => i.status === 'closed').length;
  }

  // Open Inquiries Management Modal (requires admin authentication)
  function openInquiriesModal() {
    if (!isRealtorAuthenticated) {
      promptRealtorLogin();
      showToast('Please enter the Realtor passcode (admin010211) to view client leads.', 'warning');
      return;
    }

    const modal = document.getElementById('inquiriesModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      renderInquiriesList();
    }
  }

  function closeInquiriesModal() {
    const modal = document.getElementById('inquiriesModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function filterInquiries(status) {
    activeInquiryFilter = status;
    
    const tabs = ['all', 'new', 'contacted', 'closed'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabInq${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) {
        if (t === status) {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-xs';
        } else {
          btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition bg-white text-slate-600 hover:bg-slate-100 border border-slate-200';
        }
      }
    });

    renderInquiriesList();
  }

  function handleInquirySearch(query) {
    inquirySearchQuery = (query || '').toLowerCase().trim();
    renderInquiriesList();
  }

  // Render client inquiries list
  function renderInquiriesList() {
    const container = document.getElementById('inquiriesListContainer');
    if (!container) return;

    let filtered = inquiries.slice();

    if (activeInquiryFilter !== 'all') {
      filtered = filtered.filter(i => (i.status || 'new') === activeInquiryFilter);
    }

    if (inquirySearchQuery) {
      filtered = filtered.filter(i => {
        const text = `${i.name || ''} ${i.email || ''} ${i.phone || ''} ${i.propertyTitle || ''} ${i.message || ''}`.toLowerCase();
        return text.includes(inquirySearchQuery);
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-14 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
          <div class="w-12 h-12 bg-white text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3 text-xl shadow-xs">
            <i class="fa-solid fa-inbox"></i>
          </div>
          <h4 class="text-sm font-bold text-slate-800 mb-1">No Inquiries Found</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">
            ${inquirySearchQuery || activeInquiryFilter !== 'all' ? 'Try adjusting your search or tab filter.' : 'When clients submit a viewing request or ask about a property, their inquiry will appear here in real-time.'}
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const status = item.status || 'new';
      const statusStyles = {
        new: 'bg-rose-50 text-rose-700 border-rose-200',
        contacted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        closed: 'bg-slate-100 text-slate-600 border-slate-200'
      }[status] || 'bg-blue-50 text-blue-700 border-blue-200';

      const statusLabels = {
        new: 'New Inquiry',
        contacted: 'Contacted',
        closed: 'Closed'
      }[status] || status;

      const dateStr = item.createdAt 
        ? new Date(item.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Recently';

      return `
        <div class="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex-1 min-w-0 space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusStyles}">
                ${statusLabels}
              </span>
              <span class="text-[11px] text-slate-400 font-mono">ID: ${item.id}</span>
              <span class="text-[11px] text-slate-400">• ${dateStr}</span>
            </div>

            <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
              <div class="text-sm font-extrabold text-slate-900">${item.name || 'Anonymous Client'}</div>
              <div class="flex items-center gap-3 text-xs text-slate-600">
                <a href="tel:${item.phone}" class="hover:text-blue-600 font-mono font-semibold flex items-center gap-1">
                  <i class="fa-solid fa-phone text-blue-500 text-[10px]"></i> ${item.phone || 'No phone'}
                </a>
                <a href="mailto:${item.email}" class="hover:text-blue-600 flex items-center gap-1">
                  <i class="fa-solid fa-envelope text-blue-500 text-[10px]"></i> ${item.email || 'No email'}
                </a>
              </div>
            </div>

            <!-- Linked Property Badge -->
            <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              ${item.propertyImage ? `<img src="${item.propertyImage}" class="w-10 h-8 rounded-lg object-cover flex-shrink-0">` : ''}
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 truncate">${item.propertyTitle || 'Property Inquiry'}</div>
                <div class="text-[11px] text-slate-500 truncate">${item.propertyAddress || ''} ${item.propertyPrice ? `• ₱${item.propertyPrice.toLocaleString()}` : ''}</div>
              </div>
              ${item.listingId ? `
                <button onclick="MLSApp.openDetailModal('${item.listingId}')" class="px-2 py-1 bg-white hover:bg-blue-50 text-blue-600 rounded-lg border border-slate-200 font-bold text-[11px] transition whitespace-nowrap">
                  View House
                </button>
              ` : ''}
            </div>

            ${item.date ? `
              <div class="text-[11px] text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100 inline-flex items-center gap-1.5 font-medium">
                <i class="fa-regular fa-calendar-check text-indigo-600"></i>
                <span>Requested Viewing Schedule: <strong>${new Date(item.date).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
              </div>
            ` : ''}

            ${item.message ? `
              <p class="text-xs text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100/80 italic">
                "${item.message}"
              </p>
            ` : ''}
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div class="flex items-center gap-1.5">
              <select onchange="MLSApp.setInquiryStatus('${item.id}', this.value)" 
                      class="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs">
                <option value="new" ${status === 'new' ? 'selected' : ''}>Mark as New</option>
                <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Mark as Contacted</option>
                <option value="closed" ${status === 'closed' ? 'selected' : ''}>Mark as Closed</option>
              </select>

              <button onclick="MLSApp.initiateCall('${item.phone || ''}', '${(item.name || 'Client').replace(/'/g, "\\'")}', '${(item.propertyTitle || 'Property Inquiry').replace(/'/g, "\\'")}', 'Inquiring Client')" 
                 class="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center justify-center transition"
                 title="Call Client via API">
                <i class="fa-solid fa-phone text-xs"></i>
              </button>

              <button onclick="MLSApp.initiateEmail('${item.email || ''}', '${(item.name || 'Client').replace(/'/g, "\\'")}', '${(item.propertyTitle || 'Property Inquiry').replace(/'/g, "\\'")}', '${item.listingId || ''}')" 
                 class="w-7 h-7 rounded-lg bg-blue-100 hover:bg-blue-600 text-blue-700 hover:text-white flex items-center justify-center transition"
                 title="Email Client via API">
                <i class="fa-solid fa-envelope text-xs"></i>
              </button>

              <button onclick="MLSApp.confirmDeleteInquiry('${item.id}')" 
                      class="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-600 text-rose-700 hover:text-white flex items-center justify-center transition"
                      title="Delete Lead">
                <i class="fa-solid fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function setInquiryStatus(id, newStatus) {
    MLSStore.updateInquiryStatus(id, newStatus);
    const inq = inquiries.find(i => i.id === id);
    if (inq) inq.status = newStatus;
    updateInquiryBadges();
    renderInquiriesList();
    showToast(`Inquiry marked as: ${newStatus}`, 'info');
  }

  function confirmDeleteInquiry(id) {
    if (confirm('Are you sure you want to delete this client inquiry?')) {
      MLSStore.deleteInquiry(id);
      inquiries = inquiries.filter(i => i.id !== id);
      updateInquiryBadges();
      renderInquiriesList();
      showToast('Client inquiry deleted.', 'info');
    }
  }

  // ==========================================================
  // CLIENT & REALTOR CALL & EMAIL WEB APIS
  // ==========================================================
  let activeCallData = { phone: '', name: '', propertyTitle: '', role: '' };
  let activeEmailData = { email: '', name: '', propertyTitle: '', listingId: '' };

  // Play telephone dial tone using Web Audio API
  function playDialTone() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // DTMF touch-tone dual frequency simulation (941Hz + 1336Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(941, now);
      osc2.frequency.setValueAtTime(1336, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch(e) {
      console.log('Dial tone audio notice:', e);
    }
  }

  function onDialTriggered() {
    playDialTone();
    showToast(`Connecting dialer to ${activeCallData.phone || 'recipient'}...`, 'info');
  }

  // Sanitize Philippine mobile number to E.164 international format for WhatsApp API
  function sanitizeForWhatsApp(phone) {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('09')) {
      digits = '63' + digits.substring(1);
    } else if (digits.startsWith('9') && digits.length === 10) {
      digits = '63' + digits;
    }
    return digits;
  }

  // Initiate Call Action Modal
  function initiateCall(phone, name, propertyTitle, role = 'Realtor Broker') {
    activeCallData = { 
      phone: phone || '+63 917 555 2890', 
      name: name || 'Realtor Broker', 
      propertyTitle: propertyTitle || 'Iligan MLS Property', 
      role: role || 'Contact' 
    };
    
    const modal = document.getElementById('callModal');
    if (!modal) return;

    const roleEl = document.getElementById('callContactRole');
    if (roleEl) roleEl.innerText = activeCallData.role;

    const nameEl = document.getElementById('callContactName');
    if (nameEl) nameEl.innerText = activeCallData.name;

    const propEl = document.getElementById('callPropertyContext');
    if (propEl) propEl.innerText = `Regarding: ${activeCallData.propertyTitle}`;

    const phoneDisplayEl = document.getElementById('callPhoneNumberDisplay');
    if (phoneDisplayEl) phoneDisplayEl.innerText = activeCallData.phone;

    // Direct tel: URI
    const dialBtn = document.getElementById('callDialNowBtn');
    if (dialBtn) {
      const cleanTel = activeCallData.phone.replace(/[^0-9+]/g, '');
      dialBtn.href = `tel:${cleanTel}`;
    }

    // WhatsApp Direct API
    const waBtn = document.getElementById('callWhatsAppBtn');
    if (waBtn) {
      const waDigits = sanitizeForWhatsApp(activeCallData.phone);
      const waMessage = encodeURIComponent(`Hello ${activeCallData.name}, I am inquiring regarding "${activeCallData.propertyTitle}" listed on Iligan City MLS.`);
      waBtn.href = `https://api.whatsapp.com/send?phone=${waDigits}&text=${waMessage}`;
    }

    // SMS URI
    const smsBtn = document.getElementById('callSmsBtn');
    if (smsBtn) {
      const cleanTel = activeCallData.phone.replace(/[^0-9+]/g, '');
      smsBtn.href = `sms:${cleanTel}`;
    }

    // Reset copy button label
    const copyLabel = document.getElementById('callCopyLabel');
    if (copyLabel) copyLabel.innerText = 'Copy';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeCallModal() {
    const modal = document.getElementById('callModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function copyPhoneNumber() {
    if (!activeCallData.phone) return;
    navigator.clipboard.writeText(activeCallData.phone).then(() => {
      const copyLabel = document.getElementById('callCopyLabel');
      if (copyLabel) copyLabel.innerHTML = '<span class="text-emerald-600 font-bold">Copied!</span>';
      showToast(`Copied phone number: ${activeCallData.phone}`, 'success');
      setTimeout(() => {
        if (copyLabel) copyLabel.innerText = 'Copy';
      }, 2000);
    }).catch(() => {
      showToast(`Phone number: ${activeCallData.phone}`, 'info');
    });
  }

  // Initiate Email Action Modal
  function initiateEmail(email, name, propertyTitle, listingId = '') {
    activeEmailData = { 
      email: email || 'broker@iliganmls.ph', 
      name: name || 'Realtor Broker', 
      propertyTitle: propertyTitle || 'Iligan MLS Property',
      listingId: listingId || ''
    };

    const modal = document.getElementById('emailModal');
    if (!modal) return;

    const recipientName = document.getElementById('emailRecipientName');
    if (recipientName) recipientName.innerText = activeEmailData.name;

    const recipientAddr = document.getElementById('emailRecipientAddress');
    if (recipientAddr) recipientAddr.innerText = activeEmailData.email;

    const listingInput = document.getElementById('emailListingId');
    if (listingInput) listingInput.value = activeEmailData.listingId;

    const subjectInput = document.getElementById('emailSubjectInput');
    if (subjectInput) {
      subjectInput.value = `Inquiry regarding: ${activeEmailData.propertyTitle}`;
    }

    const bodyInput = document.getElementById('emailBodyInput');
    if (bodyInput) {
      bodyInput.value = `Hello ${activeEmailData.name},\n\nI am interested in "${activeEmailData.propertyTitle}". Could you please provide more information, brochure specs, and available dates for site viewing?\n\nThank you!`;
    }

    // Default mailto link
    updateMailtoLink();

    // Reset copy button
    const copyEmailLabel = document.getElementById('copyEmailLabel');
    if (copyEmailLabel) copyEmailLabel.innerText = 'Copy';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function copyEmailAddress() {
    if (!activeEmailData.email) return;
    navigator.clipboard.writeText(activeEmailData.email).then(() => {
      const copyEmailLabel = document.getElementById('copyEmailLabel');
      if (copyEmailLabel) copyEmailLabel.innerHTML = '<span class="text-emerald-600 font-bold">Copied!</span>';
      showToast(`Copied email address: ${activeEmailData.email}`, 'success');
      setTimeout(() => {
        if (copyEmailLabel) copyEmailLabel.innerText = 'Copy';
      }, 2000);
    }).catch(() => {
      showToast(`Email: ${activeEmailData.email}`, 'info');
    });
  }

  function updateMailtoLink() {
    const mailtoBtn = document.getElementById('emailMailtoLink');
    if (!mailtoBtn) return;
    const to = activeEmailData.email || 'broker@iliganmls.ph';
    const subject = document.getElementById('emailSubjectInput')?.value || `Inquiry on ${activeEmailData.propertyTitle}`;
    const body = document.getElementById('emailBodyInput')?.value || '';
    mailtoBtn.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Open Gmail Web API
  function openInGmailWeb() {
    const to = activeEmailData.email || 'broker@iliganmls.ph';
    const subject = document.getElementById('emailSubjectInput')?.value || `Inquiry regarding ${activeEmailData.propertyTitle}`;
    const body = document.getElementById('emailBodyInput')?.value || '';
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');
    showToast('Opening Gmail Web composer...', 'info');
  }

  // Open Outlook Live Web API
  function openInOutlookWeb() {
    const to = activeEmailData.email || 'broker@iliganmls.ph';
    const subject = document.getElementById('emailSubjectInput')?.value || `Inquiry regarding ${activeEmailData.propertyTitle}`;
    const body = document.getElementById('emailBodyInput')?.value || '';
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(outlookUrl, '_blank');
    showToast('Opening Outlook Web composer...', 'info');
  }

  // Handle direct Send Email via Cloud Firestore API
  async function handleSendEmail(e) {
    if (e) e.preventDefault();

    const senderName = document.getElementById('emailSenderName')?.value.trim() || 'Interested Buyer';
    const senderEmail = document.getElementById('emailSenderAddress')?.value.trim() || '';
    const senderPhone = document.getElementById('emailSenderPhone')?.value.trim() || '';
    const subject = document.getElementById('emailSubjectInput')?.value.trim() || `Inquiry regarding ${activeEmailData.propertyTitle}`;
    const message = document.getElementById('emailBodyInput')?.value.trim() || '';
    const listingId = document.getElementById('emailListingId')?.value || activeEmailData.listingId || '';

    const listing = listings.find(item => item.id === listingId);

    const emailInquiryPayload = {
      id: 'INQ-' + Date.now(),
      listingId: listingId,
      propertyTitle: activeEmailData.propertyTitle || (listing ? listing.title : 'General Inquiry'),
      propertyPrice: listing ? listing.price : null,
      propertyAddress: listing ? `${listing.address}, ${listing.city}` : '',
      propertyImage: (listing && listing.images && listing.images[0]) || '',
      name: senderName,
      email: senderEmail,
      phone: senderPhone,
      subject: subject,
      message: message,
      source: 'email_api_modal',
      recipientEmail: activeEmailData.email,
      status: 'new',
      createdAt: new Date().toISOString()
    };

    // Save directly to Firebase Cloud Firestore and Local Cache
    MLSStore.saveViewingInquiry(emailInquiryPayload);

    // Play notification chime
    playNotificationChime();

    closeEmailModal();

    const form = document.getElementById('emailComposeForm');
    if (form) form.reset();

    showToast(`Email message sent to ${activeEmailData.name}! Lead logged to Cloud Firestore.`, 'success');
  }

  // View Mode switching (Split, Grid, Map)
  function setViewMode(mode) {
    viewMode = mode;
    const splitBtn = document.getElementById('viewSplitBtn');
    const gridBtn = document.getElementById('viewGridBtn');
    const mapBtn = document.getElementById('viewMapBtn');
    const mapCol = document.getElementById('mapColumn');
    const listCol = document.getElementById('listingsColumn');

    [splitBtn, gridBtn, mapBtn].forEach(b => {
      if (b) {
        b.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
        b.classList.add('text-slate-600');
      }
    });

    if (mode === 'split') {
      splitBtn?.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
      mapCol?.classList.remove('hidden');
      mapCol?.classList.add('lg:block');
      listCol?.classList.remove('lg:w-full');
      listCol?.classList.add('lg:w-7/12');
      listCol?.classList.remove('hidden');
    } else if (mode === 'grid') {
      gridBtn?.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
      mapCol?.classList.add('hidden');
      mapCol?.classList.remove('lg:block');
      listCol?.classList.remove('lg:w-7/12');
      listCol?.classList.add('lg:w-full');
      listCol?.classList.remove('hidden');
    } else if (mode === 'map') {
      mapBtn?.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
      listCol?.classList.add('hidden');
      mapCol?.classList.remove('hidden', 'lg:w-5/12');
      mapCol?.classList.add('w-full');
    }

    MapModule.refreshSize();
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-slate-900 text-white border-emerald-500',
      warning: 'bg-amber-900 text-white border-amber-500',
      info: 'bg-slate-900 text-white border-blue-500'
    };

    const icons = {
      success: '<i class="fa-solid fa-circle-check text-emerald-400"></i>',
      warning: '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>',
      info: '<i class="fa-solid fa-circle-info text-blue-400"></i>'
    };

    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-xl border-l-4 shadow-xl text-xs font-semibold transform transition-all duration-300 translate-y-2 opacity-0 ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }

  function resetFilters() {
    filters.searchQuery = '';
    filters.listingType = 'all';
    filters.minPrice = null;
    filters.maxPrice = null;
    filters.beds = 'any';
    filters.baths = 'any';
    filters.propertyType = 'all';
    filters.amenities = [];
    filters.sortBy = 'newest';

    const searchInput = document.getElementById('heroSearchInput');
    if (searchInput) searchInput.value = '';

    const typeTabs = document.querySelectorAll('.type-filter-tab');
    typeTabs.forEach(t => {
      if (t.dataset.type === 'all') {
        t.classList.add('bg-slate-900', 'text-white');
        t.classList.remove('text-slate-600', 'hover:bg-slate-100');
      } else {
        t.classList.remove('bg-slate-900', 'text-white');
        t.classList.add('text-slate-600', 'hover:bg-slate-100');
      }
    });

    const priceSelect = document.getElementById('filterPriceSelect');
    if (priceSelect) priceSelect.value = 'all';

    const bedsSelect = document.getElementById('filterBedsSelect');
    if (bedsSelect) bedsSelect.value = 'any';

    const propertyTypeSelect = document.getElementById('filterPropertyType');
    if (propertyTypeSelect) propertyTypeSelect.value = 'all';

    applyFilters();
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('heroSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filters.searchQuery = e.target.value;
        applyFilters();
      });
      searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          if (query) {
            // Check if query is GPS coordinates
            const coords = MapModule.parseCoordinates(query);
            if (coords) {
              showToast(`Navigating to GPS coordinates: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}...`, 'info');
              MapModule.setPickerLocation(coords.lat, coords.lng);
              const res = await MapModule.reverseGeocode(coords.lat, coords.lng);
              if (res) {
                showToast(`📍 Location: ${res.address}, ${res.city}`, 'success');
              }
            } else {
              showToast(`Exploring "${query}" in Iligan on map...`, 'info');
              await MapModule.searchAndFlyMainMap(`${query}, Iligan City`);
            }
          }
        }
      });
    }

    // Realtor GPS Paste Input listener
    const gpsPasteInput = document.getElementById('editGpsPasteInput');
    if (gpsPasteInput) {
      gpsPasteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          locateGpsAndAutoFillAddress();
        }
      });
      // Auto-trigger when user pastes
      gpsPasteInput.addEventListener('paste', () => {
        setTimeout(() => {
          locateGpsAndAutoFillAddress();
        }, 80);
      });
    }

    document.querySelectorAll('.type-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.type-filter-tab').forEach(t => {
          t.classList.remove('bg-slate-900', 'text-white');
          t.classList.add('text-slate-600', 'hover:bg-slate-100');
        });
        tab.classList.add('bg-slate-900', 'text-white');
        tab.classList.remove('text-slate-600', 'hover:bg-slate-100');

        filters.listingType = tab.dataset.type;
        applyFilters();
      });
    });

    const priceSelect = document.getElementById('filterPriceSelect');
    if (priceSelect) {
      priceSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'all') {
          filters.minPrice = null;
          filters.maxPrice = null;
        } else {
          const [min, max] = val.split('-').map(Number);
          filters.minPrice = min || null;
          filters.maxPrice = max || null;
        }
        applyFilters();
      });
    }

    const bedsSelect = document.getElementById('filterBedsSelect');
    if (bedsSelect) {
      bedsSelect.addEventListener('change', (e) => {
        filters.beds = e.target.value;
        applyFilters();
      });
    }

    const propertyTypeSelect = document.getElementById('filterPropertyType');
    if (propertyTypeSelect) {
      propertyTypeSelect.addEventListener('change', (e) => {
        filters.propertyType = e.target.value;
        applyFilters();
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        filters.sortBy = e.target.value;
        sortListings();
        renderListings();
      });
    }

    const fileUploadInput = document.getElementById('editImageFiles');
    if (fileUploadInput) {
      fileUploadInput.addEventListener('change', handleImageFileUpload);
    }

    const editForm = document.getElementById('editListingForm');
    if (editForm) {
      editForm.addEventListener('submit', handleSaveListing);
    }

    // Live Price Estimator in Realtor Modal
    const editPriceInput = document.getElementById('editPrice');
    if (editPriceInput) {
      editPriceInput.addEventListener('input', updateRealtorPriceEstimator);
    }
    const editTypeSelect = document.getElementById('editListingType');
    if (editTypeSelect) {
      editTypeSelect.addEventListener('change', updateRealtorPriceEstimator);
    }
    const realtorDown = document.getElementById('realtorDownPercent');
    if (realtorDown) realtorDown.addEventListener('change', updateRealtorPriceEstimator);
    const realtorRate = document.getElementById('realtorInterestRate');
    if (realtorRate) realtorRate.addEventListener('input', updateRealtorPriceEstimator);
    const realtorTerm = document.getElementById('realtorLoanTerm');
    if (realtorTerm) realtorTerm.addEventListener('change', updateRealtorPriceEstimator);

    // Standalone Loan Calculator Modal Listeners
    const calcModalPrice = document.getElementById('calcModalPrice');
    if (calcModalPrice) calcModalPrice.addEventListener('input', recalculateStandaloneLoan);
    const calcModalDown = document.getElementById('calcModalDownPercent');
    if (calcModalDown) calcModalDown.addEventListener('input', recalculateStandaloneLoan);
    const calcModalRate = document.getElementById('calcModalRate');
    if (calcModalRate) calcModalRate.addEventListener('input', recalculateStandaloneLoan);
    const calcModalYears = document.getElementById('calcModalYears');
    if (calcModalYears) calcModalYears.addEventListener('input', recalculateStandaloneLoan);

    const tourForm = document.getElementById('tourForm');
    if (tourForm) {
      tourForm.addEventListener('submit', handleTourSubmit);
    }

    // Restore Realtor admin mode if session is authenticated
    if (isRealtorAuthenticated) {
      isRealtorMode = true;
      syncRealtorModeUI();
    }

    // Subscribe to real-time Cloud Firestore updates
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.subscribeToListings) {
      FirebaseModule.subscribeToListings((cloudListings) => {
        if (Array.isArray(cloudListings)) {
          listings = cloudListings;
          MLSStore.saveAllListings(cloudListings);
          applyFilters();
          updateRealtorStats();
        }
      });
    }

    // Subscribe to real-time Cloud Firestore updates for Client Inquiries
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.subscribeToInquiries) {
      FirebaseModule.subscribeToInquiries((cloudInquiries) => {
        handleInquiriesUpdate(cloudInquiries);
      });
    }
  }

  return {
    init,
    openDetailModal,
    closeDetailModal,
    switchDetailImage,
    recalculateMortgage,
    toggleFavorite,
    toggleRealtorMode,
    promptRealtorLogin,
    openAdminAuthModal,
    closeAdminAuthModal,
    togglePasswordVisibility,
    handleAdminLogin,
    lockRealtorMode,
    openAddModal,
    openEditModal,
    closeEditModal,
    confirmDeleteListing,
    clearAllData,
    resetDemoData,
    openInquiriesModal,
    closeInquiriesModal,
    filterInquiries,
    handleInquirySearch,
    setInquiryStatus,
    confirmDeleteInquiry,
    requestDesktopNotifications,
    searchAddressOnMap,
    locateGpsAndAutoFillAddress,
    autoFillAddressFromPin,
    updateRealtorPriceEstimator,
    openCalculatorModal,
    closeCalculatorModal,
    recalculateStandaloneLoan,
    applyLoanPreset,
    addImageByUrl,
    makePrimaryImage,
    removeEditorImage,
    openTourModal,
    closeTourModal,
    initiateCall,
    closeCallModal,
    copyPhoneNumber,
    onDialTriggered,
    initiateEmail,
    closeEmailModal,
    copyEmailAddress,
    openInGmailWeb,
    openInOutlookWeb,
    handleSendEmail,
    setViewMode,
    resetFilters,
    showToast
  };
})();

window.MLSApp = MLSApp;

document.addEventListener('DOMContentLoaded', () => {
  MLSApp.init();
});
