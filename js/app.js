import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
if (!user) location.href = "login.html";

const ref = doc(db, "users", user.uid);
const snap = await getDoc(ref);
const data = snap.data();

if (email) email.innerText = data.email;
if (type) type.innerText = data.accountType;
if (balance) balance.innerText = data.balance;
});

window.trade = async function () {
const user = auth.currentUser;
const ref = doc(db, "users", user.uid);
const snap = await getDoc(ref);

let bal = snap.data().balance;

if (bal < 100) return alert("Low balance");

let result = Math.random() > 0.5 ? 50 : -50;

await updateDoc(ref, { balance: bal + result });

alert("Result: " + result);
location.reload();
};

window.logout = function () {
signOut(auth);
location.href = "login.html";
};
