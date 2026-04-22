import { auth, db } from "./firebase-config.js";
import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.register = async function () {
const email = email.value;
const password = password.value;
const type = accountType.value;

const balance = type === "demo" ? 10000 : 0;

const user = await createUserWithEmailAndPassword(auth, email, password);

await setDoc(doc(db, "users", user.user.uid), {
email,
accountType: type,
balance
});

location.href = "dashboard.html";
};

window.login = async function () {
await signInWithEmailAndPassword(auth, email.value, password.value);
location.href = "dashboard.html";
};
