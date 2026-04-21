import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Load user data
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const data = snap.data();

  if (document.getElementById("email"))
    document.getElementById("email").innerText = data.email;

  if (document.getElementById("type"))
    document.getElementById("type").innerText = data.accountType;

  if (document.getElementById("balance"))
    document.getElementById("balance").innerText = data.balance;
});

// Trade simulation
window.trade = async function () {
  const user = auth.currentUser;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  let balance = snap.data().balance;

  if (balance < 100) {
    alert("Not enough balance");
    return;
  }

  let profit = Math.random() > 0.5 ? 50 : -50;

  await updateDoc(ref, {
    balance: balance + profit
  });

  alert("Trade result: " + profit);
  location.reload();
};

// Logout
window.logout = function () {
  signOut(auth);
  window.location.href = "login.html";
};
