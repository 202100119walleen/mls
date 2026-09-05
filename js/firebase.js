/**
 * Firebase Initialization & Cloud Firestore Database Integration
 * Project: jobacsmls
 * Real-time synchronization for property listings & viewing inquiries
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
  let isSeeding = false;
  let unsubscribeListings = null;

  // Initialize Firebase
  function init() {
    try {
      if (typeof firebase !== 'undefined') {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        try {
          analytics = firebase.analytics();
        } catch (e) {
          console.warn('[Firebase] Analytics initialized or optional:', e.message);
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

  // Update live status badge in UI
  function updateStatusBadge(status, message = '') {
    const badges = document.querySelectorAll('.firebase-status-badge');
    badges.forEach(badge => {
      if (status === 'connected') {
        badge.className = 'firebase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Firebase Cloud Sync Active';
        badge.title = 'Connected to Cloud Firestore (jobacsmls). Realtime sync enabled.';
      } else if (status === 'connecting') {
        badge.className = 'firebase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span> Connecting Firebase...';
      } else if (status === 'offline') {
        badge.className = 'firebase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Local Cache Active';
        badge.title = 'Running in offline/local mode. ' + message;
      } else {
        badge.className = 'firebase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Firestore Standby';
        badge.title = 'Firestore connection standby: ' + message;
      }
    });
  }

  // Test connection to Firestore
  async function testConnection() {
    if (!db) return;
    try {
      const snapshot = await db.collection('listings').limit(1).get();
      isConnected = true;
      updateStatusBadge('connected');
      console.log('[Firebase Firestore] Connected successfully! Document count check ok.');
    } catch (err) {
      console.warn('[Firebase Firestore] Connection check notice:', err.message);
      if (err.code === 'permission-denied') {
        updateStatusBadge('error', 'Check Firestore Security Rules in Firebase Console');
      } else {
        updateStatusBadge('offline', err.message);
      }
    }
  }

  // Subscribe to real-time changes in Firestore collection
  function subscribeToListings(onUpdate) {
    if (!db) return null;
    try {
      if (unsubscribeListings) unsubscribeListings();

      unsubscribeListings = db.collection('listings').onSnapshot(snapshot => {
        isConnected = true;
        updateStatusBadge('connected');

        if (snapshot.empty && !isSeeding) {
          console.log('[Firebase Firestore] Listings collection is empty. Seeding initial Iligan sample properties...');
          seedInitialListings();
          return;
        }

        const cloudListings = [];
        snapshot.forEach(doc => {
          cloudListings.push(doc.data());
        });

        console.log(`[Firebase Firestore] Received ${cloudListings.length} listings in real-time.`);
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

  // Seed default Iligan properties if collection is empty
  async function seedInitialListings() {
    if (!db || isSeeding) return;
    isSeeding = true;
    try {
      const batch = db.batch();
      if (typeof DEFAULT_LISTINGS !== 'undefined' && Array.isArray(DEFAULT_LISTINGS)) {
        DEFAULT_LISTINGS.forEach(item => {
          const docRef = db.collection('listings').doc(item.id);
          batch.set(docRef, item);
        });
        await batch.commit();
        console.log('[Firebase Firestore] Successfully seeded default Iligan City listings into Cloud Firestore!');
      }
    } catch (e) {
      console.warn('[Firebase Firestore] Notice during initial database seeding:', e.message);
    } finally {
      isSeeding = false;
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

  // Reset database back to defaults
  async function resetToDefaults(defaultListings) {
    if (!db) return false;
    try {
      const snapshot = await db.collection('listings').get();
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      defaultListings.forEach(item => {
        const docRef = db.collection('listings').doc(item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log('[Firebase Firestore] Database reset to default Iligan City listings.');
      return true;
    } catch (e) {
      console.warn('[Firebase Firestore] Reset to defaults notice:', e.message);
      return false;
    }
  }

  // Save site viewing inquiry to Firestore collection 'inquiries'
  async function saveInquiry(inquiryData) {
    if (!db) return false;
    try {
      const id = 'INQ-' + Date.now();
      const payload = {
        ...inquiryData,
        id,
        createdAt: new Date().toISOString()
      };
      await db.collection('inquiries').doc(id).set(payload);
      console.log('[Firebase Firestore] Viewing inquiry saved to cloud database:', id);
      return true;
    } catch (e) {
      console.warn('[Firebase Firestore] Failed to save viewing inquiry:', e.message);
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
    resetToDefaults,
    saveInquiry,
    updateStatusBadge
  };
})();

// Initialize on script load
if (typeof window !== 'undefined') {
  window.FirebaseModule = FirebaseModule;
  FirebaseModule.init();
}
