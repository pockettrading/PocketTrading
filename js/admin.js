async function loadWithdrawals() {
  const snapshot = await getDocs(collection(db, "withdrawals"));
  let html = "";

  snapshot.forEach(docSnap => {
    const w = docSnap.data();

    if (w.status === "pending") {
      html += `
        <div>
          <p>$${w.amount} → ${w.wallet}</p>
          <button onclick="approveWithdraw('${docSnap.id}', '${w.userId}', ${w.amount})">Approve</button>
        </div>
      `;
    }
  });

  document.getElementById("withdrawals").innerHTML = html;
}
window.approveWithdraw = async function(id, userId, amount) {

  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);

  const newBalance = snap.data().balance - amount;

  await updateDoc(userRef, {
    balance: newBalance
  });

  await updateDoc(doc(db, "withdrawals", id), {
    status: "approved"
  });

  alert("Withdrawal approved");
  location.reload();
};
