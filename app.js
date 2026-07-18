import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from "@stellar/stellar-sdk";

// ==========================
// Buttons
// ==========================

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const balanceBtn = document.getElementById("balanceBtn");
const sendBtn = document.getElementById("sendBtn");

// ==========================
// UI Elements
// ==========================

const walletStatus = document.getElementById("walletStatus");
const walletAddress = document.getElementById("walletAddress");
const balanceText = document.getElementById("balance");

const destinationInput = document.getElementById("destination");
const amountInput = document.getElementById("amount");
const transactionStatus = document.getElementById("transactionStatus");
const transactionHash = document.getElementById("transactionHash");
const transactionHistory = document.getElementById("transactionHistory");

// ==========================
// Horizon Testnet
// ==========================

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

let publicKey = "";

// ==========================
// Connect Wallet
// ==========================

connectBtn.addEventListener("click", connectWallet);

async function connectWallet() {
  try {
    const result = await requestAccess();

    console.log(result);

    if (result.error) {
      walletStatus.innerHTML = "❌ Wallet connection failed";
      return;
    }

    publicKey = result.address;

    walletStatus.innerHTML = "✅ Wallet Connected";
    walletAddress.innerHTML = publicKey;

  } catch (err) {
    console.error(err);
    walletStatus.innerHTML = "❌ Connection Failed";
  }
}

// ==========================
// Disconnect Wallet
// ==========================

disconnectBtn.addEventListener("click", () => {

  publicKey = "";

  walletStatus.innerHTML = "Wallet Not Connected";
  walletAddress.innerHTML = "";
  balanceText.innerHTML = "Balance : --";

  destinationInput.value = "";
  amountInput.value = "";

  transactionStatus.innerHTML = "";
  transactionHash.innerHTML = "";
  transactionHistory.innerHTML = "";

});

// ==========================
// Refresh Balance
// ==========================

balanceBtn.addEventListener("click", refreshBalance);

async function refreshBalance() {

  try {

    if (!publicKey) {
      alert("Please connect wallet first.");
      return;
    }

    console.log("Loading account...");

    const account = await server.loadAccount(publicKey);

    console.log(account);

    const nativeBalance = account.balances.find(
      (asset) => asset.asset_type === "native"
    );

    if (nativeBalance) {
      balanceText.innerHTML = `Balance : ${nativeBalance.balance} XLM`;
    } else {
      balanceText.innerHTML = "Balance : 0 XLM";
    }

  } catch (err) {

    console.error(err);

    balanceText.innerHTML = "Balance : Error loading balance";

  }

}

// ==========================
// Send XLM
// ==========================

sendBtn.addEventListener("click", sendXLM);

async function sendXLM() {

  try {

    if (!publicKey) {
      alert("Please connect wallet first.");
      return;
    }

    const destination = destinationInput.value.trim();
    const amount = amountInput.value.trim();

    if (!destination || !amount) {
      transactionStatus.innerHTML = "❌ Please enter destination and amount.";
      return;
    }

    transactionStatus.innerHTML = "Waiting for wallet approval...";
    transactionHash.innerHTML = "";

    const sourceAccount = await server.loadAccount(publicKey);

    const fee = await server.fetchBaseFee();

    const transaction = new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount,
        })
      )
      .setTimeout(30)
      .build();

    const signed = await signTransaction(
      transaction.toXDR(),
      {
        networkPassphrase: Networks.TESTNET,
      }
    );

    const signedTransaction = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      Networks.TESTNET
    );

    const result = await server.submitTransaction(signedTransaction);

    console.log(result);

    transactionStatus.innerHTML = "✅ Transaction Successful";

    // ==========================
    // Transaction Hash
    // ==========================

    transactionHash.innerHTML = `
      <h4>Transaction Hash</h4>

      <a href="https://stellar.expert/explorer/testnet/tx/${result.hash}"
         target="_blank"
         rel="noopener noreferrer">
         ${result.hash}
      </a>
    `;

    // ==========================
    // Transaction History
    // ==========================

    const item = document.createElement("li");

    item.innerHTML = `
      <strong>Sent:</strong> ${amount} XLM<br>
      <strong>To:</strong> ${destination}<br>
      <strong>Hash:</strong>
      <a href="https://stellar.expert/explorer/testnet/tx/${result.hash}"
         target="_blank"
         rel="noopener noreferrer">
         ${result.hash.substring(0,20)}...
      </a>
    `;

    transactionHistory.prepend(item);

    destinationInput.value = "";
    amountInput.value = "";

    await refreshBalance();

  } catch (err) {

    console.error(err);

    transactionStatus.innerHTML = "❌ Transaction Failed";
    transactionHash.innerHTML = "";

  }

}
