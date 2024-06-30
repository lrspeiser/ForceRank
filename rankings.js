const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://slider-3b16e-default-rtdb.firebaseio.com"
});

const rankings = [
    [1, "Clean", "Dirty"],
    [2, "Buff", "Weak"],
    [3, "Tall", "Short"],
    [4, "Funny", "Serious"],
    [5, "Country", "Rock n Roll"],
    [6, "Convertible", "SUV"],
    [7, "Star Wars", "Star Trek"],
    [8, "Introvert", "Extrovert"],
    [9, "Optimistic", "Pessimistic"],
    [10, "Modern", "Classic"],
    [11, "Urban", "Rural"],
    [12, "Hot", "Cold"],
    [13, "Organized", "Messy"],
    [14, "Early Bird", "Night Owl"],
    [15, "Spicy", "Mild"],
    [16, "Ocean", "Mountains"],
    [17, "Tech-savvy", "Technophobe"],
    [18, "Adventurous", "Cautious"],
    [19, "Leader", "Follower"],
    [20, "Logical", "Emotional"]
];

const db = admin.database();
const rankingsRef = db.ref('rankings');

rankingsRef.set(rankings)
    .then(() => {
        console.log('Rankings successfully added to Firebase');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Error adding rankings to Firebase:', error);
        process.exit(1);
    });
