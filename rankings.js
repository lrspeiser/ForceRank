const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://slider-3b16e-default-rtdb.firebaseio.com"
});

const rankings = [
    "Messy", "Cringe", "Loud", "Lit", "Penny-Pinching",
    "Extra", "Geeky", "Lowkey", "Edgy", "Boujee",
    "Sensitive", "Fire", "Chaotic", "Nocturnal", "Spicy",
    "Savage", "Techie", "YOLO", "Bossy", "Political"
];

const db = admin.database();
const rankingsRef = db.ref('rankings');

rankingsRef.set(rankings)
    .then(() => {
        console.log('[rankings.js/rankingsRef.set] Rankings successfully added to Firebase');
        process.exit(0);
    })
    .catch((error) => {
        console.log('[rankings.js/rankingsRef.set] Error adding rankings to Firebase:', error);
        process.exit(1);
    });