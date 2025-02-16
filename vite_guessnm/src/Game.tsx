import React, { useEffect, useMemo, useState } from "react";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, web3, ProgramAccount } from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import idl from "./idl/number_guessing_game.json";
import { NumberGuessingGame } from "./types/number_guessing_game";

const GAME = () => {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const [targetNumber, setTargetNumber] = useState("");
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("");
  const [gamePublicKey, setGamePublicKey] = useState<web3.PublicKey | null>(null);
  const [openGames, setOpenGames] = useState([] as ProgramAccount<{
    owner: web3.PublicKey;
    targetNumber: number;
    isActive: boolean;
  }>[]);

  const [isCreatePopupOpen, setIsCreatePopupOpen] = useState(false);
  const [isGuessPopupOpen, setIsGuessPopupOpen] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [isLose, setIsLose] = useState(false);

  const program = useMemo(() => {
    if (!publicKey || !connected || !wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {});
    return new Program<NumberGuessingGame>(idl as NumberGuessingGame, provider);
  }, [connection, publicKey]);

  const fetchOpenGames = async () => {
    if (!program) return;

    try {
      const games = await program.account.game.all();
      const openGames = games.filter((game) => game.account.isActive === true);
      return openGames;
    } catch (err) {
      console.error("Error fetching games:", err);
      return [];
    }
  };

  useEffect(() => {
    const fetchGames = async () => {
      const games = await fetchOpenGames();
      setOpenGames(games as any);
    };

    fetchGames();
  }, [program, wallet, connection]);

  const initializeGame = async () => {
    if (!program || !wallet) return;

    try {
      const gameKeypair = web3.Keypair.generate();

      await program.methods
        .initializeGame(Number(targetNumber))
        .accounts({
          game: gameKeypair.publicKey,
          creator: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .signers([gameKeypair])
        .rpc();

      setMessage("Game initialized successfully!");
      setGamePublicKey(gameKeypair.publicKey);

      // Refresh open games after creating the game
      const games = await fetchOpenGames();
      setOpenGames(games as any);
      setIsCreatePopupOpen(false);
    } catch (err) {
      console.error("Error initializing game:", err);
      setMessage("Failed to initialize game.");
    }
  };

  const guessNumber = async () => {
    if (!program || !wallet || !gamePublicKey) {
      console.error("Missing program, wallet, or game public key.");
      return;
    }

    try {
      const playerKeypair = web3.Keypair.generate();

      await program.methods
        .guessNumber(Number(guess))
        .accounts({
          game: gamePublicKey,
          player: playerKeypair.publicKey,
          guesser: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .signers([playerKeypair])
        .rpc();

      if (Number(guess) === Number(targetNumber)) {
        setIsWin(true);
        setMessage("You win!");
        endGame(); // End the game if guessed correctly
      } else {
        setIsLose(true);
        setMessage("You lose! Incorrect guess.");
        endGame(); // End the game if guessed incorrectly
      }
    } catch (err) {
      console.error("Error during guess:", err);
      setMessage("Error during guess.");
    }
  };

  const endGame = async () => {
    if (!program || !wallet || !gamePublicKey) return;

    try {
      await program.methods
        .endGame()
        .accounts({
          game: gamePublicKey,
          creator: wallet.publicKey,
        } as any)
        .rpc();

      setMessage("Game ended successfully!");
      setGamePublicKey(null);
      setIsGuessPopupOpen(false);

      // Reset the state after the game ends
      setIsWin(false);
      setIsLose(false);
      setTargetNumber("");
      setGuess("");

      // Refresh open games after the game ends
      const games = await fetchOpenGames();
      setOpenGames(games as any);
    } catch (err) {
      console.error("Error ending game:", err);
      setMessage("Failed to end game.");
    }
  };

  return (
    <div>
      <WalletMultiButton />

      <button
        onClick={() => setIsCreatePopupOpen(true)}
        className="bg-green-500 text-white px-4 py-2 rounded mt-4"
      >
        Create Room
      </button>

      {/* Popup สำหรับสร้างห้อง */}
      {isCreatePopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold mb-4">Create Room</h3>
            <input
              type="number"
              placeholder="Target Number"
              value={targetNumber}
              onChange={(e) => setTargetNumber(e.target.value)}
              className="border p-2 rounded w-full mb-4"
            />
            <button
              onClick={initializeGame}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreatePopupOpen(false)}
              className="bg-gray-300 text-black px-4 py-2 rounded ml-2"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div>
        <h3>Select Open Game</h3>
        <div className="flex flex-col space-y-4">
          {openGames?.map((game, index) => (
            <div
              key={game.publicKey.toString()}
              className="border rounded-lg p-4 shadow-md bg-white hover:bg-gray-100 transition cursor-pointer"
              onClick={() => {
                setGamePublicKey(game.publicKey);
                setIsGuessPopupOpen(true); // เปิด Popup เดาเลข
              }}
            >
              <p>
                <strong>ROOM:</strong> {index + 1}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Popup สำหรับเดาเลข */}
      {isGuessPopupOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            {isWin ? (
              <>
                <h3 className="text-lg font-bold mb-4 text-green-500">You Win!</h3>
                <button
                  onClick={() => {
                    endGame();
                    setIsGuessPopupOpen(false);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </>
            ) : isLose ? (
              <>
                <h3 className="text-lg font-bold mb-4 text-red-500">You Lose!</h3>
                <button
                  onClick={() => {
                    endGame();
                    setIsGuessPopupOpen(false);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-4">Guess the Number</h3>
                <input
                  type="number"
                  placeholder="Your Guess"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="border p-2 rounded w-full mb-4"
                />
                <button
                  onClick={guessNumber}
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Submit Guess
                </button>
                <button
                  onClick={() => setIsGuessPopupOpen(false)}
                  className="bg-gray-300 text-black px-4 py-2 rounded ml-2"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {message && <p className="mt-4 text-lg font-semibold">{message}</p>}
    </div>
  );
};

export default GAME;
