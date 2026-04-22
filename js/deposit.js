import { auth, db, storage } from "./firebase-config.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.submitDeposit = async function () {
const file = proof.files[0];

const storageRef = ref(storage, "proofs/" + file.name);
await uploadBytes(storageRef, file);

const url = await getDownloadURL(storageRef);

await addDoc(collection(db, "deposits"), {
userId: auth.currentUser.uid,
amount: Number(amount.value),
proofUrl: url,
status: "pending"
});

alert("Submitted");
};
