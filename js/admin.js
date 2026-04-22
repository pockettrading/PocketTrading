import { db } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function load() {

const usersSnap = await getDocs(collection(db, "users"));
usersSnap.forEach(d => {
users.innerHTML += `<p>${d.data().email} - $${d.data().balance}</p>`;
});

const depSnap = await getDocs(collection(db, "deposits"));
depSnap.forEach(d => {
if(d.data().status==="pending"){
deposits.innerHTML += `<button onclick="approveDeposit('${d.id}','${d.data().userId}',${d.data().amount})">Approve Deposit</button>`;
}
});

const wSnap = await getDocs(collection(db, "withdrawals"));
wSnap.forEach(d => {
if(d.data().status==="pending"){
withdrawals.innerHTML += `<button onclick="approveWithdraw('${d.id}','${d.data().userId}',${d.data().amount})">Approve Withdraw</button>`;
}
});

}

window.approveDeposit = async (id, uid, amt)=>{
await updateDoc(doc(db,"deposits",id),{status:"approved"});
};

window.approveWithdraw = async (id, uid, amt)=>{
await updateDoc(doc(db,"withdrawals",id),{status:"approved"});
};

load();
