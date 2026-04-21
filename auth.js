import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const type = document.getElementById("accountType").value;

  const balance = type === "demo" ? 10000 : 0;

  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", userCred.user.uid), {
    email,
    accountType: type,
    balance
  });

  alert("Account created!");
  window.location.href = "dashboard.html";
};
