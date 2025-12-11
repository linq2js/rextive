/**
 * Sync Logic - P2P data synchronization using WebRTC (PeerJS)
 * 
 * Uses 6-digit codes for easy device pairing:
 * 1. Host device generates a 6-digit code
 * 2. Guest device enters the code to connect
 * 3. Both devices exchange data via WebRTC data channel
 * 4. Data is merged based on user preference (replace or merge)
 */

import Peer, { type DataConnection } from "peerjs";
import { signal } from "rextive";
import { dataExportRepository, type ExportData } from "@/infrastructure/repositories/dataExportRepository";

// Connection states
export type SyncState = 
  | "idle"           // Initial state
  | "hosting"        // Waiting for guest to connect
  | "joining"        // Connecting to host
  | "connected"      // P2P connection established
  | "syncing"        // Data transfer in progress
  | "success"        // Sync completed successfully
  | "error";         // Error occurred

// Sync mode
export type SyncMode = "host" | "guest" | null;

// Data summary for preview
export interface DataSummary {
  profileCount: number;
  gameSessionCount: number;
  exportedAt: string;
}

// Sync message types
interface SyncMessage {
  type: "data" | "request" | "ack" | "error";
  payload?: string; // JSON stringified ExportData
  summary?: DataSummary;
  error?: string;
}

// Generate a random 6-digit code
function generateSyncCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a unique peer ID from the code
function codeToPeerId(code: string): string {
  return `rxblox-sync-${code}`;
}

/**
 * Sync logic factory - creates a scoped sync instance
 * 
 * Usage:
 * ```tsx
 * const $sync = useScope(syncLogic);
 * 
 * // Host mode
 * await $sync.startHosting();
 * // Display $sync.syncCode() to user
 * 
 * // Guest mode
 * await $sync.joinHost("123456");
 * ```
 */
export function syncLogic() {
  // State signals
  const state = signal<SyncState>("idle", { name: "sync.state" });
  const mode = signal<SyncMode>(null, { name: "sync.mode" });
  const syncCode = signal<string>("", { name: "sync.code" });
  const errorMessage = signal<string>("", { name: "sync.error" });
  const progress = signal<string>("", { name: "sync.progress" });
  
  // Remote data summary (from connected peer)
  const remoteSummary = signal<DataSummary | null>(null, { name: "sync.remoteSummary" });
  const localSummary = signal<DataSummary | null>(null, { name: "sync.localSummary" });
  
  // Internal refs
  let peer: Peer | null = null;
  let connection: DataConnection | null = null;
  let remoteData: string | null = null;

  /**
   * Get summary of local data
   */
  async function getLocalSummary(): Promise<DataSummary> {
    const exportJson = await dataExportRepository.exportAll();
    const data = JSON.parse(exportJson) as ExportData;
    return {
      profileCount: data.data.kidProfiles.length,
      gameSessionCount: data.data.gameProgress.length,
      exportedAt: data.exportedAt,
    };
  }

  /**
   * Clean up peer connection
   */
  function cleanup() {
    if (connection) {
      connection.close();
      connection = null;
    }
    if (peer) {
      peer.destroy();
      peer = null;
    }
    remoteData = null;
  }

  /**
   * Reset to initial state
   */
  function reset() {
    cleanup();
    state.set("idle");
    mode.set(null);
    syncCode.set("");
    errorMessage.set("");
    progress.set("");
    remoteSummary.set(null);
    localSummary.set(null);
  }

  /**
   * Handle incoming data connection
   */
  function setupConnection(conn: DataConnection) {
    connection = conn;
    
    conn.on("open", async () => {
      state.set("connected");
      progress.set("Connected! Exchanging data info...");
      
      // Send our data summary
      const summary = await getLocalSummary();
      localSummary.set(summary);
      
      const message: SyncMessage = {
        type: "request",
        summary,
      };
      conn.send(message);
    });
    
    conn.on("data", async (rawData) => {
      const msg = rawData as SyncMessage;
      
      switch (msg.type) {
        case "request":
          // Received request with their summary
          if (msg.summary) {
            remoteSummary.set(msg.summary);
          }
          // Send our summary if we haven't yet
          if (!localSummary()) {
            const summary = await getLocalSummary();
            localSummary.set(summary);
            const response: SyncMessage = { type: "request", summary };
            conn.send(response);
          }
          break;
          
        case "data":
          // Received actual data
          if (msg.payload) {
            remoteData = msg.payload;
            progress.set("Data received! Ready to import.");
          }
          // Send acknowledgment
          conn.send({ type: "ack" } as SyncMessage);
          break;
          
        case "ack":
          // Data was received by peer
          progress.set("Data sent successfully!");
          state.set("success");
          break;
          
        case "error":
          errorMessage.set(msg.error || "Unknown error from peer");
          state.set("error");
          break;
      }
    });
    
    conn.on("close", () => {
      if (state() !== "success" && state() !== "error") {
        errorMessage.set("Connection closed unexpectedly");
        state.set("error");
      }
    });
    
    conn.on("error", (err) => {
      errorMessage.set(`Connection error: ${err.message}`);
      state.set("error");
    });
  }

  /**
   * Start hosting - generate code and wait for guest
   */
  async function startHosting(): Promise<void> {
    reset();
    mode.set("host");
    state.set("hosting");
    
    const code = generateSyncCode();
    syncCode.set(code);
    progress.set("Initializing...");
    
    // Get local summary
    const summary = await getLocalSummary();
    localSummary.set(summary);
    
    return new Promise((resolve, reject) => {
      const peerId = codeToPeerId(code);
      
      peer = new Peer(peerId, {
        debug: 0, // Suppress logs in production
      });
      
      peer.on("open", () => {
        progress.set(`Code ready: ${code}`);
        resolve();
      });
      
      peer.on("connection", (conn) => {
        progress.set("Guest connected!");
        setupConnection(conn);
      });
      
      peer.on("error", (err) => {
        // Handle "ID taken" error - code already in use
        if (err.type === "unavailable-id") {
          errorMessage.set("Code already in use. Please try again.");
          state.set("error");
          reject(new Error("Code already in use"));
          return;
        }
        
        errorMessage.set(`Failed to start: ${err.message}`);
        state.set("error");
        reject(err);
      });
      
      // Timeout after 5 minutes
      setTimeout(() => {
        if (state() === "hosting") {
          errorMessage.set("Hosting timed out. No one connected.");
          state.set("error");
          cleanup();
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Join a host using their 6-digit code
   */
  async function joinHost(code: string): Promise<void> {
    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      errorMessage.set("Please enter a valid 6-digit code");
      state.set("error");
      return;
    }
    
    reset();
    mode.set("guest");
    state.set("joining");
    syncCode.set(code);
    progress.set("Connecting...");
    
    // Get local summary
    const summary = await getLocalSummary();
    localSummary.set(summary);
    
    return new Promise((resolve, reject) => {
      peer = new Peer({
        debug: 0,
      });
      
      peer.on("open", () => {
        progress.set("Connecting to host...");
        
        const hostPeerId = codeToPeerId(code);
        const conn = peer!.connect(hostPeerId, {
          reliable: true,
        });
        
        setupConnection(conn);
        
        conn.on("open", () => {
          resolve();
        });
        
        // Connection timeout
        setTimeout(() => {
          if (state() === "joining") {
            errorMessage.set("Connection timed out. Check the code and try again.");
            state.set("error");
            cleanup();
            reject(new Error("Connection timeout"));
          }
        }, 30000);
      });
      
      peer.on("error", (err) => {
        // Handle "peer not found" error
        if (err.type === "peer-unavailable") {
          errorMessage.set("Invalid code or host not available. Please check and try again.");
          state.set("error");
          reject(new Error("Host not found"));
          return;
        }
        
        errorMessage.set(`Connection failed: ${err.message}`);
        state.set("error");
        reject(err);
      });
    });
  }

  /**
   * Send our data to the connected peer
   */
  async function sendData(): Promise<void> {
    if (!connection || state() !== "connected") {
      errorMessage.set("Not connected");
      state.set("error");
      return;
    }
    
    state.set("syncing");
    progress.set("Sending data...");
    
    try {
      const exportJson = await dataExportRepository.exportAll();
      const message: SyncMessage = {
        type: "data",
        payload: exportJson,
      };
      connection.send(message);
    } catch (err) {
      errorMessage.set(`Failed to send data: ${err}`);
      state.set("error");
    }
  }

  /**
   * Import the received data from peer
   * @param mergeMode - "replace" clears existing data, "merge" keeps both
   */
  async function importReceivedData(mergeMode: "replace" | "merge" = "replace"): Promise<void> {
    if (!remoteData) {
      errorMessage.set("No data received yet");
      state.set("error");
      return;
    }
    
    state.set("syncing");
    progress.set("Importing data...");
    
    try {
      if (mergeMode === "replace") {
        // Simple replace - use existing import function
        const result = await dataExportRepository.importAll(remoteData);
        if (result.success) {
          progress.set(result.message);
          state.set("success");
        } else {
          errorMessage.set(result.message);
          state.set("error");
        }
      } else {
        // Merge mode - combine profiles from both devices
        // For now, just replace. Merge logic can be added later.
        const result = await dataExportRepository.importAll(remoteData);
        if (result.success) {
          progress.set(result.message);
          state.set("success");
        } else {
          errorMessage.set(result.message);
          state.set("error");
        }
      }
    } catch (err) {
      errorMessage.set(`Import failed: ${err}`);
      state.set("error");
    }
  }

  /**
   * Check if we have received data from peer
   */
  function hasReceivedData(): boolean {
    return remoteData !== null;
  }

  return {
    // State
    state,
    mode,
    syncCode,
    errorMessage,
    progress,
    remoteSummary,
    localSummary,
    
    // Actions
    startHosting,
    joinHost,
    sendData,
    importReceivedData,
    hasReceivedData,
    reset,
  };
}

