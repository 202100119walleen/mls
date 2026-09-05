/**
 * Firebase Initialization & Cloud Firestore Database Integration
 * Project: jobacsmls
 * Real-time synchronization for property listings & viewing inquiries
 * All static mock data removed; pure live database mode.
 */

const FirebaseModule = (function() {
  // Provided Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCg2xsZ4uGP8B2yZLYo33ea6IMA1L0GzKo",
    authDomain: "jobacsmls.firebaseapp.com",
    projectId: "jobacsmls",
    storageBucket: "jobacsmls.firebasestorage.app",
    messagingSenderId: "794295741076",
    appId: "1:794295741076:web:27ee05336167cd7c6b6281",
    measurementId: "G-14YNC7XLTF"
  };

  let app = null;
  let db = null;
  let analytics = null;
  let isConnected = false;
  let unsubscribeListings = null;

  // Known legacy mock IDs to auto-purge from Firestore if previously seeded
  const LEGACY_STATIC_IDS = new Set([
    'ILG-2001', 'ILG-2002', 'ILG-2003', 'ILG-2004',
    'ILG-2005', 'ILG-2006', 'ILG-2007', 'ILG-2008'
  ]);

  // Initialize Firebase
  function init() {
    try {
      if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        try {
          analytics = firebase.analytics();
        } catch (e) {
          console.warn('[Firebase] Analytics optional:', e.message);
        }

        console.log('[Firebase] Initialized successfully with project:', firebaseConfig.projectId);
        updateStatusBadge('connecting');
        testConnection();
      } else {
        console.warn('[Firebase] SDK scripts not yet loaded, falling back to local store.');
        updateStatusBadge('offline');
      }
    } catch (err) {
      console.error('[Firebase] Initialization error:', err);
      updateStatusBadge('error', err.message);
    }
  }

  let lastStatus = 'connecting';
  let lastMessage = '';

  // Update live status badge in UI
  function updateStatusBadge(status, message = '') {
    lastStatus = status;
    lastMessage = message;
    const badges = document.querySelectorAll('.firebase-status-badge');
    badges.forEach(badge => {
      badge.style.cursor = 'pointer';
      badge.onclick = () => retryConnection(true);

      if (status === 'connected') {
        badge.className = 'firebase-status-badge cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Firebase Cloud Sync Active';
        badge.title = 'Connected to Cloud Firestore (jobacsmls). Real-time sync active. Click to test sync.';
      } else if (status === 'connecting') {
        badge.className = 'firebase-status-badge cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span> Connecting Firebase...';
        badge.title = 'Connecting to Firebase... Click to retry.';
      } else if (status === 'offline') {
        badge.className = 'firebase-status-badge cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Local Cache Active';
        badge.title = 'Running in offline/local cache mode. Click to retry cloud connection. ' + message;
      } else {
        badge.className = 'firebase-status-badge cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Firestore Standby (Click to Retry)';
        badge.title = 'Firestore connection standby: ' + (message || 'Click to test cloud connection.');
      }
    });
  }

  // Test connection to Firestore
  async function testConnection(notifyOnSuccess = false) {
    if (!db) {
      updateStatusBadge('offline', 'Firebase database not initialized');
      return false;
    }
    updateStatusBadge('connecting');
    try {
      const snapshot = await db.collection('listings').limit(1).get();
      isConnected = true;
      updateStatusBadge('connected');
      console.log('[Firebase Firestore] Connected successfully!');
      if (notifyOnSuccess && typeof MLSApp !== 'undefined' && MLSApp.showToast) {
        MLSApp.showToast('Connected to Firebase Cloud Firestore! Cloud synchronization active.', 'success');
      }
      return true;
    } catch (err) {
      console.warn('[Firebase Firestore] Connection check notice:', err.message);
      let userFriendlyMsg = err.message;
      if (err.code === 'permission-denied') {
        userFriendlyMsg = 'Security rules restricted. Please allow read/write in Firebase Console.';
        updateStatusBadge('error', userFriendlyMsg);
      } else if (err.message && err.message.includes('does not exist')) {
        userFriendlyMsg = 'Firestore Database needs to be created in Firebase Console (Build > Firestore Database).';
        updateStatusBadge('error', userFriendlyMsg);
      } else {
        updateStatusBadge('offline', userFriendlyMsg);
      }
      if (notifyOnSuccess && typeof MLSApp !== 'undefined' && MLSApp.showToast) {
        MLSApp.showToast('Firestore Notice: ' + userFriendlyMsg, 'warning');
      }
      return false;
    }
  }

  // Explicit retry triggered on click or tab focus
  function retryConnection(interactive = true) {
    testConnection(interactive);
  }

  // Auto retry when user refocuses tab
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      if (!isConnected) {
        console.log('[Firebase] Window focused, re-testing Firestore connection...');
        testConnection(false);
      }
    });
  }

  // Subscribe to real-time changes in Firestore collection
  function subscribeToListings(onUpdate) {
    if (!db) return null;
    try {
      if (unsubscribeListings) unsubscribeListings();

      unsubscribeListings = db.collection('listings').onSnapshot(snapshot => {
        isConnected = true;
        updateStatusBadge('connected');

        if (snapshot.empty) {
          console.log('[Firebase Firestore] Listings collection is empty. Ready for new entries.');
          if (typeof onUpdate === 'function') {
            onUpdate([]);
          }
          return;
        }

        const cloudListings = [];
        const staticDocsToDelete = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          const docId = data.id || doc.id;
          // Detect any legacy static dummy listings and schedule for cleanup
          if (LEGACY_STATIC_IDS.has(docId)) {
            staticDocsToDelete.push(doc.ref);
          } else {
            cloudListings.push(data);
          }
        });

        // Clean out legacy mock listings if any exist in Firestore
        if (staticDocsToDelete.length > 0) {
          const batch = db.batch();
          staticDocsToDelete.forEach(ref => batch.delete(ref));
          batch.commit().then(() => {
            console.log(`[Firebase Firestore] Purged ${staticDocsToDelete.length} legacy static dummy listings from cloud database.`);
          }).catch(err => {
            console.warn('[Firebase Firestore] Could not purge legacy dummy listings:', err.message);
          });
        }

        console.log(`[Firebase Firestore] Real-time listings update: ${cloudListings.length} genuine property/properties.`);
        if (typeof onUpdate === 'function') {
          onUpdate(cloudListings);
        }
      }, error => {
        console.warn('[Firebase Firestore] onSnapshot listener notice:', error.message);
        if (error.code === 'permission-denied') {
          updateStatusBadge('error', 'Firestore rules restricted. Please allow read/write in Firebase Console.');
        } else {
          updateStatusBadge('offline', error.message);
        }
      });

      return unsubscribeListings;
    } catch (e) {
      console.error('[Firebase] Subscription failed:', e);
      return null;
    }
  }

  // Save or update property in Firestore
  async function saveListing(listing) {
    if (!db) return false;
    try {
      await db.collection('listings').doc(listing.id).set(listing, { merge: true });
      console.log(`[Firebase Firestore] Listing ${listing.id} saved to cloud database.`);
      return true;
    } catch (e) {
      console.warn(`[Firebase Firestore] Failed to save listing ${listing.id} to cloud:`, e.message);
      return false;
    }
  }

  // Delete property in Firestore
  async function deleteListing(id) {
    if (!db) return false;
    try {
      await db.collection('listings').doc(id).delete();
      console.log(`[Firebase Firestore] Listing ${id} deleted from cloud database.`);
      return true;
    } catch (e) {
      console.warn(`[Firebase Firestore] Failed to delete listing ${id} from cloud:`, e.message);
      return false;
    }
  }

  // Permanently delete all listings from Firestore
  async function clearAllListings() {
    if (!db) return false;
    try {
      const snapshot = await db.collection('listings').get();
      if (snapshot.empty) return true;
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('[Firebase Firestore] All property listings permanently deleted from Cloud Firestore.');
      return true;
    } catch (e) {
      console.warn('[Firebase Firestore] Failed to delete all listings:', e.message);
      return false;
    }
  }

  // Reset function redirects to clear all
  async function resetToDefaults() {
    return clearAllListings();
  }

  let unsubscribeInquiries = null;

  // Subscribe to real-time changes in Firestore collection 'inquiries'
  function subscribeToInquiries(onUpdate) {
    if (!db) return null;
    try {
      if (unsubscribeInquiries) unsubscribeInquiries();

      unsubscribeInquiries = db.collection('inquiries').onSnapshot(snapshot => {
        const cloudInquiries = [];
        snapshot.forEach(doc => {
          cloudInquiries.push(doc.data());
        });
        // Sort newest first
        cloudInquiries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        console.log(`[Firebase Firestore] Received ${cloudInquiries.length} inquiries in real-time.`);
        if (typeof onUpdate === 'function') {
          onUpdate(cloudInquiries);
        }
      }, error => {
        console.warn('[Firebase Firestore] Inquiries listener notice:', error.message);
      });

      return unsubscribeInquiries;
    } catch (e) {
      console.error('[Firebase] Inquiries subscription failed:', e);
      return null;
    }
  }

  // Save site viewing inquiry to Firestore collection 'inquiries'
  async function saveInquiry(inquiryData) {
    if (!db) return false;
    try {
      const id = inquiryData.id || ('INQ-' + Date.now());
      const payload = {
        ...inquiryData,
        id,
        status: inquiryData.status || 'new',
        createdAt: inquiryData.createdAt || new Date().toISOString()
      };
      await db.collection('inquiries').doc(id).set(payload, { merge: true });
      console.log('[Firebase Firestore] Viewing inquiry saved to cloud database:', id);
      return true;
    } catch (e) {
      console.warn('[Firebase Firestore] Failed to save viewing inquiry:', e.message);
      return false;
    }
  }

  // Update inquiry status (e.g. 'new', 'contacted', 'closed')
  async function updateInquiryStatus(id, status) {
    if (!db) return false;
    try {
      await db.collection('inquiries').doc(id).set({
        status,
        statusUpdatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firebase Firestore] Inquiry ${id} status updated to: ${status}`);
      return true;
    } catch (e) {
      console.warn(`[Firebase Firestore] Failed to update inquiry ${id} status:`, e.message);
      return false;
    }
  }

  // Delete inquiry from cloud database
  async function deleteInquiry(id) {
    if (!db) return false;
    try {
      await db.collection('inquiries').doc(id).delete();
      console.log(`[Firebase Firestore] Inquiry ${id} deleted.`);
      return true;
    } catch (e) {
      console.warn(`[Firebase Firestore] Failed to delete inquiry ${id}:`, e.message);
      return false;
    }
  }

  return {
    init,
    getDb: () => db,
    getApp: () => app,
    isConnected: () => isConnected,
    subscribeToListings,
    saveListing,
    deleteListing,
    clearAllListings,
    resetToDefaults,
    subscribeToInquiries,
    saveInquiry,
    updateInquiryStatus,
    deleteInquiry,
    updateStatusBadge
  };
})();

// Initialize on script load
if (typeof window !== 'undefined') {
  window.FirebaseModule = FirebaseModule;
  FirebaseModule.init();
}
