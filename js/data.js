/**
 * MLS Real Estate Data Store & Management - Philippines (Iligan City)
 * Persists in LocalStorage with rich initial sample listings across Iligan City barangays
 */

const MLS_STORAGE_KEY = 'jobacs_mls_listings_iligan_v2';

// Curated architectural properties located in key areas of Iligan City, Lanao del Norte, Philippines
const DEFAULT_LISTINGS = [
  {
    id: 'ILG-2001',
    title: 'Modern Executive Villa in Gated Subdivision',
    type: 'Single Family',
    listingType: 'sale',
    status: 'active',
    price: 8500000,
    pricePeriod: '',
    address: 'Emerald Hills Executive Village, Brgy. Pala-o',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2245,
    lng: 124.2460,
    beds: 4,
    baths: 3,
    sqft: 280, // in square meters (sqm)
    lotSize: '350 sqm',
    yearBuilt: 2023,
    hoa: 1500, // in PHP/mo
    featured: true,
    description: 'Stunning contemporary multi-level residence inside a secure executive enclave in Pala-o, Iligan City. Features double-height ceiling living room, granite kitchen countertops with center breakfast nook, 2-car covered garage, master suite with walk-in closet and balcony, pressure tank water system, and mountain views.',
    amenities: ['Gated Subdivision', '24/7 Security', '2-Car Garage', 'Balcony', 'Garden', 'Water Tank', 'CCTV System', 'High Ceilings'],
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-08-15'
  },
  {
    id: 'ILG-2002',
    title: 'Cozy Modern Townhouse near MSU-IIT Campus',
    type: 'Townhouse',
    listingType: 'rent',
    status: 'active',
    price: 22000,
    pricePeriod: '/mo',
    address: 'Andres Bonifacio Ave, Brgy. Tibanga',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2415,
    lng: 124.2440,
    beds: 3,
    baths: 2,
    sqft: 120, // sqm
    lotSize: '95 sqm',
    yearBuilt: 2022,
    hoa: 500,
    featured: true,
    description: 'Prime 2-storey modern townhouse walking distance to Mindanao State University - Iligan Institute of Technology (MSU-IIT), commercial centers, and fast food hubs. Semi-furnished with inverter air conditioners, built-in wardrobes, fiber internet ready, and private gated carport.',
    amenities: ['Fiber Internet Ready', 'Air Conditioned', 'Gated Carport', 'Near Universities', 'Pet Friendly', 'Balcony'],
    images: [
      'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-08-20'
  },
  {
    id: 'ILG-2003',
    title: 'Spacious Family Bungalow with Landscaped Garden',
    type: 'Single Family',
    listingType: 'sale',
    status: 'active',
    price: 4950000,
    pricePeriod: '',
    address: 'Macapagal Avenue, Brgy. Tubod',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2160,
    lng: 124.2385,
    beds: 3,
    baths: 2,
    sqft: 180, // sqm
    lotSize: '280 sqm',
    yearBuilt: 2021,
    hoa: 0,
    featured: false,
    description: 'Well-maintained single-storey bungalow close to Iligan City Hall and the Tubod Sports Complex. Complete with clean Torrens title (TCT), wide front perimeter fence, lush tropical front lawn, deep-well water booster pump, and maid’s quarters.',
    amenities: ['Clean Title (TCT)', 'Landscaped Garden', 'Carport', 'Water Booster Pump', 'Maid Room', 'Quiet Neighborhood'],
    images: [
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-08-28'
  },
  {
    id: 'ILG-2004',
    title: 'Modern 2BR Fully Furnished Condo Unit',
    type: 'Condo',
    listingType: 'rent',
    status: 'active',
    price: 18000,
    pricePeriod: '/mo',
    address: 'San Miguel Commercial Corridor, Brgy. San Miguel',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2320,
    lng: 124.2410,
    beds: 2,
    baths: 1,
    sqft: 65, // sqm
    lotSize: 'N/A',
    yearBuilt: 2023,
    hoa: 1200,
    featured: false,
    description: 'Brand new 2-bedroom rental apartment right in the heart of downtown Iligan City, minutes away from Robinson’s Place Iligan and Gaisano Mall. Includes smart TV, refrigerator, induction cooktop, hot water shower, and 24-hr security guard with biometric gate access.',
    amenities: ['Fully Furnished', '24/7 Security', 'Biometric Access', 'Near Malls', 'Air Conditioned', 'Hot Shower'],
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-09-01'
  },
  {
    id: 'ILG-2005',
    title: 'Grand Coastal & Mountain View Luxury Villa',
    type: 'Villa',
    listingType: 'sale',
    status: 'active',
    price: 14500000,
    pricePeriod: '',
    address: 'Mimbalot Scenic Heights, Brgy. Buru-un',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.1930,
    lng: 124.1950,
    beds: 5,
    baths: 4.5,
    sqft: 450, // sqm
    lotSize: '620 sqm',
    yearBuilt: 2024,
    hoa: 2000,
    featured: true,
    description: 'An extraordinary luxury cliffside villa in Buru-un, overlooking the panoramic Iligan Bay coastline and tropical waterfalls nature park. Boasts private infinity dipping pool, wrap-around lanai deck, solar-hybrid battery backup system, chef’s auxiliary kitchen, and 3-car garage.',
    amenities: ['Private Infinity Pool', 'Sea View', 'Mountain View', 'Solar Hybrid System', '3-Car Garage', 'Lanai Deck', 'Smart Home'],
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-09-02'
  },
  {
    id: 'ILG-2006',
    title: 'Peaceful Suburban Home near National Highway',
    type: 'Single Family',
    listingType: 'sale',
    status: 'active',
    price: 3850000,
    pricePeriod: '',
    address: 'Sunrise Valley Subdivision, Brgy. Suarez',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2040,
    lng: 124.2180,
    beds: 3,
    baths: 2,
    sqft: 140, // sqm
    lotSize: '200 sqm',
    yearBuilt: 2020,
    hoa: 600,
    featured: false,
    description: 'Comfortable family home in an elevated, flood-free subdivision in Brgy. Suarez. Equipped with steel truss roofing, tiled car garage, concrete perimeter fence with gate, clean titled lot, and Pag-IBIG loan eligibility.',
    amenities: ['Flood-Free Elevation', 'Pag-IBIG Eligible', 'Gated Carport', 'Clean Title', 'Perimeter Fence'],
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6c563aaec9?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-08-10'
  },
  {
    id: 'ILG-2007',
    title: 'Scenic Hilltop Residence with City View',
    type: 'Single Family',
    listingType: 'sale',
    status: 'active',
    price: 6800000,
    pricePeriod: '',
    address: 'Maria Cristina Hills, Brgy. Santa Elena',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2110,
    lng: 124.2620,
    beds: 4,
    baths: 3,
    sqft: 230, // sqm
    lotSize: '320 sqm',
    yearBuilt: 2022,
    hoa: 800,
    featured: false,
    description: 'Charming modern tropical sanctuary in Santa Elena offering cool mountain breezes and sweeping city night views. Solid reinforced concrete build, spacious covered terrace, fruit-bearing garden trees, and overhead stainless water tank.',
    amenities: ['City & Mountain View', 'Cool Breeze Area', 'Covered Terrace', 'Stainless Water Tank', 'Fruit Trees', 'Wide Carport'],
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502005229762-ee1b2da970d4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-07-22'
  },
  {
    id: 'ILG-2008',
    title: '2-Storey Riverside Villa for Rent',
    type: 'Villa',
    listingType: 'rent',
    status: 'active',
    price: 35000,
    pricePeriod: '/mo',
    address: 'Riverview Greens, Brgy. Hinaplanon',
    city: 'Iligan City',
    state: 'Lanao del Norte',
    zip: '9200',
    country: 'Philippines',
    lat: 8.2490,
    lng: 124.2580,
    beds: 4,
    baths: 3,
    sqft: 260, // sqm
    lotSize: '400 sqm',
    yearBuilt: 2023,
    hoa: 1000,
    featured: true,
    description: 'High-end rental home in a serene private gated compound in Hinaplanon. Fully secured with CCTV, expansive open-plan living and dining, standby generator integration, landscaped perimeter garden, and high-speed internet included.',
    amenities: ['Standby Generator Ready', 'Gated Compound', 'CCTV System', 'Garden', 'Balcony', 'Pet Friendly', '2-Car Garage'],
    images: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80'
    ],
    realtor: {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'alex.vance@iliganrealty.ph',
      prcNo: 'PRC Lic. 0031892 / DHSUD Reg. 10-2024',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80'
    },
    createdAt: '2026-09-04'
  }
];

// Helper methods to access and modify MLS Listings
const MLSStore = {
  // Load listings from localStorage or populate default
  getListings: function() {
    try {
      const stored = localStorage.getItem(MLS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage listings:', e);
    }
    // Default fallback
    this.saveAllListings(DEFAULT_LISTINGS);
    return DEFAULT_LISTINGS;
  },

  // Save full array
  saveAllListings: function(listings) {
    try {
      localStorage.setItem(MLS_STORAGE_KEY, JSON.stringify(listings));
    } catch (e) {
      console.error('Error saving listings to localStorage:', e);
    }
  },

  // Get single listing by ID
  getListingById: function(id) {
    const list = this.getListings();
    return list.find(item => item.id === id) || null;
  },

  // Add or Update listing
  saveListing: function(listingData) {
    const list = this.getListings();
    if (!listingData.id) {
      // Generate new MLS ID for Iligan
      const randomNum = Math.floor(2000 + Math.random() * 8000);
      listingData.id = `ILG-${randomNum}`;
      listingData.createdAt = new Date().toISOString().split('T')[0];
      list.unshift(listingData);
    } else {
      const index = list.findIndex(item => item.id === listingData.id);
      if (index !== -1) {
        list[index] = { ...list[index], ...listingData, updatedAt: new Date().toISOString().split('T')[0] };
      } else {
        list.unshift(listingData);
      }
    }
    this.saveAllListings(list);
    return listingData;
  },

  // Delete listing
  deleteListing: function(id) {
    let list = this.getListings();
    list = list.filter(item => item.id !== id);
    this.saveAllListings(list);
    return list;
  },

  // Reset to default sample houses in Iligan City
  resetToDefaults: function() {
    localStorage.removeItem(MLS_STORAGE_KEY);
    this.saveAllListings(DEFAULT_LISTINGS);
    return DEFAULT_LISTINGS;
  }
};
