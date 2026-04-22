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
