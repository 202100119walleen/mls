/**
 * MLS Real Estate Data Store & Management - Philippines (Iligan City)
 * Persists in LocalStorage and syncs with Google Cloud Firestore
 * All static sample data removed for production deployment.
 */

const MLS_STORAGE_KEY = 'jobacs_mls_listings_iligan_v3';

// Empty default listings - real listings are fetched from Cloud Firestore or created via Realtor Portal
const DEFAULT_LISTINGS = [];

// Known static mock listing IDs from previous prototypes to purge completely
const STATIC_DEMO_IDS = new Set([
  'ILG-2001', 'ILG-2002', 'ILG-2003', 'ILG-2004',
  'ILG-2005', 'ILG-2006', 'ILG-2007', 'ILG-2008'
]);

// Helper methods to access and modify MLS Listings
const MLSStore = {
  // Purge any legacy demo data from previous sessions
  purgeLegacyData: function() {
    try {
      localStorage.removeItem('jobacs_mls_listings_iligan');
      localStorage.removeItem('jobacs_mls_listings_iligan_v2');
      
      const stored = localStorage.getItem(MLS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove any of the old static mock houses
          const cleaned = parsed.filter(item => !STATIC_DEMO_IDS.has(item.id));
          if (cleaned.length !== parsed.length) {
            this.saveAllListings(cleaned);
            console.log('[MLSStore] Purged legacy static listings from storage.');
          }
        }
      }
    } catch (e) {
      console.error('[MLSStore] Error purging legacy data:', e);
    }
  },

  // Load listings from localStorage (or return empty array)
  getListings: function() {
    try {
      const stored = localStorage.getItem(MLS_STORAGE_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.filter(item => !STATIC_DEMO_IDS.has(item.id));
        }
      }
    } catch (e) {
      console.error('Error reading localStorage listings:', e);
    }
    return [];
  },

  // Save full array
  saveAllListings: function(listings) {
    try {
      const cleanList = Array.isArray(listings) 
        ? listings.filter(item => !STATIC_DEMO_IDS.has(item.id))
        : [];
      localStorage.setItem(MLS_STORAGE_KEY, JSON.stringify(cleanList));
    } catch (e) {
      console.error('Error saving listings to localStorage:', e);
    }
  },

  // Get single listing by ID
  getListingById: function(id) {
    const list = this.getListings();
    return list.find(item => item.id === id) || null;
  },

  // Add or Update listing (Local + Cloud Firestore)
  saveListing: function(listingData) {
    const list = this.getListings();
    let savedItem = null;

    if (!listingData.id) {
      // Generate new MLS ID for Iligan
      const randomNum = Math.floor(2000 + Math.random() * 8000);
      listingData.id = `ILG-${randomNum}`;
      listingData.createdAt = new Date().toISOString().split('T')[0];
      list.unshift(listingData);
      savedItem = listingData;
    } else {
      const index = list.findIndex(item => item.id === listingData.id);
      if (index !== -1) {
        listingData.updatedAt = new Date().toISOString().split('T')[0];
        list[index] = { ...list[index], ...listingData };
        savedItem = list[index];
      } else {
        list.unshift(listingData);
        savedItem = listingData;
      }
    }

    this.saveAllListings(list);

    // Sync to Cloud Firestore in real time
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.saveListing) {
      FirebaseModule.saveListing(savedItem);
    }

    return savedItem;
  },

  // Delete listing (Local + Cloud Firestore)
  deleteListing: function(id) {
    let list = this.getListings();
    list = list.filter(item => item.id !== id);
    this.saveAllListings(list);

    // Sync deletion to Cloud Firestore
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.deleteListing) {
      FirebaseModule.deleteListing(id);
    }

    return list;
  },

  // Clear all listings completely from localStorage and Cloud Firestore
  clearAllListings: async function() {
    localStorage.removeItem(MLS_STORAGE_KEY);
    localStorage.removeItem('jobacs_mls_listings_iligan');
    localStorage.removeItem('jobacs_mls_listings_iligan_v2');
    localStorage.removeItem('mls_favorites_iligan');
    this.saveAllListings([]);

    // Purge Firestore collection
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.clearAllListings) {
      await FirebaseModule.clearAllListings();
    }

    console.log('[MLSStore] All listings and static data successfully cleared.');
    return [];
  },

  // Reset function now also clears all data cleanly
  resetToDefaults: function() {
    return this.clearAllListings();
  },

  // Inquiries Store Management
  getInquiries: function() {
    try {
      const stored = localStorage.getItem('jobacs_mls_inquiries_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error reading localStorage inquiries:', e);
    }
    return [];
  },

  saveAllInquiries: function(inquiries) {
    try {
      localStorage.setItem('jobacs_mls_inquiries_v1', JSON.stringify(inquiries || []));
    } catch (e) {
      console.error('Error saving inquiries to localStorage:', e);
    }
  },

  // Save viewing inquiry into LocalStorage and Cloud Firestore
  saveViewingInquiry: function(inquiryData) {
    const list = this.getInquiries();
    const id = inquiryData.id || ('INQ-' + Date.now());
    const payload = {
      ...inquiryData,
      id,
      status: inquiryData.status || 'new',
      createdAt: inquiryData.createdAt || new Date().toISOString()
    };
    
    // Add to front of array
    list.unshift(payload);
    this.saveAllInquiries(list);

    // Sync to Cloud Firestore
    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.saveInquiry) {
      FirebaseModule.saveInquiry(payload);
    }

    return payload;
  },

  // Update status of an inquiry ('new', 'contacted', 'closed')
  updateInquiryStatus: function(id, status) {
    const list = this.getInquiries();
    const item = list.find(i => i.id === id);
    if (item) {
      item.status = status;
      item.statusUpdatedAt = new Date().toISOString();
      this.saveAllInquiries(list);
    }

    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.updateInquiryStatus) {
      FirebaseModule.updateInquiryStatus(id, status);
    }
    return list;
  },

  // Delete an inquiry
  deleteInquiry: function(id) {
    let list = this.getInquiries();
    list = list.filter(i => i.id !== id);
    this.saveAllInquiries(list);

    if (typeof FirebaseModule !== 'undefined' && FirebaseModule.deleteInquiry) {
      FirebaseModule.deleteInquiry(id);
    }
    return list;
  },

  // ==========================================
  // Broker / Admin Profile Store Management
  // ==========================================
  getBrokerProfile: function() {
    try {
      const stored = localStorage.getItem('jobacs_mls_broker_profile_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return {
            name: parsed.name || 'Engr. Alex Vance, REB',
            agency: parsed.agency || 'Iligan Premier Realty & Associates',
            phone: parsed.phone || '+63 917 555 2890',
            email: parsed.email || 'broker@iliganmls.ph',
            prcNo: parsed.prcNo || 'PRC REB Lic. #0028941 | DHSUD Reg. #R10-B-04/23-119',
            avatar: parsed.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=128&q=80'
          };
        }
      }
    } catch(e) {
      console.error('[MLSStore] Error reading broker profile:', e);
    }
    return {
      name: 'Engr. Alex Vance, REB',
      agency: 'Iligan Premier Realty & Associates',
      phone: '+63 917 555 2890',
      email: 'broker@iliganmls.ph',
      prcNo: 'PRC REB Lic. #0028941 | DHSUD Reg. #R10-B-04/23-119',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=128&q=80'
    };
  },

  saveBrokerProfile: function(profileData) {
    try {
      const current = this.getBrokerProfile();
      const updated = {
        ...current,
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('jobacs_mls_broker_profile_v1', JSON.stringify(updated));

      // Sync to Cloud Firestore
      if (typeof FirebaseModule !== 'undefined' && FirebaseModule.saveBrokerProfile) {
        FirebaseModule.saveBrokerProfile(updated);
      }
      return updated;
    } catch(e) {
      console.error('[MLSStore] Error saving broker profile:', e);
      return profileData;
    }
  }
};

// Purge legacy cache on script execution
MLSStore.purgeLegacyData();
