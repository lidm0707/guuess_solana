import { StrictMode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import the necessary wallets
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";




import GAME from "./Game";
import { createRoot } from "react-dom/client";

function App() {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
  ], []);

  return (
    <StrictMode>

      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <GAME />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </StrictMode>

  );
}

createRoot(document.getElementById('root')!).render(<App />)