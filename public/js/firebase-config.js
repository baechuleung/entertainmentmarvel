import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';

const firebaseConfig = {
    apiKey: "AIzaSyBJzJPUU6pakcT6PdCCScNH1T0t4l-bN8Y",
    authDomain: "entertainmentmarvel-2e9d6.firebaseapp.com",
    projectId: "entertainmentmarvel-2e9d6",
    storageBucket: "entertainmentmarvel-2e9d6.firebasestorage.app",
    messagingSenderId: "734113665067",
    appId: "1:734113665067:web:baedadace51d01fd699a6e",
    measurementId: "G-6QY2DBFFR5",
    databaseURL: "https://entertainmentmarvel-2e9d6-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);
const analytics = getAnalytics(app);

export { auth, db, storage, rtdb, analytics };