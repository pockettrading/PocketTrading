import { auth, db } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.requestWithdraw = async function () {
await addDoc(collection(db, "withdrawals"), {
userId: auth.currentUser.uid,
amount: Number(amount.value),
wallet: wallet.value,
status: "pending"
});

alert("Requested");
};
